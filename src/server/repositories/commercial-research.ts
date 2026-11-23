import "server-only";
import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import dataset from "@/data/research/3c-automotive.json";
import type { CrmStage } from "@/libs/prospect-crm";
import { query } from "@/server/db/client";
import type {
  CommercialReport,
  ResearchListFilters,
  ResearchProspect,
  ResearchRun,
} from "@/types/commercial-research";
import { commercialResearchSchema, researchProspectSchema } from "@/validators/commercial-research";

const research = commercialResearchSchema.parse(dataset);
export function readCommercialResearch() {
  return research;
}

function cityWhere(projectId: string, cities: string[]) {
  return sql`p.project_id=${projectId}::uuid AND p.active=true AND p.city_code IN (SELECT jsonb_array_elements_text(${JSON.stringify(cities)}::jsonb))`;
}
function favoriteWhere(viewerId: string | undefined, only: boolean) {
  return only
    ? sql`EXISTS(SELECT 1 FROM research_prospect_favorites f WHERE f.prospect_id=p.id AND f.user_id=${viewerId ?? null}::uuid)`
    : sql`true`;
}
function searchWhere(filters: ResearchListFilters) {
  const term = filters.query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[\\%_]/g, "\\$&");
  const digits = filters.query.replace(/\D/g, "");
  return sql`(${filters.segment}='' OR p.segment=${filters.segment})
    AND (${filters.priority}='' OR p.priority=${filters.priority})
    AND (${filters.enrichment}='' OR p.enrichment_level=${filters.enrichment})
    AND (${filters.stage}='' OR COALESCE((SELECT f.stage::text FROM prospect_followups f WHERE f.prospect_id=p.id),'new_lead')=${filters.stage})
    AND (${!filters.primaryOnly} OR COALESCE(p.profile->>'activityMatch','primary')='primary')
    AND (${!term} OR translate(lower(p.name || ' ' || COALESCE(p.profile->'registry'->>'address','') || ' ' || COALESCE(p.profile->>'brands','') || ' ' || COALESCE(p.cnpj,'')),'áàãâäéèêëíìîïóòõôöúùûüç','aaaaaeeeeiiiiooooouuuuc') LIKE ${`%${term}%`}
      OR (${digits.length >= 3} AND p.cnpj LIKE ${`%${digits}%`}))`;
}
function profileRow(row: {
  id: string;
  profile: unknown;
  google: unknown;
  googleVersion: number | null;
  revision: number;
  isFavorite?: boolean;
  crmStage?: CrmStage;
}) {
  const profile = researchProspectSchema.parse({
    ...(row.profile as object),
    databaseId: row.id,
    revision: row.revision,
    google: row.google ? { ...(row.google as object), version: row.googleVersion } : null,
  });
  return { ...profile, isFavorite: row.isFavorite ?? false, crmStage: row.crmStage };
}
export async function getProspectCounts(
  projectId: string,
  cities: string[],
  filters: ResearchListFilters,
  viewerId?: string,
  favoritesOnly = false,
) {
  const [row] = await query<{
    total: number;
    filtered: number;
    researched: number;
    primary: number;
    workshops: number;
    distributors: number;
    partsStores: number;
  }>(
    sql`SELECT count(*)::int AS total,count(*) FILTER(WHERE ${searchWhere(filters)})::int AS filtered,count(*) FILTER(WHERE p.enrichment_level='researched')::int AS researched,count(*) FILTER(WHERE COALESCE(p.profile->>'activityMatch','primary')='primary')::int AS "primary",count(*) FILTER(WHERE p.segment='workshop')::int AS workshops,count(*) FILTER(WHERE p.segment='distributor')::int AS distributors,count(*) FILTER(WHERE p.segment='parts_store')::int AS "partsStores" FROM research_prospects p WHERE ${cityWhere(projectId, cities)} AND ${favoriteWhere(viewerId, favoritesOnly)}`,
  );
  return row;
}
export async function listResearchProspects(
  projectId: string,
  cities: string[],
  filters: ResearchListFilters,
  offset: number,
  viewerId?: string,
  favoritesOnly = false,
) {
  const rows = await query<{
    id: string;
    profile: unknown;
    google: unknown;
    googleVersion: number | null;
    revision: number;
    isFavorite: boolean;
    crmStage: CrmStage;
  }>(
    sql`SELECT EXISTS(SELECT 1 FROM research_prospect_favorites f WHERE f.prospect_id=p.id AND f.user_id=${viewerId ?? null}::uuid) AS "isFavorite",COALESCE((SELECT f.stage FROM prospect_followups f WHERE f.prospect_id=p.id),'new_lead') AS "crmStage",p.id,p.profile,p.version AS revision,n.data AS google,n.version AS "googleVersion" FROM research_prospects p LEFT JOIN prospect_google_notes n ON n.prospect_id=p.id WHERE ${cityWhere(projectId, cities)} AND ${searchWhere(filters)} AND ${favoriteWhere(viewerId, favoritesOnly)} ORDER BY CASE p.priority WHEN 'first' THEN 0 WHEN 'develop' THEN 1 ELSE 2 END,CASE p.enrichment_level WHEN 'researched' THEN 0 ELSE 1 END,CASE COALESCE(p.profile->>'activityMatch','primary') WHEN 'primary' THEN 0 ELSE 1 END,lower(p.name),p.id LIMIT ${filters.pageSize} OFFSET ${offset}`,
  );
  return rows.map(profileRow);
}
export async function researchCoverage(projectId: string) {
  return query<{ cityCode: string; count: number }>(
    sql`SELECT city_code AS "cityCode",count(*)::int AS count FROM research_prospects WHERE project_id=${projectId}::uuid AND active=true GROUP BY city_code`,
  );
}
export async function analysisProspectSample(projectId: string, cityCode: string) {
  const rows = await query<{
    id: string;
    profile: unknown;
    google: unknown;
    googleVersion: number | null;
    revision: number;
  }>(
    sql`WITH ranked AS(SELECT p.*,row_number() OVER(PARTITION BY segment ORDER BY CASE enrichment_level WHEN 'researched' THEN 0 ELSE 1 END,CASE COALESCE(profile->>'activityMatch','primary') WHEN 'primary' THEN 0 ELSE 1 END,lower(name),id) AS position FROM research_prospects p WHERE ${cityWhere(projectId, [cityCode])}) SELECT id,profile,version AS revision,NULL AS google,NULL::int AS "googleVersion" FROM ranked ORDER BY CASE enrichment_level WHEN 'researched' THEN 0 ELSE 1 END,position,segment,id LIMIT 50`,
  );
  return rows.map(profileRow);
}
export async function findResearchProfiles(projectId: string, keys: string[]) {
  if (!keys.length) return [];
  const rows = await query<{
    id: string;
    profile: unknown;
    google: unknown;
    googleVersion: number | null;
    revision: number;
  }>(
    sql`SELECT p.id,p.profile,p.version AS revision,n.data AS google,n.version AS "googleVersion" FROM research_prospects p LEFT JOIN prospect_google_notes n ON n.prospect_id=p.id WHERE p.project_id=${projectId}::uuid AND p.reference_key IN (SELECT jsonb_array_elements_text(${JSON.stringify(keys)}::jsonb))`,
  );
  return rows.map(profileRow);
}
export async function findResearchProfileById(projectId: string, id: string) {
  const [row] = await query<{
    id: string;
    profile: unknown;
    google: unknown;
    googleVersion: number | null;
    revision: number;
  }>(
    sql`SELECT p.id,p.profile,p.version AS revision,n.data AS google,n.version AS "googleVersion" FROM research_prospects p LEFT JOIN prospect_google_notes n ON n.prospect_id=p.id WHERE p.project_id=${projectId}::uuid AND p.id=${id}::uuid`,
  );
  return row ? profileRow(row) : null;
}
export async function listCommercialReports(projectId: string, cities: string[]) {
  return query<{
    cityCode: string;
    report: CommercialReport;
    model: string;
    createdAt: string;
    inputs: { count: number; sampleSize: number };
  }>(
    sql`SELECT DISTINCT ON(city_code) city_code AS "cityCode",report,model,created_at AS "createdAt",inputs FROM commercial_reports WHERE project_id=${projectId}::uuid AND city_code IN(SELECT jsonb_array_elements_text(${JSON.stringify(cities)}::jsonb)) ORDER BY city_code,created_at DESC,id DESC`,
  );
}
const runColumns = sql`id,project_id AS "projectId",city_code AS "cityCode",kind,status,source,source_month AS "sourceMonth",cursor,total,phase,pending_rows AS "pendingRows",lease_token AS "leaseToken",lease_until AS "leaseUntil",message,created_at AS "createdAt",updated_at AS "updatedAt"`;
export function listResearchRuns(projectId: string, cities: string[]) {
  return query<ResearchRun>(
    sql`SELECT DISTINCT ON(city_code,kind) ${runColumns} FROM research_runs WHERE project_id=${projectId}::uuid AND city_code IN(SELECT jsonb_array_elements_text(${JSON.stringify(cities)}::jsonb)) ORDER BY city_code,kind,created_at DESC,id DESC`,
  );
}
export async function findResearchRun(projectId: string, id: string) {
  const [row] = await query<ResearchRun>(
    sql`SELECT ${runColumns} FROM research_runs WHERE id=${id}::uuid AND project_id=${projectId}::uuid`,
  );
  return row ?? null;
}
export async function createResearchRun(input: {
  projectId: string;
  cityCode: string;
  kind: "census" | "analysis";
  actorId: string;
  source?: string;
  sourceMonth?: string;
}) {
  const id = v7();
  const rows = await query<ResearchRun>(
    sql`INSERT INTO research_runs(id,project_id,city_code,kind,requested_by,source,source_month) SELECT ${id}::uuid,${input.projectId}::uuid,${input.cityCode},${input.kind},${input.actorId}::uuid,${input.source ?? ""},${input.sourceMonth ?? ""} WHERE NOT EXISTS(SELECT 1 FROM research_runs WHERE project_id=${input.projectId}::uuid AND city_code=${input.cityCode} AND kind=${input.kind} AND status IN('pending','running')) AND EXISTS(SELECT 1 FROM users WHERE id=${input.actorId}::uuid AND role='admin') ON CONFLICT DO NOTHING RETURNING ${runColumns}`,
  );
  return rows[0] ?? null;
}
export async function claimResearchRun(projectId: string, id: string, token: string) {
  const [row] = await query<ResearchRun>(
    sql`UPDATE research_runs SET status='running',lease_token=${token}::uuid,lease_until=now()+interval '3 minutes',updated_at=now() WHERE id=${id}::uuid AND project_id=${projectId}::uuid AND status IN('pending','running') AND (lease_until IS NULL OR lease_until<now()) RETURNING ${runColumns}`,
  );
  return row ?? null;
}
export function releaseResearchRun(
  id: string,
  token: string,
  message: string,
  status: "pending" | "failed" = "pending",
) {
  return query(
    sql`UPDATE research_runs SET status=${status},message=${message},lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=${id}::uuid AND lease_token=${token}::uuid RETURNING id`,
  );
}
export function stageCensusRows(
  id: string,
  token: string,
  rows: Record<string, string | null>[],
  total: number,
) {
  return query(
    sql`UPDATE research_runs SET pending_rows=${JSON.stringify(rows)}::jsonb,total=${total},phase='companies',message='',lease_token=NULL,lease_until=NULL,status='pending',updated_at=now() WHERE id=${id}::uuid AND lease_token=${token}::uuid AND lease_until>now() RETURNING id`,
  );
}
export async function upsertCensusBatch(
  run: ResearchRun,
  token: string,
  profiles: ResearchProspect[],
  actorId: string,
  processed: number,
) {
  const rows = profiles.map((profile) => ({
    id: v7(),
    reference_key: profile.id,
    cnpj: profile.registry?.cnpj ?? null,
    city_code: profile.cityCode,
    state_code: profile.state,
    name: profile.name,
    segment: profile.segment,
    priority: profile.priority,
    enrichment_level: profile.enrichmentLevel,
    profile,
  }));
  return query(sql`WITH live AS(SELECT id FROM research_runs WHERE id=${run.id}::uuid AND lease_token=${token}::uuid AND lease_until>now()),saved AS(INSERT INTO research_prospects(id,project_id,reference_key,cnpj,city_code,state_code,name,segment,priority,enrichment_level,profile,source_run_id,updated_by)
    SELECT x.id,${run.projectId}::uuid,x.reference_key,x.cnpj,x.city_code,x.state_code,x.name,x.segment,x.priority,x.enrichment_level,x.profile,live.id,${actorId}::uuid FROM jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) AS x(id uuid,reference_key text,cnpj text,city_code text,state_code text,name text,segment text,priority text,enrichment_level text,profile jsonb) CROSS JOIN live
    ON CONFLICT(project_id,reference_key) DO UPDATE SET cnpj=excluded.cnpj,name=CASE WHEN research_prospects.enrichment_level='researched' THEN research_prospects.name ELSE excluded.name END,segment=CASE WHEN research_prospects.enrichment_level='researched' THEN research_prospects.segment ELSE excluded.segment END,profile=CASE WHEN research_prospects.enrichment_level='researched' THEN research_prospects.profile || jsonb_build_object('registry',excluded.profile->'registry','activityMatch',excluded.profile->'activityMatch') ELSE excluded.profile END,source_run_id=excluded.source_run_id,active=true,updated_by=excluded.updated_by,version=research_prospects.version+1,updated_at=now() RETURNING id)
    UPDATE research_runs SET cursor=cursor+${processed},phase='establishments',pending_rows='[]'::jsonb,message='',lease_token=NULL,lease_until=NULL,status=CASE WHEN cursor+${processed}>=COALESCE(total,0) THEN 'completed' ELSE 'pending' END,updated_at=now() WHERE id IN(SELECT id FROM live) RETURNING id`);
}
export function finishEmptyCensus(id: string, token: string, total: number) {
  return query(
    sql`UPDATE research_runs SET total=${total},status='completed',pending_rows='[]'::jsonb,lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id=${id}::uuid AND lease_token=${token}::uuid RETURNING id`,
  );
}
export function saveGeneratedReport(
  run: ResearchRun,
  token: string,
  actorId: string,
  report: CommercialReport,
  model: string,
  inputs: object,
) {
  return query(
    sql`WITH saved AS(INSERT INTO commercial_reports(id,project_id,city_code,run_id,created_by,report,model,inputs) SELECT ${v7()}::uuid,project_id,city_code,id,${actorId}::uuid,${JSON.stringify(report)}::jsonb,${model},${JSON.stringify(inputs)}::jsonb FROM research_runs WHERE id=${run.id}::uuid AND lease_token=${token}::uuid AND lease_until>now() RETURNING run_id) UPDATE research_runs SET status='completed',message='',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE id IN(SELECT run_id FROM saved) RETURNING id`,
  );
}
export function saveGoogleNote(input: {
  prospectId: string;
  actorId: string;
  version: number;
  data: object;
}) {
  if (input.version === 0)
    return query(
      sql`INSERT INTO prospect_google_notes(id,prospect_id,updated_by,data) VALUES(${v7()}::uuid,${input.prospectId}::uuid,${input.actorId}::uuid,${JSON.stringify(input.data)}::jsonb) ON CONFLICT DO NOTHING RETURNING id`,
    );
  return query(
    sql`UPDATE prospect_google_notes SET data=${JSON.stringify(input.data)}::jsonb,updated_by=${input.actorId}::uuid,version=version+1,updated_at=now() WHERE prospect_id=${input.prospectId}::uuid AND version=${input.version} RETURNING id`,
  );
}

export function archiveMissingCensusProfiles(run: ResearchRun) {
  return query(
    sql`UPDATE research_prospects SET active=false,updated_at=now() WHERE project_id=${run.projectId}::uuid AND city_code=${run.cityCode} AND active=true AND source_run_id IS DISTINCT FROM ${run.id}::uuid AND EXISTS(SELECT 1 FROM research_runs WHERE id=${run.id}::uuid AND status='completed') RETURNING id`,
  );
}
export function expireStaleAnalysis(projectId: string, cityCode: string) {
  return query(
    sql`UPDATE research_runs SET status='failed',message='A execução anterior foi interrompida. Gere uma nova análise.',lease_token=NULL,lease_until=NULL,updated_at=now() WHERE project_id=${projectId}::uuid AND city_code=${cityCode} AND kind='analysis' AND status IN('pending','running') AND ((lease_until IS NOT NULL AND lease_until<now()) OR (lease_until IS NULL AND created_at<now()-interval '5 minutes')) RETURNING id`,
  );
}
export function updateProspectProfile(input: {
  projectId: string;
  id: string;
  revision: number;
  actorId: string;
  patch: object;
  name: string;
}) {
  return query(
    sql`UPDATE research_prospects SET profile=profile || ${JSON.stringify(input.patch)}::jsonb,name=${input.name},enrichment_level='researched',version=version+1,updated_by=${input.actorId}::uuid,updated_at=now() WHERE id=${input.id}::uuid AND project_id=${input.projectId}::uuid AND version=${input.revision} AND EXISTS(SELECT 1 FROM users WHERE id=${input.actorId}::uuid AND role='admin') RETURNING id`,
  );
}
