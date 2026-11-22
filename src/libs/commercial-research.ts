import type {
  CommercialResearch,
  CommercialResearchView,
  ResearchProspect,
} from "@/types/commercial-research";
import type { Territory } from "@/types/intelligence";

export const researchSegmentLabels = {
  workshop: "Oficina",
  distributor: "Distribuidora",
  parts_store: "Autopeças",
};
export const researchPriorityLabels = {
  first: "Priorizar contato",
  develop: "Desenvolver conta",
  validate: "Validar perfil",
};
export const researchSpecializationLabels = {
  multibrand: "Multimarcas",
  specialist: "Especializada",
  unconfirmed: "Perfil a confirmar",
};
const order = { first: 0, develop: 1, validate: 2 };
export function selectCommercialResearch(
  research: CommercialResearch,
  projectId: string,
  territory: Territory,
): CommercialResearchView | null {
  if (research.projectId !== projectId) return null;
  const matches = (cityCode: string) => {
    const state = cityCode === "5300108" ? "DF" : "GO";
    return (
      (!territory.city || territory.city === cityCode) &&
      (!territory.uf || territory.uf === state) &&
      (!territory.region || territory.region === "BR" || territory.region === "5")
    );
  };
  const { projectId: _projectId, ...data } = research;
  return {
    ...data,
    prospects: research.prospects
      .filter((p) => matches(p.cityCode))
      .sort(
        (a, b) => order[a.priority] - order[b.priority] || a.name.localeCompare(b.name, "pt-BR"),
      ),
    reports: research.reports.filter((r) => matches(r.cityCode)),
    coverage: [
      {
        cityCode: "5300108",
        cityName: "Brasília",
        state: "DF",
        count: research.prospects.filter((p) => p.cityCode === "5300108").length,
      },
      {
        cityCode: "5208707",
        cityName: "Goiânia",
        state: "GO",
        count: research.prospects.filter((p) => p.cityCode === "5208707").length,
      },
    ],
  };
}
export function filterResearchProspects(
  prospects: ResearchProspect[],
  filters: { query: string; segment: string; priority: string },
) {
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  const query = normalize(filters.query.trim());
  return prospects.filter(
    (p) =>
      (!filters.segment || p.segment === filters.segment) &&
      (!filters.priority || p.priority === filters.priority) &&
      (!query ||
        normalize(
          [
            p.name,
            p.summary,
            p.cityName,
            ...p.brands,
            p.registry?.cnpj ?? "",
            p.registry ? formatCnpj(p.registry.cnpj) : "",
            ...p.registryCandidates.flatMap((candidate) => [
              candidate.cnpj,
              formatCnpj(candidate.cnpj),
            ]),
            p.registry?.address ?? "",
          ].join(" "),
        ).includes(query)),
  );
}
export const researchDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" }).format(
    new Date(`${date}T12:00:00Z`),
  );
export const researchCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
export const formatCnpj = (cnpj: string) =>
  cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
