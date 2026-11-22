import "server-only";
import { v7 } from "uuid";
import { selectCommercialResearch } from "@/libs/commercial-research";
import { automotiveProjectId, buildCensusProfile, censusCities } from "@/libs/company-census";
import { paginationRange } from "@/libs/pagination";
import { generateCommercialAnalysis } from "@/server/integrations/commercial-ai";
import {
  censusEstablishments,
  censusLegalEntities,
  latestCensusDataset,
} from "@/server/integrations/company-census";
import * as repository from "@/server/repositories/commercial-research";
import { businessError } from "@/server/security/business-error";
import { requireViewer } from "@/server/security/session";
import type { CommercialResearchView } from "@/types/commercial-research";
import type { Territory } from "@/types/intelligence";
import {
  googleNoteInputSchema,
  prospectProfileUpdateSchema,
  researchBatchInputSchema,
  researchCityInputSchema,
  researchListFiltersSchema,
} from "@/validators/commercial-research";
import { researchAiStatus } from "./research-ai";

async function requireResearchAdmin(projectId: string) {
  const viewer = await requireViewer();
  if (viewer.role !== "admin")
    throw businessError(
      "Somente administradores podem atualizar pesquisas, avaliações e análises por IA.",
    );
  if (projectId !== automotiveProjectId)
    throw businessError("Esta pesquisa pertence ao projeto 3C Automotive.");
  return viewer;
}
export async function getCommercialResearch(
  projectId: string,
  territory: Territory,
  rawFilters: unknown = {},
): Promise<CommercialResearchView | null> {
  const base = selectCommercialResearch(repository.readCommercialResearch(), projectId, territory);
  if (!base) return null;
  const filters = researchListFiltersSchema.parse(rawFilters);
  const cities = base.reports.map((report) => report.cityCode);
  const [stats, coverage, runs, savedReports, ai] = await Promise.all([
    repository.getProspectCounts(projectId, cities, filters),
    repository.researchCoverage(projectId),
    repository.listResearchRuns(projectId, cities),
    repository.listCommercialReports(projectId, cities),
    researchAiStatus(projectId),
  ]);
  const pagination = paginationRange(stats.filtered, filters.page, filters.pageSize);
  const prospects = await repository.listResearchProspects(
    projectId,
    cities,
    filters,
    pagination.offset,
  );
  const reports = base.reports.map(
    (report) => savedReports.find((saved) => saved.cityCode === report.cityCode)?.report ?? report,
  );
  const references = [
    ...new Set(
      reports.flatMap((report) =>
        [...report.observations, ...report.plays].flatMap((entry) => entry.prospectIds),
      ),
    ),
  ];
  const reportReferences = await repository.findResearchProfiles(projectId, references);
  return {
    ...base,
    prospects,
    reports,
    coverage: base.coverage.map((city) => ({
      ...city,
      count: coverage.find((row) => row.cityCode === city.cityCode)?.count ?? 0,
    })),
    live: {
      ai,
      pagination,
      filters,
      stats,
      runs,
      reportReferences,
      reports: savedReports.map((row) => ({
        cityCode: row.cityCode,
        createdAt: String(row.createdAt),
        model: row.model,
        count: row.inputs.count,
        sampleSize: row.inputs.sampleSize,
      })),
    },
  };
}
export async function startCityResearch(raw: unknown) {
  const input = researchCityInputSchema.parse(raw);
  const viewer = await requireResearchAdmin(input.projectId);
  const runs = await repository.listResearchRuns(input.projectId, [input.cityCode]);
  const previous = runs.find((run) => run.kind === "census");
  if (previous && ["pending", "running"].includes(previous.status)) return previous;
  const source = await latestCensusDataset();
  if (previous?.status === "completed" && previous.source === source) return previous;
  const created = await repository.createResearchRun({
    ...input,
    kind: "census",
    actorId: viewer.id,
    source,
    sourceMonth: source.slice(-7),
  });
  if (!created)
    throw businessError(
      "Já existe uma atualização desta cidade. Atualize a página para retomá-la.",
    );
  return created;
}
export async function processCityResearch(raw: unknown) {
  const input = researchBatchInputSchema.parse(raw);
  const viewer = await requireResearchAdmin(input.projectId);
  const found = await repository.findResearchRun(input.projectId, input.runId);
  if (!found || found.kind !== "census")
    throw businessError("Atualização não encontrada neste projeto.");
  if (found.status === "completed" || found.status === "failed") return found;
  const token = v7();
  const run = await repository.claimResearchRun(input.projectId, input.runId, token);
  if (!run) return found;
  try {
    if (run.phase === "establishments") {
      const page = await censusEstablishments(run.source, run.cityCode, run.cursor);
      if (run.total !== null && run.total !== page.total)
        throw businessError(
          "O total da fonte mudou durante a consulta. Inicie um novo levantamento para preservar a cobertura.",
        );
      if (!page.rows.length) {
        if (run.cursor < page.total)
          throw businessError("A fonte retornou uma página vazia antes do fim. Retome mais tarde.");
        await repository.finishEmptyCensus(run.id, token, page.total);
      } else await repository.stageCensusRows(run.id, token, page.rows, page.total);
    } else {
      const entities = await censusLegalEntities(run.source, run.pendingRows);
      const curated = repository.readCommercialResearch().prospects;
      const profiles = run.pendingRows.map((row) => {
        const cnpj = `${row.cnpj_basico}${row.cnpj_ordem}${row.cnpj_dv}`;
        return buildCensusProfile(
          row,
          entities.find((entity) => entity.cnpj_basico === row.cnpj_basico),
          run.source,
          run.sourceMonth,
          curated.find((profile) => profile.registry?.cnpj === cnpj),
        );
      });
      await repository.upsertCensusBatch(run, token, profiles, viewer.id, run.pendingRows.length);
    }
    const updated = await repository.findResearchRun(input.projectId, input.runId);
    if (updated?.status === "completed") await repository.archiveMissingCensusProfiles(updated);
    return updated;
  } catch (error) {
    const message =
      error instanceof Error && error.name === "BusinessError"
        ? error.message
        : "A consulta à fonte falhou. Retome a atualização; o progresso foi preservado.";
    await repository.releaseResearchRun(run.id, token, message);
    throw businessError(message);
  }
}
export async function generateCityAnalysis(raw: unknown) {
  const input = researchCityInputSchema.parse(raw);
  const viewer = await requireResearchAdmin(input.projectId);
  await repository.expireStaleAnalysis(input.projectId, input.cityCode);
  const latestCensus = (await repository.listResearchRuns(input.projectId, [input.cityCode])).find(
    (run) => run.kind === "census",
  );
  if (latestCensus && ["pending", "running"].includes(latestCensus.status))
    throw businessError("Conclua a atualização cadastral desta cidade antes de gerar a análise.");
  const existing = (await repository.listResearchRuns(input.projectId, [input.cityCode])).find(
    (run) => run.kind === "analysis",
  );
  if (
    existing?.status === "completed" &&
    Date.now() - new Date(existing.updatedAt).getTime() < 60000
  )
    throw businessError("Aguarde um minuto antes de gerar outra análise desta cidade.");
  const created = await repository.createResearchRun({
    ...input,
    kind: "analysis",
    actorId: viewer.id,
  });
  if (!created) throw businessError("Uma análise já está sendo gerada para esta cidade.");
  const token = v7();
  const run = await repository.claimResearchRun(input.projectId, created.id, token);
  if (!run) throw businessError("Não foi possível iniciarar a análise. Atualize a página.");
  try {
    const filters = researchListFiltersSchema.parse({ pageSize: 50 });
    const [stats, prospects, runs] = await Promise.all([
      repository.getProspectCounts(input.projectId, [input.cityCode], filters),
      repository.analysisProspectSample(input.projectId, input.cityCode),
      repository.listResearchRuns(input.projectId, [input.cityCode]),
    ]);
    if (!stats.total)
      throw businessError("Atualize o cadastro desta cidade antes de gerar a análise.");
    const source = runs.find((item) => item.kind === "census" && item.status === "completed");
    const city = censusCities.find((item) => item.code === input.cityCode);
    const result = await generateCommercialAnalysis({
      projectId: input.projectId,
      cityCode: input.cityCode,
      cityName: city?.name ?? input.cityCode,
      stats,
      count: stats.total,
      sourceMonth: source?.sourceMonth ?? "Pesquisa inicial",
      prospects,
      products: repository.readCommercialResearch().products,
    });
    const saved = await repository.saveGeneratedReport(
      run,
      token,
      viewer.id,
      result.report,
      result.model,
      {
        count: stats.total,
        sampleSize: prospects.length,
        sourceRunId: source?.id ?? null,
        sourceMonth: source?.sourceMonth ?? null,
        usage: result.usage,
      },
    );
    if (!saved.length)
      throw businessError(
        "A geração perdeu a reserva de execução. A análise anterior foi preservada.",
      );
    return run.id;
  } catch (error) {
    const message =
      error instanceof Error && error.name === "BusinessError"
        ? error.message
        : "Não foi possível gerar a análise. A versão anterior foi preservada.";
    await repository.releaseResearchRun(run.id, token, message, "failed");
    throw businessError(message);
  }
}
export async function saveProspectGoogleNote(raw: unknown) {
  const input = googleNoteInputSchema.parse(raw);
  const viewer = await requireResearchAdmin(input.projectId);
  if (input.fields.checkedAt > new Date().toISOString().slice(0, 10))
    throw businessError("A data da consulta não pode estar no futuro.");
  const prospect = await repository.findResearchProfileById(input.projectId, input.prospectId);
  if (!prospect) throw businessError("Perfil não encontrado neste projeto.");
  const result = await repository.saveGoogleNote({
    prospectId: input.prospectId,
    actorId: viewer.id,
    version: input.version,
    data: input.fields,
  });
  if (!result.length)
    throw businessError("O registro de avaliações foi alterado. Reabra o perfil antes de salvar.");
  return input.prospectId;
}
export async function updateResearchedProfile(raw: unknown) {
  const input = prospectProfileUpdateSchema.parse(raw);
  const viewer = await requireResearchAdmin(input.projectId);
  if (input.foundationYear && input.foundationYear > new Date().getFullYear())
    throw businessError("O ano de fundação não pode estar no futuro.");
  const previous = await repository.findResearchProfileById(input.projectId, input.prospectId);
  if (!previous) throw businessError("Perfil não encontrado neste projeto.");
  const source = {
    id: `manual-profile-${input.revision + 1}`,
    label: input.sourceName,
    url: input.sourceUrl,
    kind: input.sourceKind,
    checkedAt: new Date().toISOString().slice(0, 10),
  };
  const patch = {
    name: input.name,
    summary: input.summary,
    specialization: input.specialization,
    brands: input.brands,
    website: input.website,
    phone: input.phone,
    foundation: input.foundationYear
      ? {
          year: input.foundationYear,
          note: "Fundação declarada na fonte indicada pelo administrador.",
          sourceId: source.id,
        }
      : null,
    enrichmentLevel: "researched",
    sources: [...previous.sources.filter((item) => item.id !== source.id), source],
    evidence: [
      ...previous.evidence,
      {
        text: "Dados comerciais atualizados por administrador com a fonte indicada.",
        sourceId: source.id,
      },
    ],
    gaps: [
      ...previous.gaps.filter((gap) => !gap.startsWith("Perfil cadastral:")),
      ...(input.notes ? [input.notes] : []),
    ],
  };
  const saved = await repository.updateProspectProfile({
    projectId: input.projectId,
    id: input.prospectId,
    revision: input.revision,
    actorId: viewer.id,
    patch,
    name: input.name,
  });
  if (!saved.length)
    throw businessError("O perfil foi atualizado por outra pessoa. Reabra-o antes de salvar.");
  return await repository.findResearchProfileById(input.projectId, input.prospectId);
}
