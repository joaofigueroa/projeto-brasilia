import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { PublicUser } from "@/types/domain";

const state = vi.hoisted(() => ({
  viewer: null as PublicUser | null,
  objects: new Map<
    string,
    { ContentLength: number; ContentType: string; ETag: string; Metadata: { attachmentid: string } }
  >(),
}));
vi.mock("@/server/security/session", () => ({
  requireViewer: async () => {
    if (!state.viewer) throw new Error("auth");
    return state.viewer;
  },
}));
vi.mock("@/server/integrations/neon-storage", () => ({
  neonStorageConfigured: () => true,
  neonStorage: () => ({ bucket: "private-test-bucket" }),
  neonUploadForm: vi.fn(async (path: string, type: string, size: number, id: string) => {
    state.objects.set(path, {
      ContentLength: size,
      ContentType: type,
      ETag: '"test-content-hash"',
      Metadata: { attachmentid: id },
    });
    return { url: "https://test.invalid/upload", fields: { key: path } };
  }),
  neonFileMetadata: async (_: string, path: string) => state.objects.get(path),
  neonCopyFile: vi.fn(async (_: string, from: string, to: string) =>
    state.objects.set(
      to,
      state.objects.get(from) as NonNullable<ReturnType<typeof state.objects.get>>,
    ),
  ),
  neonRemovePendingFile: async (_: string, path: string) => state.objects.delete(path),
  neonDownloadUrl: async (_: string, path: string) => `https://test.invalid/${path}`,
}));
process.env.BRASILIA_LOCAL_DATABASE = "memory://";
process.env.BETTER_AUTH_SECRET = "isolated-storage-test-secret-never-used-in-production";
const { migrateDatabase } = await import("../scripts/migrate");
const { query, closeDatabase } = await import("@/server/db/client");
const services = await import("@/server/services/prospect-crm");
const favorites = await import("@/server/services/prospect-page");
const research = await import("@/server/repositories/commercial-research");
const repository = await import("@/server/repositories/prospect-crm");
const workspace = await import("@/server/services/workspace-attachments");
const projects = await import("@/server/services/projects");
const tasks = await import("@/server/services/tasks");
const { listTaskHistory } = await import("@/server/repositories/tasks");
const projectId = "019ab04a-1000-7000-8000-000000000003";
const user: PublicUser = {
  id: v7(),
  name: "File test",
  email: "files@test.local",
  role: "collaborator",
  jobTitle: "",
  image: null,
};
let prospectId: string;
const scope = () => ({ projectId, prospectId });
beforeAll(async () => {
  await migrateDatabase();
  const { insertUser } = await import("@/server/repositories/users");
  await insertUser({ ...user, passwordHash: "not-used" });
  state.viewer = user;
  prospectId = (await research.findResearchProfiles(projectId, ["le-france"]))[0].databaseId ?? "";
  await favorites.favoriteProspect({ ...scope(), favorite: true });
});
afterAll(() => closeDatabase());
describe("attachment ownership and finalization", () => {
  it("keeps pending files out of the profile, verifies bytes, then commits a fresh private key and one history event", async () => {
    const form = await services.prepareProspectAttachment({
      ...scope(),
      name: "Proposta.pdf",
      contentType: "application/pdf",
      size: 100,
    });
    const input = { ...scope(), attachmentId: form.attachmentId };
    expect((await services.getProspectAttachments(scope())).total).toBe(0);
    const pending = await repository.findCrmAttachment(input);
    expect(pending?.status).toBe("pending");
    await services.finishProspectAttachment(input);
    const ready = await repository.findCrmAttachment(input);
    expect(ready?.status).toBe("ready");
    expect(ready?.storagePath).not.toBe(pending?.storagePath);
    expect(ready?.storagePath).toMatch(/^clients\//);
    expect(state.objects.has(pending?.storagePath ?? "")).toBe(false);
    await services.finishProspectAttachment(input);
    const [count] = await query<{ total: number }>(
      sql`SELECT count(*)::int AS total FROM prospect_followup_events WHERE prospect_id=${prospectId}::uuid AND kind='attachment_added'`,
    );
    expect(count.total).toBe(1);
  });
  it("rejects mismatched size and revoked editing access before publishing the reference", async () => {
    const form = await services.prepareProspectAttachment({
      ...scope(),
      name: "Dados.csv",
      contentType: "text/csv",
      size: 123,
    });
    const input = { ...scope(), attachmentId: form.attachmentId };
    const pending = await repository.findCrmAttachment(input);
    const object = state.objects.get(pending?.storagePath ?? "");
    if (!object) throw new Error("Missing test object");
    object.ContentLength = 124;
    await expect(services.finishProspectAttachment(input)).rejects.toThrow("não corresponde");
    expect((await repository.findCrmAttachment(input))?.status).toBe("pending");
    object.ContentLength = 123;
    await favorites.favoriteProspect({ ...scope(), favorite: false });
    await expect(services.finishProspectAttachment(input)).rejects.toThrow("Favorite");
    expect((await services.getProspectAttachments(scope())).total).toBe(1);
    await expect(
      services.finishProspectAttachment({
        ...input,
        projectId: "019ab04a-1000-7000-8000-000000000002",
      }),
    ).rejects.toThrow("neste projeto");
  });

  it("confirms several task files and lists them alongside direct files in the correct project", async () => {
    const taskId = await tasks.createTask({
      projectId,
      title: "Relatório da oficina",
      description: "",
      weekStart: "2026-11-23",
      dueDate: null,
      priority: "medium",
      status: "open",
      assigneeIds: [user.id],
      administratorId: user.id,
    });
    const taskScope = { kind: "task", id: taskId };
    const projectScope = { kind: "project", id: projectId };
    const first = await workspace.prepareWorkspaceAttachment({
      scope: taskScope,
      name: "Relatório.pdf",
      size: 5_000_000,
      contentType: "application/pdf",
    });
    const second = await workspace.prepareWorkspaceAttachment({
      scope: taskScope,
      name: "Foto.png",
      size: 27,
      contentType: "image/png",
    });
    await expect(
      workspace.downloadWorkspaceAttachment({ scope: taskScope, attachmentId: first.attachmentId }),
    ).rejects.toThrow("Arquivo não encontrado");
    await expect(
      workspace.prepareWorkspaceAttachment({
        scope: taskScope,
        name: "Grande.pdf",
        size: 20 * 1024 * 1024 + 1,
        contentType: "application/pdf",
      }),
    ).rejects.toThrow("20 MB");
    await expect(projects.getProjectFiles({ id: projectId })).rejects.toThrow("administradores");
    for (const grant of [first, second, first]) {
      await workspace.finishWorkspaceAttachment({
        scope: taskScope,
        attachmentId: grant.attachmentId,
      });
    }
    const history = await listTaskHistory(taskId);
    expect(history).toHaveLength(3);
    expect(history[0].attachment).toEqual({ id: second.attachmentId, name: "Foto.png", size: 27 });
    expect(history[1].attachment?.id).toBe(first.attachmentId);
    expect(
      (await workspace.getOlderTaskHistory({ taskId, cursor: history[0] })).entries,
    ).toHaveLength(2);
    expect(
      await workspace.downloadWorkspaceAttachment({
        scope: taskScope,
        attachmentId: first.attachmentId,
      }),
    ).toMatchObject({ name: "Relatório.pdf", url: expect.stringContaining("/workspace/task/") });
    await expect(
      workspace.prepareWorkspaceAttachment({
        scope: projectScope,
        name: "Projeto.csv",
        size: 31,
        contentType: "text/csv",
      }),
    ).rejects.toThrow("administradores");
    await query(sql`UPDATE users SET role='admin' WHERE id=${user.id}::uuid`);
    state.viewer = { ...user, role: "admin" };
    try {
      const direct = await workspace.prepareWorkspaceAttachment({
        scope: projectScope,
        name: "Projeto.csv",
        size: 31,
        contentType: "text/csv",
      });
      await workspace.finishWorkspaceAttachment({
        scope: projectScope,
        attachmentId: direct.attachmentId,
      });
      const data = await projects.getProjectFiles({ id: projectId });
      expect(data?.files.pagination.total).toBe(3);
      expect(data?.files.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "Projeto.csv", taskTitle: null }),
          expect.objectContaining({ name: "Relatório.pdf", taskTitle: "Relatório da oficina" }),
        ]),
      );
      const otherProject = "019ab04a-1000-7000-8000-000000000002";
      expect((await projects.getProjectFiles({ id: otherProject }))?.files.items).toEqual([]);
      await expect(
        workspace.downloadWorkspaceAttachment({
          scope: { kind: "project", id: otherProject },
          attachmentId: first.attachmentId,
        }),
      ).rejects.toThrow("Arquivo não encontrado");
      await tasks.deleteTask({ id: taskId, version: 1 });
      expect(
        (await projects.getProjectFiles({ id: projectId }))?.files.items.map((file) => file.id),
      ).toEqual([direct.attachmentId]);
    } finally {
      await query(sql`UPDATE users SET role='collaborator' WHERE id=${user.id}::uuid`);
      state.viewer = user;
    }
  });
});
