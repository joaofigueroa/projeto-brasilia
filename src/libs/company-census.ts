import type { ResearchProspect } from "@/types/commercial-research";

export const automotiveProjectId = "019ab04a-1000-7000-8000-000000000003";
export const censusCities = [
  { code: "5300108", rfCode: "9701", name: "Brasília", state: "DF" },
  { code: "5208707", rfCode: "9373", name: "Goiânia", state: "GO" },
] as const;
export const automotiveActivities = {
  "4520001": "Manutenção e reparação mecânica de veículos automotores",
  "4520003": "Manutenção e reparação elétrica de veículos automotores",
  "4520004": "Alinhamento e balanceamento de veículos automotores",
  "4530701": "Comércio por atacado de peças e acessórios novos para veículos automotores",
  "4530703": "Comércio a varejo de peças e acessórios novos para veículos automotores",
};
export type CensusRow = Record<string, string | null>;
export function censusEligibility(row: CensusRow) {
  const city = censusCities.find((item) => item.state === row.uf && item.rfCode === row.municipio);
  const primary = row.cnae_fiscal_principal ?? "";
  const codes = Object.keys(automotiveActivities);
  const match = codes.includes(primary)
    ? primary
    : (row.cnae_fiscal_secundaria ?? "")
        .split(",")
        .find((code) => codes.includes(code.trim()))
        ?.trim();
  return row.situacao_cadastral === "02" && city && match
    ? {
        city,
        match,
        activityMatch: codes.includes(primary) ? ("primary" as const) : ("secondary" as const),
      }
    : null;
}
function registryDate(value: string | null | undefined) {
  if (!value || !/^\d{8}$/.test(value) || value === "00000000") return null;
  const date = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  return Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date
    ? null
    : date;
}
export function buildCensusProfile(
  row: CensusRow,
  company: CensusRow | undefined,
  source: string,
  month: string,
  curated?: ResearchProspect,
): ResearchProspect {
  const eligible = censusEligibility(row);
  if (!eligible) throw new Error("Estabelecimento fora dos critérios do levantamento.");
  const cnpj = `${row.cnpj_basico ?? ""}${row.cnpj_ordem ?? ""}${row.cnpj_dv ?? ""}`;
  if (!/^[A-Z0-9]{12}\d{2}$/.test(cnpj)) throw new Error("CNPJ inválido na fonte.");
  const checkedAt = new Date().toISOString().slice(0, 10);
  const rawCapital = company?.capital_social?.replace(",", ".");
  const capital = rawCapital && Number.isFinite(Number(rawCapital)) ? Number(rawCapital) : null;
  const segment = eligible.match.startsWith("452")
    ? "workshop"
    : eligible.match === "4530701"
      ? "distributor"
      : "parts_store";
  const primary = row.cnae_fiscal_principal ?? "";
  const label =
    automotiveActivities[primary as keyof typeof automotiveActivities] ??
    `Atividade principal CNAE ${primary}`;
  const legalName = company?.razao_social || row.nome_fantasia || `CNPJ ${cnpj}`;
  const fantasy =
    row.nome_fantasia && /[\p{L}\p{N}]/u.test(row.nome_fantasia) ? row.nome_fantasia : null;
  const registry = {
    cnpj,
    legalName,
    openedAt: registryDate(row.data_inicio_atividade),
    capital,
    status: "ATIVA",
    cnae: primary,
    activity: label,
    address: [row.tipo_logradouro, row.logradouro, row.numero, row.complemento, row.bairro]
      .filter(Boolean)
      .join(" · "),
    cityCode: eligible.city.code,
    state: eligible.city.state,
    branch: row.identificador_matriz_filial === "2",
    source: {
      id: "registry",
      label: `CNPJ · Receita Federal, espelho ${month}`,
      url: `https://huggingface.co/datasets/${source}`,
      kind: "registry" as const,
      checkedAt,
    },
  };
  if (curated) return { ...curated, registry, activityMatch: eligible.activityMatch, google: null };
  return {
    id: `cnpj-${cnpj}`,
    revision: 1,
    enrichmentLevel: "registry",
    activityMatch: eligible.activityMatch,
    google: null,
    name: fantasy || legalName,
    cityCode: eligible.city.code,
    cityName: eligible.city.name,
    state: eligible.city.state,
    segment,
    specialization: "unconfirmed",
    brands: [],
    website: "",
    phone: [row.ddd1, row.telefone1].filter(Boolean).join(" "),
    summary: `Estabelecimento ativo no cadastro de CNPJ de ${eligible.city.name}. ${label}.`,
    priority: "validate",
    rationale:
      "A atividade cadastrada está no recorte automotivo. Confirmar atuação em linha leve, aplicações e compra de componentes novos antes de qualificar.",
    nextStep:
      "Confirmar canal comercial, operação atual, especialização e responsável pelas compras.",
    productIds: segment === "workshop" ? ["3C50747", "3C51083"] : ["3C457000", "3C5259"],
    questions: [
      "A empresa atende automóveis de linha leve?",
      "É multimarcas ou especializada? Em quais montadoras?",
      "Quais aplicações e famílias de peças geram compras recorrentes?",
    ],
    gaps: [
      "Perfil cadastral: site, especialização e operação comercial ainda não pesquisados.",
      "Abertura do CNPJ não comprova fundação da marca. Capital social não é receita ou capacidade de compra.",
      ...(eligible.activityMatch === "secondary"
        ? ["Incluído por atividade secundária. Confirmar se essa atividade é exercida atualmente."]
        : []),
    ],
    foundation: null,
    registry,
    registryCandidates: [],
    sources: [],
    evidence: [
      {
        text: `CNPJ ativo em ${eligible.city.name}; incluído pelo CNAE ${eligible.match} ${eligible.activityMatch === "primary" ? "principal" : "secundário"}. Competência cadastral ${month}.`,
        sourceId: "registry",
      },
    ],
  };
}
