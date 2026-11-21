import "server-only";
import fleetSource from "@/data/official/fleet.json";
import { cities, states } from "@/libs/territories";
import type { OfficialContext, Territory } from "@/types/intelligence";

type FleetData = {
  headers: string[];
  years: Record<string, { states: Record<string, number[]>; cities: Record<string, number[]> }>;
  unmatched: Record<string, [string, string, number][]>;
};
const fleet = fleetSource as unknown as FleetData;
function sum(rows: number[][]) {
  return rows.length
    ? rows[0].map((_, i) => rows.reduce((total, r) => total + (r[i] ?? 0), 0))
    : null;
}
function values(territory: Territory, year: number) {
  const source = fleet.years[String(year)];
  if (!source) return null;
  if (territory.city) return source.cities[territory.city] ?? null;
  if (territory.uf) return source.states[territory.uf] ?? null;
  return sum(
    states
      .filter((s) => !territory.region || s.region === territory.region)
      .flatMap((s) => (source.states[s.code] ? [source.states[s.code]] : [])),
  );
}
export function getOfficialContext(territory: Territory, year: number): OfficialContext {
  const includedStates = states.filter((s) =>
    !territory.uf ? s.region === territory.region || !territory.region : s.code === territory.uf,
  );
  const includedCities = cities.filter((c) =>
    territory.city ? c.code === territory.city : includedStates.some((s) => s.code === c.state),
  );
  const numbers = values(territory, year);
  const population = territory.city
    ? (includedCities[0]?.population ?? null)
    : includedStates.reduce((n, s) => n + (s.population ?? 0), 0);
  return {
    population,
    fleet: numbers?.[0] ?? null,
    types: numbers
      ? fleet.headers
          .slice(1)
          .map((label, i) => ({
            label: label.toLowerCase().replace(/(^|[ -])\S/g, (c) => c.toUpperCase()),
            value: numbers[i + 1],
          }))
          .filter((x) => x.value > 0)
          .sort((a, b) => b.value - a.value)
      : [],
    series: Object.keys(fleet.years)
      .map(Number)
      .flatMap((y) => {
        const v = values(territory, y);
        return v ? [{ year: y, value: v[0] }] : [];
      }),
    municipalities: includedCities.length,
    coveredMunicipalities: includedCities.filter((c) => fleet.years[String(year)]?.cities[c.code])
      .length,
  };
}
export function getMapStatistics(year: number) {
  return states.map((s) => ({
    ...s,
    fleet: fleet.years[String(year)]?.states[s.code]?.[0] ?? null,
  }));
}
export const officialSources = {
  population: "https://sidra.ibge.gov.br/tabela/4714",
  geography: "https://servicodados.ibge.gov.br/api/docs/malhas?versao=3",
  fleet: (year: number) =>
    `https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/frota-de-veiculos-${year}`,
};
