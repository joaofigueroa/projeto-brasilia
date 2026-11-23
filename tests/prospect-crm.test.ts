import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicUser } from "@/types/domain";

const session = vi.hoisted(() => ({ viewer: null as PublicUser | null }));
vi.mock("@/server/security/session", () => ({
  requireViewer: async () => {
    if (!session.viewer) throw new Error("Authentication required");
    return session.viewer;
  },
}));
process.env.BRASILIA_LOCAL_DATABASE = "memory://";
process.env.BETTER_AUTH_SECRET = "isolated-crm-tests-with-a-secret-longer-than-32-characters";
const { migrateDatabase } = await import("../scripts/migrate");
const { query, closeDatabase } = await import("@/server/db/client");
const services = await import("@/server/services/prospect-crm");
const favorites = await import("@/server/services/prospect-page");
const research = await import("@/server/repositories/commercial-research");
const files = await import("@/server/repositories/prospect-crm");
const { researchListFiltersSchema } = await import("@/validators/commercial-research");
const { crmAttachmentSchema } = await import("@/validators/prospect-crm");
const projectId = "019ab04a-1000-7000-8000-000000000003";
const otherProject = "019ab04a-1000-7000-8000-000000000002";
const seller: PublicUser = {
  id: v7(),
  name: "Sales test",
  email: "crm-seller@test.local",
  image: null,
  role: "collaborator",
  jobTitle: "Sales",
};
const colleague: PublicUser = { ...seller, id: v7(), email: "crm-team@test.local" };
let prospectId: string;
const scope = () => ({ projectId, prospectId });
beforeAll(async () => {
  await migrateDatabase();
  const { insertUser } = await import("@/server/repositories/users");
  for (const user of [seller, colleague])
    await insertUser({ ...user, passwordHash: "test-only-no-login" });
  prospectId =
    (await research.findResearchProfiles(projectId, ["minas-escapamentos"]))[0].databaseId ?? "";
});
beforeEach(() => {
  session.viewer = seller;
});
afterAll(() => closeDatabase());
describe("shared prospect follow-up", () => {
  it("requires authentication, exact project and a personal favorite for writes", async () => {
    session.viewer = null;
    await expect(services.getProspectCrm(scope())).rejects.toThrow("Authentication");
    session.viewer = seller;
    await expect(services.getProspectCrm({ ...scope(), projectId: otherProject })).rejects.toThrow(
      "neste projeto",
    );
    await expect(services.commentOnProspect({ ...scope(), body: "A comment" })).rejects.toThrow(
      "Favorite",
    );
    await expect(
      services.changeProspectStage({ ...scope(), stage: "closing", version: 1 }),
    ).rejects.toThrow("Favorite");
  });
  it("starts one shared New Lead history and retains it when someone unfavorites", async () => {
    await favorites.favoriteProspect({ ...scope(), favorite: true });
    const first = await services.getProspectCrm(scope());
    expect(first).toMatchObject({ stage: "new_lead", version: 1, canManage: true });
    expect(first.history.entries).toHaveLength(1);
    expect(first.history.entries[0]).toMatchObject({ kind: "created", actor: { id: seller.id } });
    await favorites.favoriteProspect({ ...scope(), favorite: true });
    expect((await services.getProspectCrm(scope())).history.entries).toHaveLength(1);
    session.viewer = colleague;
    expect((await services.getProspectCrm(scope())).canManage).toBe(false);
    await favorites.favoriteProspect({ ...scope(), favorite: true });
    expect((await services.getProspectCrm(scope())).history.entries).toHaveLength(1);
    session.viewer = seller;
    await favorites.favoriteProspect({ ...scope(), favorite: false });
    expect((await services.getProspectCrm(scope())).history.entries).toHaveLength(1);
    expect((await services.getProspectCrm(scope())).canManage).toBe(false);
    await favorites.favoriteProspect({ ...scope(), favorite: true });
  });
  it("atomically moves stages, rejects concurrent overwrites and filters the paginated favorites", async () => {
    const input = { ...scope(), version: 1, stage: "contact_attempt" };
    const changed = await services.changeProspectStage(input);
    expect(changed.version).toBe(2);
    await expect(services.changeProspectStage({ ...input, stage: "qualifying" })).rejects.toThrow(
      "outra pessoa",
    );
    const history = (await services.getProspectCrm(scope())).history.entries;
    expect(history[0]).toMatchObject({
      kind: "stage_changed",
      changes: [{ field: "stage", before: "Novo Lead", after: "Tentativa de Contato" }],
    });
    session.viewer = colleague;
    expect((await services.getProspectCrm(scope())).stage).toBe("contact_attempt");
    const filters = researchListFiltersSchema.parse({ stage: "contact_attempt", pageSize: 10 });
    expect(
      (await research.getProspectCounts(projectId, ["5300108"], filters, colleague.id, true))
        .filtered,
    ).toBe(1);
    expect(
      (
        await research.listResearchProspects(projectId, ["5300108"], filters, 0, colleague.id, true)
      )[0],
    ).toMatchObject({ crmStage: "contact_attempt", databaseId: prospectId });
    expect(
      (
        await research.getProspectCounts(
          projectId,
          ["5300108"],
          researchListFiltersSchema.parse({ stage: "closing" }),
          colleague.id,
          true,
        )
      ).filtered,
    ).toBe(0);
  });
  it("preserves authors, comments and immutable events; paginates ties without losing rows", async () => {
    await services.commentOnProspect({
      ...scope(),
      body: "  Reunião prevista para terça-feira.  ",
    });
    const first = (await services.getProspectCrm(scope())).history.entries[0];
    expect(first).toMatchObject({
      kind: "comment",
      body: "Reunião prevista para terça-feira.",
      actor: { id: seller.id },
    });
    await expect(
      query(sql`UPDATE prospect_followup_events SET body='changed' WHERE id=${first.id}::uuid`),
    ).rejects.toThrow();
    await expect(
      query(sql`DELETE FROM prospect_followup_events WHERE id=${first.id}::uuid`),
    ).rejects.toThrow();
    for (let i = 0; i < 23; i++)
      await query(
        sql`INSERT INTO prospect_followup_events(id,prospect_id,actor_id,kind,body,snapshot,created_at) VALUES(${v7()}::uuid,${prospectId}::uuid,${seller.id}::uuid,'comment',${`Pagination ${i}`},'{}'::jsonb,'2026-11-22T20:00:00.123456Z')`,
      );
    let page = await services.getProspectHistory(scope());
    const ids = page.entries.map((e) => e.id);
    expect(page.entries).toHaveLength(20);
    while (page.nextCursor) {
      page = await services.getProspectHistory({ ...scope(), cursor: page.nextCursor });
      ids.push(...page.entries.map((e) => e.id));
    }
    expect(ids).toHaveLength(26);
    expect(new Set(ids).size).toBe(26);
    await expect(services.commentOnProspect({ ...scope(), body: "   " })).rejects.toThrow();
  });
  it("enforces 20 MB and formats; verifies attachment publication is atomic and project scoped", async () => {
    const value = {
      ...scope(),
      name: "Oferta.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 20 * 1024 * 1024,
    };
    expect(crmAttachmentSchema.safeParse(value).success).toBe(true);
    expect(crmAttachmentSchema.safeParse({ ...value, size: value.size + 1 }).success).toBe(false);
    expect(
      crmAttachmentSchema.safeParse({ ...value, name: "run.html", contentType: "text/html" })
        .success,
    ).toBe(false);
    expect(
      crmAttachmentSchema.safeParse({ ...value, name: "file.png", contentType: "application/pdf" })
        .success,
    ).toBe(false);
    const id = v7();
    await files.reserveCrmAttachment({
      ...scope(),
      actorId: seller.id,
      id,
      name: "Oferta.pdf",
      contentType: "application/pdf",
      size: 100,
      storageProvider: "test",
      storageBucket: "private",
      storagePath: `test/${id}`,
    });
    expect(
      await files.findCrmAttachment({ ...scope(), attachmentId: id, projectId: otherProject }),
    ).toBeNull();
    expect(
      await files.completeCrmAttachment({ ...scope(), actorId: colleague.id, attachmentId: id }),
    ).toBeNull();
    expect(
      await files.completeCrmAttachment({ ...scope(), actorId: seller.id, attachmentId: id }),
    ).toEqual({ id });
    expect(
      await files.completeCrmAttachment({ ...scope(), actorId: seller.id, attachmentId: id }),
    ).toBeNull();
    expect((await services.getProspectAttachments(scope())).items).toHaveLength(1);
    const events = await query<{ count: number }>(
      sql`SELECT count(*)::int AS count FROM prospect_followup_events WHERE prospect_id=${prospectId}::uuid AND kind='attachment_added'`,
    );
    expect(events[0].count).toBe(1);
  });
});
