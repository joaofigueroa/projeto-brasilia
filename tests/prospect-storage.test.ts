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
});
