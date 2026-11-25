import { describe, expect, it } from "vitest";
import source from "@/data/official/sc-car-models.json";
import { resolveTerritory } from "@/libs/territories";
import { getCarModelReport } from "@/server/services/car-models";

describe("verified Detran-SC first-registration model exports", () => {
  it("reconciles all twenty complete annual model lists with independent monthly controls", () => {
    expect(source.publications).toHaveLength(20);
    expect(source.publications.reduce((sum, publication) => sum + publication.rows.length, 0)).toBe(
      3031,
    );
    for (const publication of source.publications) {
      expect(publication).toMatchObject({
        uf: "SC",
        sourceKind: "government",
        classification: "AUTOMOVEL",
        completeExport: true,
      });
      expect(publication.periodStart).toBe(`${publication.year}-01-01`);
      expect(publication.periodEnd).toBe(`${publication.year}-12-31`);
      expect(publication.monthlyTotals.map((row) => row.month)).toEqual(
        Array.from({ length: 12 }, (_, index) => index + 1),
      );
      expect(publication.rows).toHaveLength(publication.publishedRows);
      expect(publication.rows.reduce((sum, row) => sum + row.value, 0)).toBe(
        publication.publishedTotal,
      );
      expect(publication.monthlyTotals.reduce((sum, row) => sum + row.value, 0)).toBe(
        publication.publishedTotal,
      );
      expect(new Set(publication.rows.map((row) => `${row.make}/${row.model}`)).size).toBe(
        publication.rows.length,
      );
      expect(
        publication.rows.every((row) => Number.isSafeInteger(row.value) && row.value >= 0),
      ).toBe(true);
      expect(publication.sha256).toMatch(/^[a-f\d]{64}$/);
      expect(publication.controlsSha256).toMatch(/^[a-f\d]{64}$/);
      expect(
        publication.rows.some((row) =>
          ["STRADA", "SAVEIRO", "CG 160", "RANGER"].includes(row.model),
        ),
      ).toBe(false);
    }
  });
  it("shows the verified state models for exactly the selected years without borrowing national values", () => {
    const report = getCarModelReport(
      [],
      resolveTerritory({ uf: "SC" }),
      [2022, 2024],
      "registrations",
    );
    const onix = report.rows.find((row) => row.make === "CHEV" && row.model === "ONIX");
    expect(onix?.values.map((row) => row.value)).toEqual([7497, 7183]);
    expect(onix).toMatchObject({
      total: 14680,
      average: 7340,
      complete: true,
      territoryLabel: "Santa Catarina",
    });
    expect(report.rows.reduce((sum, row) => sum + (row.total ?? 0), 0)).toBe(52553 + 70638);
    expect(report.coverage.missingYears).toEqual([]);
    expect(report.coverage.notes.join(" ")).not.toContain("Lista parcial: a soma");
    expect(report.coverage.notes.join(" ")).toContain("universo diferem");
  });
  it("keeps the capital separate, matching the model counts verified in the official interface", () => {
    const report = getCarModelReport(
      [],
      resolveTerritory({ uf: "SC", city: "4205407" }),
      [2024],
      "registrations",
    );
    expect(report.rows).toHaveLength(114);
    expect(report.rows.find((row) => row.model === "ONIX")?.total).toBe(1016);
    expect(report.rows.find((row) => row.model === "HB20")?.total).toBe(715);
    expect(report.rows.find((row) => row.model === "T-CROSS")?.total).toBe(583);
    expect(report.rows.reduce((sum, row) => sum + (row.total ?? 0), 0)).toBe(9433);
    expect(report.rows.every((row) => row.territoryLabel === "Florianópolis · SC")).toBe(true);
  });
  it("advertises actual years without filling unsupported cities, other UFs, sales or absent periods", () => {
    const report = getCarModelReport(
      [],
      resolveTerritory({ uf: "SC" }),
      [2024, 2026],
      "registrations",
    );
    expect(report.coverage.availableYears).toEqual(source.years);
    expect(report.coverage.missingYears).toEqual([2026]);
    expect(report.rows.every((row) => row.values[1].value === null && !row.complete)).toBe(true);
    expect(report.coverage.targets.find((target) => target.uf === "SC")).toMatchObject({
      stateYears: source.years,
      capitalYears: source.years,
    });
    expect(report.coverage.targets.find((target) => target.uf === "GO")).toMatchObject({
      stateYears: [],
      capitalYears: [],
    });
    expect(
      getCarModelReport(
        [],
        resolveTerritory({ uf: "SC", city: "4209102" }),
        [2024],
        "registrations",
      ).rows,
    ).toEqual([]);
    expect(getCarModelReport([], resolveTerritory({ uf: "SC" }), [2024], "sales").rows).toEqual([]);
  });
});
