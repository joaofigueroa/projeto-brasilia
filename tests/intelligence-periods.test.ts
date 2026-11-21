import { v7 } from "uuid";
import { describe, expect, it } from "vitest";
import { resolveTerritory } from "@/libs/territories";
import { getMunicipalMap } from "@/server/integrations/municipal-maps";
import {
  getMapStatistics,
  getMunicipalStatistics,
  getOfficialContext,
} from "@/server/integrations/official-statistics";
import { getCarModelReport } from "@/server/services/car-models";
import type { IntelligenceRecord } from "@/types/intelligence";
import { intelligenceFiltersSchema } from "@/validators/intelligence";

function record(overrides: Partial<IntelligenceRecord> = {}): IntelligenceRecord {
  return {
    id: v7(),
    tabId: v7(),
    title: "Vendas Nivus",
    category: "Automóveis",
    metric: "sales",
    value: 10,
    unit: "automóveis",
    year: 2022,
    regionCode: "5",
    stateCode: "GO",
    municipalityCode: "5208707",
    territoryLabel: "Goiânia · GO",
    sourceName: "Fonte de teste",
    sourceUrl: "https://www.gov.br/transportes",
    notes: "",
    status: "new",
    details: { make: "VW", model: "NIVUS", vehicleType: "Automóvel" },
    version: 1,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
describe("geographic and temporal intelligence", () => {
  it("normalizes single and multiple year filters and rejects empty or excessive periods", () => {
    expect(intelligenceFiltersSchema.parse({ year: "2022" }).years).toEqual([2022]);
    expect(intelligenceFiltersSchema.parse({ years: "2024,2022,2024" })).toMatchObject({
      years: [2022, 2024],
      year: 2024,
    });
    expect(() => intelligenceFiltersSchema.parse({ years: "" })).toThrow();
    expect(() =>
      intelligenceFiltersSchema.parse({ years: Array.from({ length: 11 }, (_, i) => 2000 + i) }),
    ).toThrow();
  });
  it("provides municipal geometry in every UF with codes for the requested local recuts", () => {
    const go = getMunicipalMap("GO");
    expect(go?.features).toHaveLength(246);
    expect(go?.features.find((s) => s.code === "5208707")?.name).toBe("Goiânia");
    expect(getMunicipalMap("MG")?.features).toHaveLength(853);
    expect(getMunicipalMap("MG")?.features.some((s) => s.code === "3106200")).toBe(true);
    expect(getMunicipalMap("DF")?.features[0].code).toBe("5300108");
    expect(getMunicipalMap(null)).toBeNull();
    expect(go?.features.every((s) => s.path.endsWith("Z") && s.center.every(Number.isFinite))).toBe(
      true,
    );
  });
  it("filters stock series by selected years and uses only automobiles in map indicators", () => {
    const territory = resolveTerritory({ uf: "DF" });
    expect(getOfficialContext(territory, [2022, 2024]).series.map((row) => row.year)).toEqual([
      2022, 2024,
    ]);
    const a = getMapStatistics(2022).find((s) => s.code === "DF")?.fleet ?? 0;
    const b = getMapStatistics(2024).find((s) => s.code === "DF")?.fleet ?? 0;
    expect(getMapStatistics([2022, 2024]).find((s) => s.code === "DF")?.fleet).toBe((a + b) / 2);
    expect(a).toBeLessThan(getOfficialContext(territory, 2022).fleet ?? 0);
    expect(getMapStatistics([2022, 2026]).find((s) => s.code === "DF")?.fleet).toBeNull();
    expect(
      getMunicipalStatistics("GO", [2022, 2023]).find((c) => c.code === "5208707")?.fleet,
    ).toBeGreaterThan(0);
  });
  it("consolidates only classified car models and selected annual flow records", () => {
    const records = [
      record(),
      record({ year: 2023, value: 20 }),
      record({ year: 2024, value: 99 }),
      record({ details: { make: "Honda", model: "CB", vehicleType: "Motocicleta" } }),
      record({ details: { make: "Mercedes", model: "Actros", vehicleType: "Caminhão" } }),
      record({ details: { make: "VW", model: "NIVUS" } }),
    ];
    const report = getCarModelReport(
      records,
      resolveTerritory({ uf: "GO", city: "5208707" }),
      [2022, 2023],
      "sales",
    );
    expect(report.rows).toHaveLength(1);
    expect(report.rows[0]).toMatchObject({ total: 30, average: 15, complete: true });
    expect(report.rows[0].values.map((r) => r.year)).toEqual([2022, 2023]);
    expect(report.recordIds).toHaveLength(2);
  });
  it("never sums different geographic levels or independent sources into the same model row", () => {
    const rows = [
      record(),
      record({ municipalityCode: null, territoryLabel: "Goiás", value: 80 }),
      record({ sourceName: "Outra fonte", value: 20 }),
    ];
    const report = getCarModelReport(rows, resolveTerritory({ uf: "GO" }), [2022], "sales");
    expect(report.rows).toHaveLength(3);
    expect(report.rows.map((r) => r.total).sort((a, b) => (a ?? 0) - (b ?? 0))).toEqual([
      10, 20, 80,
    ]);
  });
  it("flags ambiguous observations instead of counting the same source and year twice", () => {
    const report = getCarModelReport(
      [record(), record({ value: 20 })],
      resolveTerritory({ uf: "GO" }),
      [2022],
      "sales",
    );
    expect(report.rows[0].values[0]).toMatchObject({ value: null, ambiguous: true });
    expect(report.rows[0].total).toBeNull();
  });
  it("loads only national automobile rankings and consolidates Nivus without commercial vehicles", () => {
    const report = getCarModelReport(
      [],
      resolveTerritory({ region: "BR" }),
      [2022, 2023, 2024],
      "registrations",
    );
    const row = report.rows.find((r) => r.make === "VW" && r.model === "NIVUS");
    expect(row?.values.map((r) => r.value)).toEqual([39463, 52103, 55924]);
    expect(row?.total).toBe(147490);
    expect(report.rows.some((r) => r.model === "STRADA")).toBe(false);
    expect(
      getCarModelReport([], resolveTerritory({ uf: "DF" }), [2022], "registrations").rows,
    ).toEqual([]);
    expect(getCarModelReport([], resolveTerritory({ region: "BR" }), [2022], "sales").rows).toEqual(
      [],
    );
    expect(
      getCarModelReport(
        [],
        resolveTerritory({ region: "BR" }),
        [2022, 2024],
        "registrations",
      ).rows.find((r) => r.model === "NIVUS")?.total,
    ).toBe(95387);
  });
});
