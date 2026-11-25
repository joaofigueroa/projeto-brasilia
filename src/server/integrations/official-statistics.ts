import "server-only";
import fleetSource from "@/data/official/fleet.json";
import { cities, states } from "@/libs/territories";
import type { OfficialContext, Territory } from "@/types/intelligence";
import { getMapCarRegistrations } from "./car-registrations";

type FleetData = {
  headers: string[];
  years: Record<string, { states: Record<string, number[]>; cities: Record<string, number[]> }>;
  unmatched: Record<string, [string, string, number][]>;
};
const fleet = fleetSource as unknown as FleetData;
function sum(rows: number[][]) {
  return rows.length
    ? rows[0].map((_, i) => rows.reduce((total, row) => total + (row[i] ?? 0), 0))
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
function average(rows: (number[] | null)[]) {
  return rows.some((row) => !row)
    ? null
    : (rows[0]?.map(
        (_, index) => rows.reduce((total, row) => total + (row?.[index] ?? 0), 0) / rows.length,
      ) ?? null);
}
export function getOfficialContext(territory: Territory, year: number | number[]): OfficialContext {
  const years = Array.isArray(year) ? year : [year];
  const includedStates = states.filter((s) =>
    !territory.uf ? s.region === territory.region || !territory.region : s.code === territory.uf,
  );
  const includedCities = cities.filter((c) =>
    territory.city ? c.code === territory.city : includedStates.some((s) => s.code === c.state),
  );
  const numbers = average(years.map((y) => values(territory, y)));
  return {
    population: territory.city
      ? (includedCities[0]?.population ?? null)
      : includedStates.reduce((n, s) => n + (s.population ?? 0), 0),
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
    series: years.flatMap((y) => {
      const row = values(territory, y);
      return row ? [{ year: y, value: row[0] }] : [];
    }),
    municipalities: includedCities.length,
    coveredMunicipalities: includedCities.filter((c) =>
      years.every((y) => fleet.years[String(y)]?.cities[c.code]),
    ).length,
  };
}
function carAverage(rows: (number[] | undefined)[]) {
  return rows.every(Boolean) ? rows.reduce((n, row) => n + (row?.[1] ?? 0), 0) / rows.length : null;
}
export function getMapStatistics(year: number | number[]) {
  const years = Array.isArray(year) ? year : [year];
  return states.map((s) => ({
    ...s,
    fleet: carAverage(years.map((y) => fleet.years[String(y)]?.states[s.code])),
    registrations: getMapCarRegistrations({ uf: s.code, city: null, region: null }, years),
  }));
}
export function getMunicipalStatistics(uf: string | null, years: number[]) {
  return uf
    ? cities
        .filter((c) => c.state === uf)
        .map((city) => ({
          ...city,
          fleet: carAverage(years.map((y) => fleet.years[String(y)]?.cities[city.code])),
          registrations: getMapCarRegistrations({ uf, city: city.code, region: null }, years),
        }))
    : [];
}
export const officialSources = {
  population: "https://sidra.ibge.gov.br/tabela/4714",
  geography: "https://servicodados.ibge.gov.br/api/docs/malhas?versao=3",
  fleet: (year: number) =>
    `https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/frota-de-veiculos-${year}`,
};
