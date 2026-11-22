import "server-only";
import additionalSource from "@/data/official/additional-car-models.json";
import nationalSource from "@/data/official/car-models.json";
import regionalSource from "@/data/official/regional-car-models.json";
import { cities, states } from "@/libs/territories";
import { isVehicleTerritoryIncluded, vehicleCapitalCode } from "@/libs/vehicle-scope";
import type { CarModelCoverage, Territory } from "@/types/intelligence";

type Publication = {
  year: number;
  uf: string | null;
  city: string | null;
  territoryLabel: string;
  sourceName: string;
  sourceUrl: string;
  supportingSources?: { name: string; url: string }[];
  notes?: string[];
  rows: { make: string; model: string; value: number | null; issue?: string }[];
};
const national: Publication[] = Object.entries(nationalSource).map(([year, data]) => ({
  ...data,
  year: Number(year),
  uf: null,
  city: null,
  territoryLabel: "Brasil",
}));
const regional: Publication[] = [
  ...regionalSource.publications,
  ...additionalSource.publications,
].map((data) => ({
  ...data,
  city: null,
  supportingSources:
    "sectionTotalSourceUrl" in data
      ? [
          {
            name: `Fenabrave-${data.uf} · resumo anual · ${data.year} · página 4`,
            url: data.sectionTotalSourceUrl,
          },
        ]
      : [],
  territoryLabel:
    data.uf === "DF"
      ? "Distrito Federal · área integral"
      : states.find((state) => state.code === data.uf)!.name,
}));

function publicationsFor(territory: Pick<Territory, "level" | "uf" | "city">) {
  if (territory.level === "country") return national;
  if (territory.level !== "state" && territory.level !== "city") return [];
  // Brasília represents the entire DF in the IBGE cadastral geography.
  // No other capital inherits its state's totals.
  const city = territory.uf === "DF" && territory.city === "5300108" ? null : territory.city;
  return regional.filter((data) => data.uf === territory.uf && data.city === city);
}

const targets: CarModelCoverage["targets"] = states.map((state) => {
  const capitalCode = vehicleCapitalCode(state.code)!;
  const capitalName = cities.find(
    (city) => city.code === capitalCode && city.state === state.code,
  )!.name;
  return {
    uf: state.code,
    stateName: state.name,
    capitalCode,
    capitalName,
    stateYears: publicationsFor({ level: "state", uf: state.code, city: null }).map((p) => p.year),
    capitalYears: publicationsFor({ level: "city", uf: state.code, city: capitalCode }).map(
      (p) => p.year,
    ),
  };
});

export function getPublishedCarModels(
  territory: Territory,
  years: number[],
  measure: "sales" | "registrations",
): { publications: Publication[]; coverage: CarModelCoverage } {
  const scopeIncluded = isVehicleTerritoryIncluded(territory.uf, territory.city);
  const matching = scopeIncluded ? publicationsFor(territory) : [];
  const available = measure === "registrations" ? matching : [];
  const availableYears = [...new Set(available.map((item) => item.year))].sort((a, b) => a - b);
  const publications = available.filter((item) => years.includes(item.year));
  const notes = !scopeIncluded
    ? [
        "A consulta de modelos nesta etapa contempla UFs e capitais. Este município será incluído somente em uma etapa posterior.",
      ]
    : measure === "sales"
      ? [
          "Vendas informadas usam apenas registros locais cadastrados com fonte. Os boletins públicos carregados medem emplacamentos de veículos novos.",
        ]
      : territory.level === "country"
        ? ["Fenabrave nacional: 50 automóveis por ano. Ausência no ranking não significa zero."]
        : publications.length
          ? [
              `${publications[0].sourceName}: emplacamentos de automóveis no território da publicação. Somente os anos selecionados com dados são exibidos.`,
              "A classificação da fonte é preservada. Ausência de um modelo não é zero; rankings e listas publicados podem ter cobertura parcial.",
            ]
          : [
              "Não há publicação por modelo carregada para este território e os anos selecionados. Consulte a cobertura por UF e capital abaixo.",
            ];
  if (territory.uf === "DF")
    notes.push(
      "Brasília (IBGE 5300108) abrange todo o DF. Os dados não representam apenas o Plano Piloto nem uma região administrativa.",
    );
  if (publications.some((p) => p.rows.some((row) => row.issue)))
    notes.push(
      "Há observações com divergência entre o total anual e a soma mensal. Elas ficam sem valor e fora da consolidação até revisão.",
    );
  for (const publication of publications) notes.push(...(publication.notes ?? []));
  if (publications.some((publication) => publication.notes?.length))
    notes[0] +=
      " Lista parcial: a soma dos modelos difere do total do resumo da entidade. Consulte os detalhes em Fontes e cobertura.";
  return {
    publications,
    coverage: {
      scopeIncluded,
      targets:
        measure === "registrations"
          ? targets
          : targets.map((target) => ({ ...target, stateYears: [], capitalYears: [] })),
      availableYears,
      missingYears: years.filter((year) => !availableYears.includes(year)),
      notes,
      sources: publications.flatMap((item) => [
        { name: `${item.sourceName} · ${item.year}`, url: item.sourceUrl },
        ...(item.supportingSources ?? []),
      ]),
    },
  };
}
