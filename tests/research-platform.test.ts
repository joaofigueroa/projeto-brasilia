import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicUser } from "@/types/domain";

const session = vi.hoisted(() => ({ viewer: null as PublicUser | null }));
vi.mock("@/server/security/session", () => ({
  requireViewer: async () => {
    if (!session.viewer) throw new Error("Authentication required");
    return session.viewer;
  },
}));
process.env.BRASILIA_LOCAL_DATABASE = "memory://";
process.env.BETTER_AUTH_SECRET = "test-only-research-secret-longer-than-32-characters";
const { migrateDatabase } = await import("../scripts/migrate");
const { query, closeDatabase } = await import("@/server/db/client");
const repository = await import("@/server/repositories/commercial-research");
const services = await import("@/server/services/commercial-research");
const ai = await import("@/server/services/research-ai");
const { researchListFiltersSchema } = await import("@/validators/commercial-research");
const projectId = "019ab04a-1000-7000-8000-000000000003";
const admin: PublicUser = {
  id: v7(),
  name: "Research Admin",
  email: "research-admin@test.local",
  role: "admin",
  jobTitle: "Test",
  image: null,
};
const collaborator: PublicUser = {
  ...admin,
  id: v7(),
  email: "research-reader@test.local",
  role: "collaborator",
};
beforeAll(async () => {
  await migrateDatabase();
  const { insertUser } = await import("@/server/repositories/users");
  await insertUser({ ...admin, passwordHash: "test-only-not-used-for-login" });
  await insertUser({ ...collaborator, passwordHash: "test-only-not-used-for-login" });
});
beforeEach(() => {
  session.viewer = admin;
});
afterEach(() => vi.unstubAllGlobals());
afterAll(() => closeDatabase());
describe("live research authorization and storage", () => {
  it("paginates the seeded public profiles and rejects collaborator writes before network calls", async () => {
    const filters = researchListFiltersSchema.parse({});
    const profiles = await repository.listResearchProspects(projectId, ["5300108"], filters, 0);
    expect(profiles).toHaveLength(6);
    const sample = await repository.analysisProspectSample(projectId, "5300108");
    expect(sample).toHaveLength(6);
    expect(sample.every((profile) => profile.cityCode === "5300108")).toBe(true);
    expect((await repository.getProspectCounts(projectId, ["5300108"], filters)).total).toBe(6);
    session.viewer = collaborator;
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(services.startCityResearch({ projectId, cityCode: "5300108" })).rejects.toThrow(
      "Somente administradores",
    );
    await expect(services.generateCityAnalysis({ projectId, cityCode: "5300108" })).rejects.toThrow(
      "Somente administradores",
    );
    await expect(
      ai.connectResearchAi({
        projectId,
        version: 0,
        apiKey: "test-only-key-not-valid-real-secret",
        model: "gemini-3.8-flash",
      }),
    ).rejects.toThrow("Somente administradores");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("stores manual Google observations with sources and detects stale edits", async () => {
    const profile = (await repository.findResearchProfiles(projectId, ["minas-escapamentos"]))[0];
    expect(profile.databaseId).toBeDefined();
    const input = {
      projectId,
      prospectId: profile.databaseId,
      version: 0,
      fields: {
        rating: 4.8,
        reviewCount: 123,
        checkedAt: "2026-01-01",
        mapsUrl: "https://www.google.com/maps/search/?api=1&query=Test",
        reviews: [
          {
            id: v7(),
            author: "Autoria de teste",
            text: "Avaliação fictícia de teste, sem publicação externa.",
            rating: 5,
            publishedAt: "2026-01-01",
            url: "",
          },
        ],
      },
    };
    await services.saveProspectGoogleNote(input);
    const saved = await repository.findResearchProfileById(projectId, profile.databaseId ?? "");
    expect(saved?.google?.rating).toBe(4.8);
    expect(saved?.google?.version).toBe(1);
    await expect(services.saveProspectGoogleNote(input)).rejects.toThrow("alterado");
    await expect(
      services.saveProspectGoogleNote({
        ...input,
        projectId: "019ab04a-1000-7000-8000-000000000002",
      }),
    ).rejects.toThrow("pertence");
    session.viewer = collaborator;
    await expect(services.saveProspectGoogleNote({ ...input, version: 1 })).rejects.toThrow(
      "Somente administradores",
    );
  });
  it("updates commercial facts with provenance and preserves registry facts and concurrent edits", async () => {
    const profile = (await repository.findResearchProfiles(projectId, ["le-france"]))[0];
    const input = {
      projectId,
      prospectId: profile.databaseId,
      revision: profile.revision,
      name: profile.name,
      summary: "Descrição comercial confirmada na fonte de teste.",
      specialization: "specialist",
      brands: ["Peugeot", "Citroën"],
      website: "https://www.lefranceoficina.com.br/",
      phone: "",
      foundationYear: 2020,
      sourceName: "Site da empresa",
      sourceUrl: "https://www.lefranceoficina.com.br/",
      sourceKind: "company",
      notes: "Confirmar responsável por compras.",
    };
    const updated = await services.updateResearchedProfile(input);
    expect(updated?.revision).toBe(profile.revision + 1);
    expect(updated?.foundation?.year).toBe(2020);
    expect(updated?.registry).toEqual(profile.registry);
    expect(updated?.sources.some((source) => source.id.startsWith("manual-profile"))).toBe(true);
    await expect(services.updateResearchedProfile(input)).rejects.toThrow(
      "atualizado por outra pessoa",
    );
    session.viewer = collaborator;
    await expect(
      services.updateResearchedProfile({ ...input, revision: updated?.revision }),
    ).rejects.toThrow("Somente administradores");
  });
  it("protects one active run and one batch lease per city", async () => {
    const input = {
      projectId,
      cityCode: "5300108",
      kind: "census" as const,
      actorId: admin.id,
      source: "ArthurKrieger/cnpj-dados-receita-brasil-2026-10",
      sourceMonth: "2026-10",
    };
    const results = await Promise.all([
      repository.createResearchRun(input),
      repository.createResearchRun(input),
    ]);
    const runs = results.filter((run) => run !== null);
    expect(runs).toHaveLength(1);
    const run = runs[0];
    if (!run) throw new Error("Expected run.");
    const token = v7();
    const [a, b] = await Promise.all([
      repository.claimResearchRun(projectId, run.id, token),
      repository.claimResearchRun(projectId, run.id, v7()),
    ]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    const owner = a ? token : b?.leaseToken;
    if (!owner) throw new Error("Expected lease owner.");
    await repository.releaseResearchRun(run.id, owner, "Retry test");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ num_rows_total: 2, partial: false, rows: [] })),
        ),
    );
    await expect(services.processCityResearch({ projectId, runId: run.id })).rejects.toThrow(
      "página vazia",
    );
    const preserved = await repository.findResearchRun(projectId, run.id);
    expect(preserved?.cursor).toBe(0);
    expect(preserved?.status).toBe("pending");
    expect(
      (
        await repository.getProspectCounts(
          projectId,
          ["5300108"],
          researchListFiltersSchema.parse({}),
        )
      ).total,
    ).toBe(6);
    await query(sql`UPDATE research_runs SET status='failed' WHERE id=${run.id}::uuid`);
  });
  it("never returns the decrypted provider credential to the interface", async () => {
    const key = "test-only-google-key-not-a-real-api-credential";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ name: "models/gemini-3.8-flash" }))),
    );
    const status = await ai.connectResearchAi({
      projectId,
      version: 0,
      apiKey: key,
      model: "gemini-3.8-flash",
    });
    expect(status.configured).toBe(true);
    expect(JSON.stringify(status)).not.toContain(key);
    const [stored] = await query<{ encryptedKey: string }>(
      sql`SELECT encrypted_key AS "encryptedKey" FROM research_ai_connections WHERE project_id=${projectId}::uuid`,
    );
    expect(stored.encryptedKey).not.toContain(key);
    expect(JSON.stringify(await ai.researchAiStatus(projectId))).not.toContain(key);
  });
});
