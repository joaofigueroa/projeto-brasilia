import "server-only";
import { createHash } from "node:crypto";
import { v7 } from "uuid";
import { parseCsv } from "@/libs/csv";
import { resolveTerritory } from "@/libs/territories";
import { getMunicipalMap } from "@/server/integrations/municipal-maps";
import {
  getMapStatistics,
  getMunicipalStatistics,
  getOfficialContext,
} from "@/server/integrations/official-statistics";
import { getPublicNoticesForYears } from "@/server/integrations/pncp";
import {
  insertAnalysisTab,
  insertIntelligenceRecords,
  listAnalysisTabs,
  listIntelligenceRecords,
  updateAnalysisTab,
  updateIntelligenceRecord,
} from "@/server/repositories/intelligence";
import { listProjects } from "@/server/repositories/projects";
import { businessError } from "@/server/security/business-error";
import { requireViewer } from "@/server/security/session";
import type { IntelligenceData, Territory } from "@/types/intelligence";
import {
  intelligenceFiltersSchema,
  recordFieldsSchema,
  recordImportSchema,
  recordInputSchema,
  tabInputSchema,
} from "@/validators/intelligence";
import { getCarModelReport } from "./car-models";
import { getCommercialResearch } from "./commercial-research";

function fail(message: string): never {
  throw businessError(message);
}
function territory(input: { region?: string; uf?: string; city?: string }): Territory {
  try {
    return resolveTerritory(input);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Território inválido.");
  }
}
async function requireAdmin() {
  const viewer = await requireViewer();
  if (viewer.role !== "admin")
    fail("Somente administradores podem configurar análises e registros.");
  return viewer;
}
async function assertTab(projectId: string, tabId: string) {
  const tabs = await listAnalysisTabs(projectId);
  const tab = tabs.find((t) => t.id === tabId);
  if (!tab) fail("A aba não pertence ao projeto selecionado.");
  return tab;
}
export async function getIntelligence(raw: unknown): Promise<IntelligenceData> {
  const input = intelligenceFiltersSchema.parse(raw);
  const viewer = await requireViewer();
  const projects = await listProjects();
  const project = input.project ? projects.find((p) => p.id === input.project) : projects[0];
  if (!project) fail("Projeto não encontrado.");
  const tabs = await listAnalysisTabs(project.id);
  const tab = input.tab ? tabs.find((t) => t.id === input.tab) : tabs[0];
  if (!tab) fail("Aba não encontrada neste projeto.");
  const scope = territory(input);
  const official = getOfficialContext(scope, input.years);
  const [records, notices, research] = await Promise.all([
    listIntelligenceRecords(project.id, tab.id, scope, input.years),
    tab.kind === "opportunities"
      ? getPublicNoticesForYears(scope, input.years, tab.settings.keywords)
      : Promise.resolve(null),
    tab.kind === "prospects" || tab.kind === "commercial"
      ? getCommercialResearch(project.id, scope, {
          page: input.researchPage,
          pageSize: input.researchSize,
          query: input.researchQuery,
          segment: input.researchSegment,
          priority: input.researchPriority,
          enrichment: input.researchEnrichment,
          primaryOnly: input.researchPrimary === "1",
        })
      : Promise.resolve(null),
  ]);
  return {
    viewer,
    projects,
    project,
    tabs,
    tab,
    territory: scope,
    year: input.year,
    years: input.years,
    mapView: input.map,
    municipalMap: input.map === "municipalities" ? getMunicipalMap(scope.uf) : null,
    models: getCarModelReport(
      records,
      scope,
      input.years,
      input.metric === "sales" ? "sales" : "registrations",
    ),
    metric:
      tab.kind === "vehicles"
        ? input.metric === "sales"
          ? "sales"
          : "registrations"
        : input.metric,
    records,
    research,
    official,
    notices,
    states: getMapStatistics(input.years),
    cities: getMunicipalStatistics(scope.uf, input.years).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR"),
    ),
  };
}
export async function saveAnalysisTab(raw: unknown) {
  const input = tabInputSchema.parse(raw);
  await requireAdmin();
  const projects = await listProjects();
  if (!projects.some((p) => p.id === input.projectId)) fail("Projeto não encontrado.");
  const tabs = await listAnalysisTabs(input.projectId);
  const previous = input.id ? tabs.find((t) => t.id === input.id) : null;
  if (input.id && (!previous || input.version !== previous.version))
    fail("A aba foi alterada. Atualize a página antes de salvar.");
  if (
    tabs.some(
      (t) =>
        t.id !== input.id &&
        t.name.toLocaleLowerCase("pt-BR") === input.name.toLocaleLowerCase("pt-BR"),
    )
  )
    fail("Já existe uma aba com esse nome neste projeto.");
  if (previous && previous.kind !== input.kind)
    fail("Crie outra aba para usar um tipo de análise diferente.");
  const id = input.id ?? v7();
  const settings = {
    segments: [...new Set(input.segments)],
    keywords: [...new Set(input.keywords)],
  };
  const rows = previous
    ? await updateAnalysisTab({
        id,
        projectId: input.projectId,
        name: input.name,
        settings,
        version: input.version ?? 0,
      })
    : await insertAnalysisTab({
        id,
        projectId: input.projectId,
        name: input.name,
        kind: input.kind,
        position: Math.max(-1, ...tabs.map((t) => t.position)) + 1,
        settings,
      });
  if (!rows.length) fail("A aba foi alterada. Atualize a página antes de salvar.");
  return id;
}
export async function saveIntelligenceRecord(raw: unknown) {
  const input = recordInputSchema.parse(raw);
  const viewer = await requireAdmin();
  await assertTab(input.scope.project, input.scope.tab);
  const scope = territory(input.scope);
  const row = {
    ...input.fields,
    id: input.id ?? v7(),
    actorId: viewer.id,
    tabId: input.scope.tab,
    year: input.scope.year,
    territory: scope,
  };
  const result = input.id
    ? await updateIntelligenceRecord({ ...row, version: input.version ?? 0 })
    : await insertIntelligenceRecords([row]);
  if (!result.length)
    fail("O registro mudou ou pertence a outro território. Atualize a página antes de salvar.");
  return result[0].id;
}
export async function importIntelligenceRecords(raw: unknown) {
  const input = recordImportSchema.parse(raw);
  const viewer = await requireAdmin();
  await assertTab(input.scope.project, input.scope.tab);
  const scope = territory(input.scope);
  let entries: Record<string, string>[];
  try {
    entries = parseCsv(input.csv);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "CSV inválido.");
  }
  if (!entries.length) fail("O arquivo não possui registros.");
  const seen = new Set<string>();
  const rows = entries.map((entry, index) => {
    const parsed = recordFieldsSchema.safeParse({
      title: entry.title,
      category: entry.category ?? "",
      metric: entry.metric ?? "context",
      value: entry.value ? Number(entry.value.replace(",", ".")) : null,
      unit: entry.unit ?? "unidades",
      sourceName: entry.source_name,
      sourceUrl: entry.source_url ?? "",
      notes: entry.notes ?? "",
      status: entry.status ?? "new",
      details: {
        make: entry.make ?? "",
        model: entry.model ?? "",
        vehicleType: entry.vehicle_type ?? "",
        manufactureYear: entry.manufacture_year ?? "",
        contact: entry.contact ?? "",
      },
    });
    if (!parsed.success) fail(`Linha ${index + 2}: ${parsed.error.issues[0]?.message}`);
    const fields = parsed.data;
    const key = createHash("sha256")
      .update(
        JSON.stringify([
          scope.level,
          scope.region,
          scope.uf,
          scope.city,
          input.scope.year,
          fields.title,
          fields.category,
          fields.metric,
          fields.details,
          fields.sourceUrl,
        ]),
      )
      .digest("hex");
    if (seen.has(key)) fail(`Linha ${index + 2}: registro repetido no arquivo.`);
    seen.add(key);
    return {
      ...fields,
      id: v7(),
      actorId: viewer.id,
      tabId: input.scope.tab,
      year: input.scope.year,
      territory: scope,
      importKey: key,
    };
  });
  const result = await insertIntelligenceRecords(rows);
  return result.length;
}
