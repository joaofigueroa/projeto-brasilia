import { readFile } from "node:fs/promises";
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
const prospectPages = await import("@/server/services/prospect-page");
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
  it("shows VMS profiles by city and segment with their own catalog and personal favorites", async () => {
    const { wineProjectId } = await import("@/libs/commercial-research");
    const { getIntelligence } = await import("@/server/services/intelligence");
    const wine = await getIntelligence({ project: wineProjectId, uf: "GO" });
    const prospects = wine.tabs.find((tab) => tab.kind === "prospects");
    const favorites = wine.tabs.find((tab) => tab.kind === "favorites");
    expect(prospects).toBeDefined();
    expect(favorites).toBeDefined();
    const goiania = { project: wineProjectId, tab: prospects?.id, uf: "GO", city: "5208707" };
    const list = await getIntelligence({ ...goiania, researchSize: 10, researchPage: 2 });
    expect(list.research?.live?.pagination).toMatchObject({ total: 20, page: 2, pages: 2 });
    expect(list.research?.prospects).toHaveLength(10);
    expect(list.research?.prospects.every((profile) => profile.cityCode === "5208707")).toBe(true);
    const df = {
      project: wineProjectId,
      tab: prospects?.id,
      uf: "DF",
      city: "5300108",
    };
    const restaurants = await getIntelligence({
      ...df,
      researchSegment: "restaurant",
      researchSize: 10,
      researchPage: 4,
    });
    expect(restaurants.research?.live?.pagination).toMatchObject({ total: 39, page: 4, pages: 4 });
    expect(restaurants.research?.prospects).toHaveLength(9);
    expect(restaurants.research?.prospects.every((item) => item.segment === "restaurant")).toBe(
      true,
    );
    const markets = await getIntelligence({ ...df, researchSegment: "supermarket" });
    expect(markets.research?.live?.stats).toMatchObject({ total: 59, filtered: 13 });
    const rosario = await prospectPages.getProspectPage("trattoria-rosario-df", wineProjectId);
    expect(rosario?.prospect).toMatchObject({ cityCode: "5300108", priority: "first" });
    expect(rosario?.prospect.sources).toHaveLength(2);
    expect(rosario?.products.find((item) => item.id === "frankstein")?.catalogPage).toBe(10);
    const brasilia = await getIntelligence({
      ...df,
      researchSegment: "distributor",
    });
    expect(brasilia.research?.live?.stats).toMatchObject({ total: 59, filtered: 4 });
    const [prospect] = brasilia.research?.prospects ?? [];
    const page = await prospectPages.getProspectPage(prospect.databaseId ?? "", wineProjectId);
    expect(page?.prospect.sources.length).toBeGreaterThan(0);
    expect(page?.products.filter((product) => prospect.productIds.includes(product.id))).toEqual(
      expect.arrayContaining([expect.objectContaining({ catalogPage: expect.any(Number) })]),
    );
    const favoriteScope = { project: wineProjectId, tab: favorites?.id, uf: "DF" };
    await prospectPages.favoriteProspect({
      projectId: wineProjectId,
      prospectId: prospect.databaseId,
      favorite: true,
    });
    expect(
      (await getIntelligence(favoriteScope)).research?.prospects.map((profile) => profile.id),
    ).toEqual([prospect.id]);
    session.viewer = collaborator;
    expect((await getIntelligence(favoriteScope)).research?.prospects).toEqual([]);
    expect(await prospectPages.getProspectPage(prospect.databaseId ?? "", projectId)).toBeNull();
  });
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
    ).rejects.toThrow("Perfil não encontrado neste projeto.");
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
  it("isolates favorites by person, validates project ownership and keeps counts and pagination in sync", async () => {
    const filters = researchListFiltersSchema.parse({ pageSize: 10 });
    const [first, second] = await repository.listResearchProspects(
      projectId,
      ["5300108"],
      filters,
      0,
    );
    const input = { projectId, prospectId: first.databaseId, favorite: true };
    await prospectPages.favoriteProspect(input);
    await prospectPages.favoriteProspect(input);
    expect(
      (await repository.getProspectCounts(projectId, ["5300108"], filters, admin.id, true)).total,
    ).toBe(1);
    expect(
      (
        await repository.listResearchProspects(projectId, ["5300108"], filters, 0, admin.id, true)
      )[0].isFavorite,
    ).toBe(true);
    session.viewer = collaborator;
    expect(
      (await repository.getProspectCounts(projectId, ["5300108"], filters, collaborator.id, true))
        .total,
    ).toBe(0);
    await prospectPages.favoriteProspect({
      projectId,
      prospectId: second.databaseId,
      favorite: true,
      userId: admin.id,
    });
    const own = await repository.listResearchProspects(
      projectId,
      ["5300108"],
      filters,
      0,
      collaborator.id,
      true,
    );
    expect(own.map((item) => item.databaseId)).toEqual([second.databaseId]);
    await expect(
      prospectPages.favoriteProspect({
        ...input,
        projectId: "019ab04a-1000-7000-8000-000000000002",
        favorite: false,
      }),
    ).rejects.toThrow("neste projeto");
    await prospectPages.favoriteProspect({ ...input, favorite: false });
    expect(
      (await repository.getProspectCounts(projectId, ["5300108"], filters, admin.id, true)).total,
    ).toBe(1);
    session.viewer = admin;
    await prospectPages.favoriteProspect({ ...input, favorite: false });
    await prospectPages.favoriteProspect({ ...input, favorite: false });
    expect(
      (await repository.getProspectCounts(projectId, ["5300108"], filters, admin.id, true)).total,
    ).toBe(0);
    expect(
      (await repository.getProspectCounts(projectId, ["5208707"], filters, collaborator.id, true))
        .total,
    ).toBe(0);
    await query(sql`DELETE FROM research_prospect_favorites`);
  });
  it("loads standalone profiles with authentication and rejects mismatched project URLs", async () => {
    const profile = (await repository.findResearchProfiles(projectId, ["minas-escapamentos"]))[0];
    const page = await prospectPages.getProspectPage(profile.databaseId ?? "", projectId);
    expect(page?.prospect.name).toBe(profile.name);
    expect(page?.prospect.databaseId).toBe(profile.databaseId);
    expect(page?.defaultBackHref).toContain("city=5300108");
    expect(
      await prospectPages.getProspectPage(
        profile.databaseId ?? "",
        "019ab04a-1000-7000-8000-000000000002",
      ),
    ).toBeNull();
    expect(await prospectPages.getProspectPage("../invalid", projectId)).toBeNull();
    session.viewer = null;
    await expect(
      prospectPages.getProspectPage(profile.databaseId ?? "", projectId),
    ).rejects.toThrow("Authentication required");
  });
  it("allows database preparation to repeat without touching favorites or enabling another tab", async () => {
    const [before] = await query<{ position: number }>(
      sql`SELECT position FROM analysis_tabs WHERE project_id=${projectId}::uuid AND kind='favorites'`,
    );
    const profile = (await repository.findResearchProfiles(projectId, ["minas-escapamentos"]))[0];
    await prospectPages.favoriteProspect({
      projectId,
      prospectId: profile.databaseId,
      favorite: true,
    });
    const blocks = (await readFile("drizzle/0008_prospect_favorites.sql", "utf8"))
      .split("--> statement-breakpoint")
      .slice(0, 6)
      .map((statement) => statement.trim());
    expect(blocks).toHaveLength(6);
    expect(blocks.every((block) => !block.includes("analysis_tabs"))).toBe(true);
    for (let attempt = 0; attempt < 2; attempt++)
      for (const block of blocks) await query(sql.raw(block));
    const tabs = await query<{ position: number }>(
      sql`SELECT position FROM analysis_tabs WHERE project_id=${projectId}::uuid AND kind='favorites'`,
    );
    expect(tabs).toEqual([before]);
    expect(
      (
        await repository.getProspectCounts(
          projectId,
          ["5300108"],
          researchListFiltersSchema.parse({}),
          admin.id,
          true,
        )
      ).total,
    ).toBe(1);
    await prospectPages.favoriteProspect({
      projectId,
      prospectId: profile.databaseId,
      favorite: false,
    });
  });
});
