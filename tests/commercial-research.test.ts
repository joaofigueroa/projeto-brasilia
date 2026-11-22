import { describe, expect, it } from "vitest";
import dataset from "@/data/research/3c-automotive.json";
import { filterResearchProspects, selectCommercialResearch } from "@/libs/commercial-research";
import { resolveTerritory } from "@/libs/territories";
import { commercialResearchSchema } from "@/validators/commercial-research";
import { tabInputSchema } from "@/validators/intelligence";

const research = commercialResearchSchema.parse(dataset);
const view = (scope: Parameters<typeof resolveTerritory>[0], projectId = research.projectId) =>
  selectCommercialResearch(research, projectId, resolveTerritory(scope));

describe("commercial research boundaries", () => {
  it("keeps the research attached to the original automotive project identity", () => {
    expect(view({ uf: "DF" })?.prospects).toHaveLength(6);
    expect(view({ uf: "DF" }, "019ab04a-1000-7000-8000-000000000002")).toBeNull();
    expect(view({ region: "BR" })?.prospects).toHaveLength(12);
  });
  it("uses exact municipality boundaries and never substitutes metro area or national data", () => {
    const goiania = view({ uf: "GO", city: "5208707" });
    expect(goiania?.prospects).toHaveLength(6);
    expect(goiania?.prospects.every((prospect) => prospect.cityCode === "5208707")).toBe(true);
    expect(goiania?.reports.map((report) => report.cityCode)).toEqual(["5208707"]);
    expect(view({ uf: "GO", city: "5201405" })?.prospects).toEqual([]);
    expect(view({ uf: "MG", city: "3106200" })?.reports).toEqual([]);
    expect(view({ region: "3" })?.prospects).toEqual([]);
    expect(view({ uf: "DF", city: "5300108" })?.prospects).toHaveLength(6);
  });
  it("retains provenance, catalog links and distinct branch identity for every profile", () => {
    const prospectIds = research.prospects.map((prospect) => prospect.id);
    const productIds = research.products.map((product) => product.id);
    expect(new Set(prospectIds).size).toBe(12);
    for (const prospect of research.prospects) {
      expect(prospect.productIds.every((id) => productIds.includes(id))).toBe(true);
      const sources = [
        ...prospect.sources,
        ...(prospect.registry ? [prospect.registry.source] : []),
      ];
      for (const evidence of prospect.evidence) {
        expect(sources.some((source) => source.id === evidence.sourceId)).toBe(true);
      }
      for (const registry of [prospect.registry, ...prospect.registryCandidates].filter(
        (item) => item !== null,
      )) {
        expect(registry.cityCode).toBe(prospect.cityCode);
        expect(registry.state).toBe(prospect.state);
        expect(registry.source.url).toContain(registry.cnpj);
      }
    }
    for (const report of research.reports) {
      for (const entry of [...report.observations, ...report.plays]) {
        expect(entry.prospectIds.every((id) => prospectIds.includes(id))).toBe(true);
        expect(
          entry.prospectIds.every(
            (id) => research.prospects.find((p) => p.id === id)?.cityCode === report.cityCode,
          ),
        ).toBe(true);
      }
      for (const play of report.plays)
        expect(play.productIds.every((id) => productIds.includes(id))).toBe(true);
    }
  });
  it("does not choose a legal identity or capital value when the operating brand is ambiguous", () => {
    const autoFrance = research.prospects.find((p) => p.id === "auto-france-df");
    expect(autoFrance?.registry).toBeNull();
    expect(autoFrance?.registryCandidates).toHaveLength(2);
    expect(autoFrance?.priority).toBe("validate");
    const branches = research.prospects.filter((p) => p.registry?.branch);
    expect(branches).toHaveLength(2);
    expect(branches.every((p) => p.gaps.some((gap) => /[Cc]apital/.test(gap)))).toBe(true);
  });
  it("combines accent-insensitive search, segment and priority without creating new leads", () => {
    expect(
      filterResearchProspects(research.prospects, {
        query: "Citroen",
        segment: "workshop",
        priority: "first",
      }).map((p) => p.id),
    ).toEqual(["le-france"]);
    expect(
      filterResearchProspects(research.prospects, {
        query: "38343874000114",
        segment: "distributor",
        priority: "first",
      }).map((p) => p.id),
    ).toEqual(["mcd"]);
    expect(
      filterResearchProspects(research.prospects, {
        query: "Aparecida",
        segment: "",
        priority: "",
      }),
    ).toEqual([]);
  });
  it("finds formatted CNPJs and preserves ambiguous candidates as research only", () => {
    expect(
      filterResearchProspects(research.prospects, {
        query: "38.343.874/0001-14",
        segment: "",
        priority: "",
      }).map((p) => p.id),
    ).toEqual(["mcd"]);
    expect(
      filterResearchProspects(research.prospects, {
        query: "19.314.992/0001-50",
        segment: "",
        priority: "",
      }).map((p) => p.id),
    ).toEqual(["auto-france-df"]);
  });
  it("accepts a commercial analysis tab with the same validated project contract", () => {
    expect(
      tabInputSchema.parse({
        projectId: research.projectId,
        kind: "commercial",
        name: "Inteligência comercial",
        segments: [],
        keywords: [],
      }).kind,
    ).toBe("commercial");
  });
});
