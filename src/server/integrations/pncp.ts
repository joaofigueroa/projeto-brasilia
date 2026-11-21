import "server-only";
import { z } from "zod";
import { states } from "@/libs/territories";
import type { NoticeResult, PublicNotice, Territory } from "@/types/intelligence";

const itemSchema = z.object({
  numeroControlePNCP: z.string(),
  objetoCompra: z.string(),
  valorTotalEstimado: z.number().nullable().optional(),
  dataPublicacaoPncp: z.string(),
  anoCompra: z.number(),
  sequencialCompra: z.number(),
  orgaoEntidade: z.object({ cnpj: z.string(), razaoSocial: z.string() }),
  unidadeOrgao: z.object({
    municipioNome: z.string().nullable().optional(),
    ufSigla: z.string().nullable().optional(),
  }),
});
const responseSchema = z.object({ data: z.array(itemSchema), totalRegistros: z.number() });
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
export async function getPublicNotices(
  territory: Territory,
  year: number,
  terms: string[],
): Promise<NoticeResult> {
  const today = new Date().toISOString().slice(0, 10);
  const to = year === new Date().getUTCFullYear() ? today : `${year}-12-31`;
  const date = new Date(`${to}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 30);
  const from = date.toISOString().slice(0, 10);
  const result: NoticeResult = {
    items: [],
    consulted: 0,
    total: 0,
    from,
    to,
    unavailable: false,
    terms,
  };
  if (!territory.uf || to > today) return result;
  const responses = await Promise.allSettled(
    [6, 8].map(async (modality) => {
      const params = new URLSearchParams({
        dataInicial: from.replaceAll("-", ""),
        dataFinal: to.replaceAll("-", ""),
        codigoModalidadeContratacao: String(modality),
        uf: territory.uf ?? "",
        pagina: "1",
        tamanhoPagina: "50",
      });
      if (territory.city) params.set("codigoMunicipioIbge", territory.city);
      const response = await fetch(
        `https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao?${params}`,
        { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) },
      );
      if (response.status === 204) return { data: [], totalRegistros: 0 };
      if (!response.ok) throw new Error("PNCP unavailable");
      return responseSchema.parse(await response.json());
    }),
  );
  const seen = new Set<string>();
  for (const response of responses) {
    if (response.status === "rejected") {
      result.unavailable = true;
      continue;
    }
    result.consulted += response.value.data.length;
    result.total += response.value.totalRegistros;
    for (const row of response.value.data) {
      if (
        seen.has(row.numeroControlePNCP) ||
        !terms.some((term) => normalize(row.objetoCompra).includes(normalize(term)))
      )
        continue;
      if (
        row.unidadeOrgao.ufSigla &&
        !states.some((s) => s.code === row.unidadeOrgao.ufSigla && s.code === territory.uf)
      )
        continue;
      seen.add(row.numeroControlePNCP);
      const notice: PublicNotice = {
        id: row.numeroControlePNCP,
        title: row.objetoCompra,
        organization: row.orgaoEntidade.razaoSocial,
        city: row.unidadeOrgao.municipioNome ?? territory.label,
        value: row.valorTotalEstimado ?? null,
        publishedAt: row.dataPublicacaoPncp,
        url: `https://pncp.gov.br/app/editais/${row.orgaoEntidade.cnpj}/${row.anoCompra}/${row.sequencialCompra}`,
      };
      result.items.push(notice);
    }
  }
  result.items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return result;
}

export async function getPublicNoticesForYears(
  territory: Territory,
  years: number[],
  terms: string[],
): Promise<NoticeResult> {
  const results = await Promise.all(years.map((year) => getPublicNotices(territory, year, terms)));
  const items = [
    ...new Map(results.flatMap((result) => result.items).map((item) => [item.id, item])).values(),
  ].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return {
    items,
    consulted: results.reduce((n, r) => n + r.consulted, 0),
    total: results.reduce((n, r) => n + r.total, 0),
    from: results[0].from,
    to: results[results.length - 1].to,
    unavailable: results.some((r) => r.unavailable),
    terms,
    periods: results.map((result, index) => ({
      year: years[index],
      from: result.from,
      to: result.to,
      consulted: result.consulted,
      total: result.total,
      unavailable: result.unavailable,
    })),
  };
}
