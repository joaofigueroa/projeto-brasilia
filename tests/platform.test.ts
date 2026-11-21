import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicUser } from "@/types/domain";

const session = vi.hoisted(() => ({ viewer: null as PublicUser | null, cookie: "" }));
vi.mock("@/server/security/session", () => ({
  requireViewer: async () => {
    if (!session.viewer) throw new Error("Authentication required");
    return session.viewer;
  },
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ cookie: session.cookie }) }));
vi.mock("better-auth/next-js", () => ({ nextCookies: () => ({ id: "test-cookies" }) }));

process.env.BRASILIA_LOCAL_DATABASE = "memory://";
process.env.BETTER_AUTH_SECRET = "test-only-secret-for-isolated-postgres-database-12345678";
process.env.BETTER_AUTH_URL = "http://localhost:3000";

const { migrateDatabase } = await import("../scripts/migrate");
const { query, closeDatabase } = await import("@/server/db/client");
const { createTask, updateTask, moveTask, getBoard } = await import("@/server/services/tasks");
const { createUser, configureUser, updateProfile, changePassword } = await import(
  "@/server/services/users"
);
const { findTask, listTaskHistory, insertTask } = await import("@/server/repositories/tasks");
const { findUserById } = await import("@/server/repositories/users");
const { listProjects } = await import("@/server/repositories/projects");
const { getAuth } = await import("@/server/security/auth");
const { profileSchema, boardFiltersSchema } = await import("@/validators");

const admin: PublicUser = {
  id: v7(),
  name: "Admin Test",
  email: "admin@test.local",
  role: "admin",
  jobTitle: "Owner",
  image: null,
};
let collaborator: PublicUser;
let stranger: PublicUser;
let projects: Awaited<ReturnType<typeof listProjects>>;
const password = "Isolated-password-2026!";

async function signIn(email: string, currentPassword = password) {
  const response = await (await getAuth()).handler(
    new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ email, password: currentPassword }),
    }),
  );
  const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? "";
  return { response, cookie };
}

function input(overrides = {}) {
  return {
    title: "Integration task",
    description: "A real PostgreSQL task",
    projectId: projects[0].id,
    administratorId: admin.id,
    assigneeIds: [collaborator.id],
    weekStart: "2026-11-16",
    dueDate: "2026-11-20",
    priority: "medium" as const,
    status: "open" as const,
    ...overrides,
  };
}

beforeAll(async () => {
  await migrateDatabase();
  projects = await listProjects();
  const { insertUser } = await import("@/server/repositories/users");
  const { hashPassword } = await import("better-auth/crypto");
  await insertUser({ ...admin, passwordHash: await hashPassword(password) });
  session.viewer = admin;
  collaborator = await createUser({
    name: "Collaborator Test",
    email: "collaborator@test.local",
    jobTitle: "Designer",
    role: "collaborator",
    password,
  });
  stranger = await createUser({
    name: "Other Person",
    email: "other@test.local",
    jobTitle: "Operations",
    role: "collaborator",
    password,
  });
});
beforeEach(() => {
  session.viewer = admin;
  session.cookie = "";
});
afterAll(async () => {
  await closeDatabase();
});

describe("weekly task management", () => {
  it("seeds all three required projects without demo users", async () => {
    expect(projects.map((project) => project.name)).toEqual([
      "Clínica estética",
      "Vinhos",
      "Peças automotivas",
    ]);
  });
  it("creates a task and its initial history atomically", async () => {
    const id = await createTask(input());
    const task = await findTask(id);
    expect(task).toMatchObject({
      projectId: projects[0].id,
      assigneeIds: [collaborator.id],
      version: 1,
    });
    expect(await listTaskHistory(id)).toMatchObject([
      { kind: "created", actor: { id: admin.id }, changes: [] },
    ]);
  });
  it("rejects tasks without a project, a responsible person, or a Monday", async () => {
    await expect(createTask(input({ projectId: "" }))).rejects.toThrow();
    await expect(createTask(input({ assigneeIds: [] }))).rejects.toThrow();
    await expect(createTask(input({ weekStart: "2026-11-17" }))).rejects.toThrow();
  });
  it("rejects nonexistent and invalid calendar dates", () => {
    expect(boardFiltersSchema.safeParse({ week: "2026-02-30" }).success).toBe(false);
    expect(boardFiltersSchema.safeParse({ week: "not-a-date" }).success).toBe(false);
  });
  it("shows a transverse board and filters by week, project and assignee", async () => {
    const id = await createTask(input({ title: "Transverse selection A" }));
    await createTask(
      input({
        title: "Transverse selection B",
        projectId: projects[1].id,
        assigneeIds: [stranger.id],
      }),
    );
    await createTask(input({ title: "Transverse selection C", weekStart: "2026-11-23" }));
    const all = await getBoard({ week: "2026-11-16", q: "Transverse selection" });
    expect(all.tasks).toHaveLength(2);
    const filtered = await getBoard({
      week: "2026-11-16",
      project: projects[0].id,
      assignee: collaborator.id,
      q: "Transverse selection",
    });
    expect(filtered.tasks.map((task) => task.id)).toEqual([id]);
  });
  it("allows a responsible collaborator to move but not edit the card", async () => {
    const id = await createTask(input());
    session.viewer = collaborator;
    await moveTask({ id, version: 1, status: "in_progress" });
    expect((await findTask(id))?.status).toBe("in_progress");
    await expect(updateTask({ ...input(), id, version: 2, title: "Unauthorized" })).rejects.toThrow(
      /administrador/,
    );
    expect((await listTaskHistory(id))[0]).toMatchObject({
      kind: "moved",
      actor: { id: collaborator.id },
      changes: [{ field: "status", before: "Em aberto", after: "Em andamento" }],
    });
  });
  it("blocks movements by people unrelated to the card", async () => {
    const id = await createTask(input());
    session.viewer = stranger;
    await expect(moveTask({ id, version: 1, status: "done" })).rejects.toThrow(/responsáveis/);
    expect((await findTask(id))?.version).toBe(1);
    expect(await listTaskHistory(id)).toHaveLength(1);
  });
  it("allows the designated card administrator to edit without a global admin role", async () => {
    const id = await createTask(input({ administratorId: collaborator.id }));
    session.viewer = collaborator;
    await updateTask({
      ...input({ administratorId: collaborator.id }),
      id,
      version: 1,
      title: "Owned card update",
    });
    expect((await findTask(id))?.title).toBe("Owned card update");
  });
  it("assigns collaborators as administrators of their own new cards", async () => {
    session.viewer = collaborator;
    await expect(createTask(input())).rejects.toThrow(/administrar/);
    const id = await createTask(input({ administratorId: collaborator.id }));
    expect((await findTask(id))?.administratorId).toBe(collaborator.id);
  });
  it("updates assignments without duplicates and records a before/after history", async () => {
    const id = await createTask(input());
    await updateTask({
      ...input(),
      id,
      version: 1,
      assigneeIds: [collaborator.id, stranger.id, stranger.id],
      projectId: projects[1].id,
      title: "Updated task",
    });
    const task = await findTask(id);
    expect(task?.assigneeIds).toHaveLength(2);
    const history = await listTaskHistory(id);
    expect(history).toHaveLength(2);
    expect(history[0].changes).toEqual(
      expect.arrayContaining([{ field: "projectId", before: "Clínica estética", after: "Vinhos" }]),
    );
    await updateTask({ ...input({ assigneeIds: [stranger.id] }), id, version: 2 });
    expect((await findTask(id))?.assigneeIds).toEqual([stranger.id]);
  });
  it("rejects stale versions without writing additional history", async () => {
    const id = await createTask(input());
    await moveTask({ id, version: 1, status: "done" });
    await expect(updateTask({ ...input(), id, version: 1 })).rejects.toThrow(/alterada/);
    expect((await findTask(id))?.status).toBe("done");
    expect(await listTaskHistory(id)).toHaveLength(2);
  });
  it("keeps one winner when concurrent updates target the same version", async () => {
    const id = await createTask(input());
    const results = await Promise.allSettled([
      updateTask({ ...input(), id, version: 1, title: "Concurrent A" }),
      updateTask({ ...input(), id, version: 1, title: "Concurrent B" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect((await findTask(id))?.version).toBe(2);
    expect(await listTaskHistory(id)).toHaveLength(2);
  });
  it("rolls back the task and history when an assignment fails", async () => {
    const id = v7();
    await expect(
      insertTask({ ...input(), id, assigneeIds: [v7()], actorId: admin.id, changes: [] }),
    ).rejects.toThrow();
    expect(await findTask(id)).toBeNull();
    expect(await listTaskHistory(id)).toHaveLength(0);
  });
  it("protects audit entries from update and deletion at database level", async () => {
    const id = await createTask(input());
    await expect(
      query(sql`UPDATE task_events SET kind = 'updated' WHERE task_id = ${id}::uuid`),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining("append-only") } });
    await expect(
      query(sql`DELETE FROM task_events WHERE task_id = ${id}::uuid`),
    ).rejects.toMatchObject({ cause: { message: expect.stringContaining("append-only") } });
    expect(await listTaskHistory(id)).toHaveLength(1);
  });
  it("requires an authenticated user to read and mutate tasks", async () => {
    session.viewer = null;
    await expect(getBoard({ week: "2026-11-16" })).rejects.toThrow(/Authentication/);
    await expect(createTask(input())).rejects.toThrow(/Authentication/);
  });
});

describe("authentication, roles and profiles", () => {
  it("authenticates against a hashed credential and returns an HTTP-only session", async () => {
    const { response, cookie } = await signIn(admin.email);
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(cookie).toContain("session_token");
    const stored = await query<{ password: string }>(
      sql`SELECT password FROM accounts WHERE user_id = ${admin.id}::uuid`,
    );
    expect(stored[0].password).not.toBe(password);
  });
  it("rejects incorrect credentials and blocks public signup and role changes", async () => {
    const bad = await signIn(admin.email, "Incorrect-password-2026");
    expect(bad.response.status).toBe(401);
    for (const path of ["sign-up/email", "update-user"]) {
      const response = await (await getAuth()).handler(
        new Request(`http://localhost:3000/api/auth/${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", origin: "http://localhost:3000" },
          body: JSON.stringify({
            email: "intruder@test.local",
            password,
            role: "admin",
            name: "Intruder",
          }),
        }),
      );
      expect(response.status).toBe(404);
    }
  });
  it("prevents collaborators from configuring roles and creating users", async () => {
    session.viewer = collaborator;
    await expect(
      createUser({
        name: "Forbidden",
        email: "forbidden@test.local",
        jobTitle: "Test",
        role: "admin",
        password,
      }),
    ).rejects.toThrow(/administradores/);
    await expect(configureUser({ ...collaborator, role: "admin" })).rejects.toThrow(
      /administradores/,
    );
  });
  it("keeps access role separate from job title and prevents self-demotion", async () => {
    await expect(configureUser({ ...admin, role: "collaborator" })).rejects.toThrow(/próprio/);
    await configureUser({ ...stranger, jobTitle: "General manager", role: "collaborator" });
    expect(await findUserById(stranger.id)).toMatchObject({
      jobTitle: "General manager",
      role: "collaborator",
    });
  });
  it("updates personal information without allowing profile-based role escalation", async () => {
    session.viewer = collaborator;
    await updateProfile({
      ...collaborator,
      name: "Updated Name",
      jobTitle: "Creative director",
      role: "admin",
      image: "data:image/png;base64,AA==",
    });
    expect(await findUserById(collaborator.id)).toMatchObject({
      role: "collaborator",
      name: "Updated Name",
      jobTitle: "Creative director",
    });
  });
  it("rejects unsafe image formats and oversized uploads", () => {
    expect(
      profileSchema.safeParse({ ...collaborator, image: "data:image/svg+xml;base64,AAAA" }).success,
    ).toBe(false);
    expect(
      profileSchema.safeParse({
        ...collaborator,
        image: `data:image/png;base64,${"A".repeat(450001)}`,
      }).success,
    ).toBe(false);
  });
  it("requires the current password before an email change", async () => {
    session.viewer = collaborator;
    await expect(
      updateProfile({ ...collaborator, image: undefined, email: "new@test.local" }),
    ).rejects.toThrow(/senha atual/);
    expect((await findUserById(collaborator.id))?.email).toBe(collaborator.email);
  });
  it("changes a password, rejects the old one and revokes other sessions", async () => {
    const first = await signIn(admin.email);
    const second = await signIn(admin.email);
    session.cookie = first.cookie;
    await changePassword({ currentPassword: password, newPassword: "New-isolated-password-2026!" });
    expect((await signIn(admin.email, password)).response.status).toBe(401);
    expect((await signIn(admin.email, "New-isolated-password-2026!")).response.status).toBe(200);
    const oldSession = await (await getAuth()).handler(
      new Request("http://localhost:3000/api/auth/get-session", {
        headers: { cookie: second.cookie },
      }),
    );
    expect(await oldSession.json()).toBeNull();
  });
  it("verifies the current password and revokes all sessions when changing email", async () => {
    const { cookie } = await signIn(admin.email, "New-isolated-password-2026!");
    session.cookie = cookie;
    await expect(
      updateProfile({
        ...admin,
        image: undefined,
        email: "new-admin@test.local",
        currentPassword: "Wrong-password-2026",
      }),
    ).rejects.toThrow(/incorreta/);
    expect((await findUserById(admin.id))?.email).toBe(admin.email);
    const result = await updateProfile({
      ...admin,
      image: undefined,
      email: "new-admin@test.local",
      currentPassword: "New-isolated-password-2026!",
    });
    expect(result.requiresLogin).toBe(true);
    expect((await findUserById(admin.id))?.email).toBe("new-admin@test.local");
    const response = await (await getAuth()).handler(
      new Request("http://localhost:3000/api/auth/get-session", { headers: { cookie } }),
    );
    expect(await response.json()).toBeNull();
  });
});
