import { describe, expect, it } from "vitest";
import source from "@/data/official/state-car-registrations.json";
import { resolveTerritory, states } from "@/libs/territories";
import { getCarRegistrations } from "@/server/integrations/car-registrations";
import {
  getMapStatistics,
  getMunicipalStatistics,
} from "@/server/integrations/official-statistics";

describe("verified state automobile registrations", () => {
  it("covers every UF in every year and reconciles with all ten published national automobile totals", () => {
    expect(Object.keys(source.states).sort()).toEqual(states.map((state) => state.code).sort());
    expect(source.source).toMatchObject({
      vehicleClass: "AUTOMÓVEIS / CARS",
      metric: "registrations",
      modelDimension: false,
      municipalityDimension: false,
      pdfPage: 76,
    });
    const totals = [
      1688288, 1856586, 2102114, 2262073, 1615942, 1558467, 1576662, 1721415, 1948681, 1997264,
    ];
    for (const [index, year] of source.years.entries()) {
      const map = getMapStatistics([year]);
      expect(map).toHaveLength(27);
      expect(
        map.every((row) => Number.isSafeInteger(row.registrations) && (row.registrations ?? 0) > 0),
      ).toBe(true);
      expect(map.reduce((total, row) => total + (row.registrations ?? 0), 0)).toBe(totals[index]);
      expect(getCarRegistrations(resolveTerritory({ region: "BR" }), [year]).total).toBe(
        totals[index],
      );
      for (const row of map) {
        const report = getCarRegistrations(resolveTerritory({ uf: row.code }), [year]);
        expect(report.total).toBe(row.registrations);
        expect(report.complete).toBe(true);
      }
    }
  });
  it("sums only explicitly selected years, with the same totals in the map and selected-state report", () => {
    const years = [2022, 2024];
    const go = getCarRegistrations(resolveTerritory({ uf: "GO" }), years);
    expect(go.series).toEqual([
      { year: 2022, value: 50707 },
      { year: 2024, value: 55692 },
    ]);
    expect(go.total).toBe(106399);
    expect(go.average).toBe(53199.5);
    expect(getMapStatistics(years).find((row) => row.code === "GO")?.registrations).toBe(go.total);
    expect(getCarRegistrations(resolveTerritory({ uf: "GO" }), [2024, 2022, 2024]).total).toBe(
      go.total,
    );
    const regional = getCarRegistrations(resolveTerritory({ region: "5" }), years);
    expect(regional.total).toBe(
      getMapStatistics(years)
        .filter((row) => row.region === "5")
        .reduce((sum, row) => sum + (row.registrations ?? 0), 0),
    );
  });
  it("keeps unpublished years missing instead of treating a partial period as a full map total", () => {
    const report = getCarRegistrations(resolveTerritory({ uf: "SP" }), [2024, 2026]);
    expect(report.series).toEqual([
      { year: 2024, value: 584486 },
      { year: 2026, value: null },
    ]);
    expect(report).toMatchObject({
      total: 584486,
      average: 584486,
      complete: false,
      missingYears: [2026],
    });
    expect(getMapStatistics([2024, 2026]).every((row) => row.registrations === null)).toBe(true);
    expect(getCarRegistrations(resolveTerritory({ uf: "SP" }), [2026])).toMatchObject({
      total: null,
      average: null,
      complete: false,
    });
  });
  it("does not assign state totals to cities, except the full-DF IBGE statistical territory", () => {
    const city = getCarRegistrations(resolveTerritory({ uf: "GO", city: "5208707" }), [2024]);
    expect(city).toMatchObject({
      total: null,
      supportedTerritory: false,
      availableYears: [],
      missingYears: [2024],
    });
    expect(getMunicipalStatistics("GO", [2024]).every((row) => row.registrations === null)).toBe(
      true,
    );
    expect(
      getCarRegistrations(resolveTerritory({ uf: "DF", city: "5300108" }), [2024]),
    ).toMatchObject({ total: 63938, supportedTerritory: true, complete: true });
    expect(
      getMunicipalStatistics("DF", [2024]).find((row) => row.code === "5300108")?.registrations,
    ).toBe(63938);
  });
});
