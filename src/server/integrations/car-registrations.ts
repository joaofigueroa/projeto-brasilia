import "server-only";
import source from "@/data/official/state-car-registrations.json";
import { states } from "@/libs/territories";
import type { RegistrationReport, Territory } from "@/types/intelligence";

const observations = source.states as Record<string, Record<string, number>>;

export function getCarRegistrations(
  territory: Pick<Territory, "uf" | "city" | "region">,
  selectedYears: number[],
): RegistrationReport {
  const years = [...new Set(selectedYears)].sort((a, b) => a - b);
  // Brasília's IBGE statistical territory covers the whole DF. Other cities never inherit a UF.
  const supportedTerritory =
    !territory.city || (territory.uf === "DF" && territory.city === "5300108");
  const included = states.filter((state) =>
    territory.uf
      ? state.code === territory.uf
      : !territory.region || territory.region === "BR" || state.region === territory.region,
  );
  const series = years.map((year) => {
    const values = included.map((state) => observations[state.code]?.[String(year)]);
    return {
      year,
      value:
        supportedTerritory && values.length > 0 && values.every((value) => value !== undefined)
          ? values.reduce((sum, value) => sum + value, 0)
          : null,
    };
  });
  const values = series.flatMap((row) => (row.value === null ? [] : [row.value]));
  return {
    series,
    total: values.length ? values.reduce((sum, value) => sum + value, 0) : null,
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    complete: years.length > 0 && values.length === years.length,
    supportedTerritory,
    availableYears: supportedTerritory && included.length ? source.years : [],
    missingYears: series.filter((row) => row.value === null).map((row) => row.year),
    source: source.source,
  };
}

// A partial period is never painted as the full period in the map.
export function getMapCarRegistrations(
  territory: Pick<Territory, "uf" | "city" | "region">,
  years: number[],
) {
  const report = getCarRegistrations(territory, years);
  return report.complete ? report.total : null;
}
