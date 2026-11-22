import "server-only";
import { z } from "zod";
import { automotiveActivities, type CensusRow, censusCities } from "@/libs/company-census";
import { businessError } from "@/server/security/business-error";

export const defaultCensusDataset = "ArthurKrieger/cnpj-dados-receita-brasil-2026-10";
const sourceId = z
  .string()
  .regex(/^(ArthurKrieger|cnpjaberto)\/cnpj-dados-receita-brasil-\d{4}-\d{2}$/);
const pageSchema = z.object({
  num_rows_total: z.number().int().nonnegative(),
  partial: z.boolean().optional(),
  rows: z.array(
    z.object({
      row: z.record(z.string(), z.string().nullable()),
      truncated_cells: z.array(z.string()).optional(),
    }),
  ),
});
export async function latestCensusDataset() {
  const response = await fetch(
    "https://huggingface.co/api/datasets?author=ArthurKrieger&search=cnpj-dados-receita-brasil&limit=100",
    { cache: "no-store", signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok)
    throw businessError(
      "A fonte cadastral está indisponível. A pesquisa salva continua disponível.",
    );
  const entries = z.array(z.object({ id: z.string() })).parse(await response.json());
  const month = new Date().toISOString().slice(0, 7);
  const candidates = entries
    .map((row) => row.id)
    .filter((id) => sourceId.safeParse(id).success && id.slice(-7) <= month)
    .sort()
    .reverse();
  return candidates[0] ?? defaultCensusDataset;
}
export function censusWhere(cityCode: string) {
  const city = censusCities.find((item) => item.code === cityCode);
  if (!city) throw businessError("Selecione Brasília ou Goiânia para atualizar esta pesquisa.");
  const clauses = Object.keys(automotiveActivities).flatMap((code) => [
    `"cnae_fiscal_principal"='${code}'`,
    `"cnae_fiscal_secundaria" LIKE '%${code}%'`,
  ]);
  return `"uf"='${city.state}' AND "municipio"='${city.rfCode}' AND "situacao_cadastral"='02' AND (${clauses.join(" OR ")})`;
}
async function filteredPage(
  dataset: string,
  config: "estabelecimentos" | "empresas",
  where: string,
  offset: number,
  length: number,
) {
  sourceId.parse(dataset);
  const params = new URLSearchParams({
    dataset,
    config,
    split: "train",
    where,
    offset: String(offset),
    length: String(length),
  });
  const response = await fetch(`https://datasets-server.huggingface.co/filter?${params}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) {
    if (response.status === 503 || response.status === 504 || response.status === 429)
      throw businessError(
        "A fonte gratuita está preparando a consulta ou limitou o acesso. Retome a atualização em alguns instantes; o progresso foi preservado.",
      );
    throw businessError(
      "Não foi possível consultar a base cadastral. O progresso e a pesquisa anterior foram preservados.",
    );
  }
  const result = pageSchema.safeParse(await response.json());
  if (!result.success)
    throw businessError(
      "A fonte não devolveu uma página cadastral válida. Tente retomar a atualização.",
    );
  if (result.data.partial)
    throw businessError(
      "A fonte informou cobertura parcial. A pesquisa não será marcada como completa.",
    );
  if (result.data.rows.some((row) => row.truncated_cells?.length))
    throw businessError(
      "A fonte truncou campos do cadastro. A atualização foi interrompida para preservar os dados.",
    );
  return { total: result.data.num_rows_total, rows: result.data.rows.map((item) => item.row) };
}
export function censusEstablishments(dataset: string, cityCode: string, offset: number) {
  return filteredPage(dataset, "estabelecimentos", censusWhere(cityCode), offset, 100);
}
export async function censusLegalEntities(dataset: string, rows: CensusRow[]) {
  const roots = [
    ...new Set(
      rows
        .map((row) => row.cnpj_basico)
        .filter((value): value is string => !!value && /^[A-Z0-9]{8}$/.test(value)),
    ),
  ];
  if (!roots.length) return [];
  const result = await filteredPage(
    dataset,
    "empresas",
    roots.map((root) => `"cnpj_basico"='${root}'`).join(" OR "),
    0,
    100,
  );
  if (result.total > 100)
    throw businessError("A fonte devolveu pessoas jurídicas ambíguas; revise o lote.");
  // Never return shareholder, CPF or private-contact datasets.
  return result.rows.map((row) => ({
    cnpj_basico: row.cnpj_basico,
    razao_social: row.razao_social,
    capital_social: row.capital_social,
  }));
}
