import { describe, expect, it } from "vitest";
import additional from "@/data/official/additional-car-models.json";
import national from "@/data/official/car-models.json";
import { cities, resolveTerritory, states } from "@/libs/territories";
import { isVehicleTerritoryIncluded, vehicleCapitalCode } from "@/libs/vehicle-scope";
import { getCarModelReport } from "@/server/services/car-models";

describe("verified automobile coverage by state and capital", () => {
  it("includes exactly one valid IBGE capital for each of the 27 UFs", () => {
    const targets = getCarModelReport(
      [],
      resolveTerritory({ region: "BR" }),
      [2024],
      "registrations",
    ).coverage.targets;
    expect(targets).toHaveLength(27);
    expect(new Set(targets.map((target) => target.capitalCode)).size).toBe(27);
    expect(new Set(targets.map((target) => target.uf))).toEqual(
      new Set(states.map((state) => state.code)),
    );
    for (const target of targets) {
      expect(cities.find((city) => city.code === target.capitalCode)).toMatchObject({
        name: target.capitalName,
        state: target.uf,
      });
      expect(isVehicleTerritoryIncluded(target.uf, target.capitalCode)).toBe(true);
    }
    expect(vehicleCapitalCode("DF")).toBe("5300108");
    expect(vehicleCapitalCode("invalid")).toBeNull();
    expect(isVehicleTerritoryIncluded("GO", "5201405")).toBe(false);
    expect(isVehicleTerritoryIncluded("GO", "3550308")).toBe(false);
  });

  it("loads the verified MT annual list with missing years intact and no borrowed capital totals", () => {
    const state = getCarModelReport(
      [],
      resolveTerritory({ uf: "MT" }),
      [2022, 2024, 2025],
      "registrations",
    );
    expect(state.rows).toHaveLength(135);
    const creta = state.rows.find((row) => row.model === "CRETA");
    expect(creta?.values.map((v) => v.value)).toEqual([null, 2359, null]);
    expect(creta?.total).toBe(2359);
    expect(creta?.complete).toBe(false);
    expect(creta?.territoryLabel).toBe("Mato Grosso");
    expect(creta?.sourceName).toContain("Fenabrave-MT");
    expect(state.coverage.missingYears).toEqual([2022, 2025]);
    expect(state.rows.reduce((sum, row) => sum + (row.total ?? 0), 0)).toBe(31513);
    expect(state.rows.some((row) => ["STRADA", "SAVEIRO", "CG 160"].includes(row.model))).toBe(
      false,
    );
    const capital = getCarModelReport(
      [],
      resolveTerritory({ uf: "MT", city: "5103403" }),
      [2024],
      "registrations",
    );
    expect(capital.rows).toEqual([]);
    expect(capital.coverage.availableYears).toEqual([]);
    expect(capital.coverage.scopeIncluded).toBe(true);
    expect(getCarModelReport([], resolveTerritory({ uf: "MT" }), [2024], "sales").rows).toEqual([]);
    expect(additional.publications[0]).toMatchObject({
      listedTotal: 31513,
      sectionTotal: 31541,
      publishedRows: 135,
    });
    expect(state.coverage.notes.join(" ")).toContain("diferença de 28");
  });

  it("reports absent UF and capital series honestly, keeping Brasília's integral DF exception", () => {
    const report = getCarModelReport(
      [],
      resolveTerritory({ uf: "SP" }),
      [2022, 2024],
      "registrations",
    );
    expect(report.rows).toEqual([]);
    expect(report.coverage.missingYears).toEqual([2022, 2024]);
    expect(report.coverage.targets.find((t) => t.uf === "MT")).toMatchObject({
      stateYears: [2024],
      capitalYears: [],
    });
    expect(report.coverage.targets.find((t) => t.uf === "DF")).toMatchObject({
      stateYears: [2022, 2023, 2024, 2025],
      capitalYears: [2022, 2023, 2024, 2025],
    });
    expect(report.coverage.targets.find((t) => t.uf === "GO")).toMatchObject({
      stateYears: [],
      capitalYears: [],
    });
    const other = getCarModelReport(
      [],
      resolveTerritory({ uf: "GO", city: "5201405" }),
      [2024],
      "registrations",
    );
    expect(other.coverage.scopeIncluded).toBe(false);
    expect(other.rows).toEqual([]);
  });

  it("extends the national series through the full year 2025 without treating it as UF data", () => {
    expect(national["2025"].rows).toHaveLength(50);
    expect(national["2025"].rows.map((r) => r.rank)).toEqual(
      Array.from({ length: 50 }, (_, i) => i + 1),
    );
    const report = getCarModelReport(
      [],
      resolveTerritory({ region: "BR" }),
      [2024, 2025],
      "registrations",
    );
    expect(report.rows.find((row) => row.model === "NIVUS")?.values.map((v) => v.value)).toEqual([
      55924, 48690,
    ]);
    expect(
      report.rows.find((row) => row.model === "POLO")?.values.find((v) => v.year === 2025)?.value,
    ).toBe(122672);
    expect(report.rows.every((row) => row.territoryLabel === "Brasil")).toBe(true);
    expect(report.coverage.missingYears).toEqual([]);
  });
});
