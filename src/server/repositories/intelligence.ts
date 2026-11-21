import "server-only";
import { sql } from "drizzle-orm";
import { query } from "@/server/db/client";
import type { AnalysisTab, IntelligenceRecord, Territory } from "@/types/intelligence";
import type { RecordFields } from "@/validators/intelligence";

export type RecordWrite = RecordFields & {
  id: string;
  tabId: string;
  actorId: string;
  year: number;
  territory: Territory;
  importKey?: string;
};
export async function insertIntelligenceRecords(rows: RecordWrite[]) {
  const serialized = rows.map((r) => ({
    id: r.id,
    tab_id: r.tabId,
    actor_id: r.actorId,
    title: r.title,
    category: r.category,
    metric: r.metric,
    value: r.value,
    unit: r.unit,
    year: r.year,
    region_code: r.territory.region,
    state_code: r.territory.uf,
    municipality_code: r.territory.city,
    territory_label: r.territory.label,
    source_name: r.sourceName,
    source_url: r.sourceUrl,
    notes: r.notes,
    status: r.status,
    details: r.details,
    import_key: r.importKey ?? null,
  }));
  return query<{
    id: string;
  }>(sql`INSERT INTO intelligence_records (id,tab_id,created_by,updated_by,title,category,metric,value,unit,year,region_code,state_code,municipality_code,territory_label,source_name,source_url,notes,status,details,import_key)
 SELECT x.id,x.tab_id,x.actor_id,x.actor_id,x.title,x.category,x.metric,x.value,x.unit,x.year,x.region_code,x.state_code,x.municipality_code,x.territory_label,x.source_name,x.source_url,x.notes,x.status,x.details,x.import_key
 FROM jsonb_to_recordset(${JSON.stringify(serialized)}::jsonb) AS x(id uuid,tab_id uuid,actor_id uuid,title text,category text,metric text,value numeric,unit text,year integer,region_code text,state_code text,municipality_code text,territory_label text,source_name text,source_url text,notes text,status text,details jsonb,import_key text)
 ON CONFLICT (tab_id,import_key) DO UPDATE SET value=excluded.value,unit=excluded.unit,notes=excluded.notes,status=excluded.status,updated_by=excluded.updated_by,updated_at=now(),version=intelligence_records.version+1 RETURNING id`);
}
export function updateIntelligenceRecord(input: RecordWrite & { version: number }) {
  return query<{ id: string }>(
    sql`UPDATE intelligence_records SET title=${input.title},category=${input.category},metric=${input.metric},value=${input.value},unit=${input.unit},source_name=${input.sourceName},source_url=${input.sourceUrl},notes=${input.notes},status=${input.status},details=${JSON.stringify(input.details)}::jsonb,updated_by=${input.actorId}::uuid,updated_at=now(),version=version+1 WHERE id=${input.id}::uuid AND tab_id=${input.tabId}::uuid AND version=${input.version} AND year=${input.year} AND state_code IS NOT DISTINCT FROM ${input.territory.uf} AND municipality_code IS NOT DISTINCT FROM ${input.territory.city} AND region_code IS NOT DISTINCT FROM ${input.territory.region} RETURNING id`,
  );
}

export function listAnalysisTabs(projectId: string) {
  return query<AnalysisTab>(
    sql`SELECT id,project_id AS "projectId",name,kind,position,settings,version FROM analysis_tabs WHERE project_id=${projectId} ORDER BY position,created_at,id`,
  );
}
export function insertAnalysisTab(input: {
  id: string;
  projectId: string;
  name: string;
  kind: string;
  position: number;
  settings: AnalysisTab["settings"];
}) {
  return query<{ id: string }>(
    sql`INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES (${input.id},${input.projectId},${input.name},${input.kind},${input.position},${JSON.stringify(input.settings)}::jsonb) RETURNING id`,
  );
}
export function updateAnalysisTab(input: {
  id: string;
  projectId: string;
  name: string;
  settings: AnalysisTab["settings"];
  version: number;
}) {
  return query<{ id: string }>(
    sql`UPDATE analysis_tabs SET name=${input.name},settings=${JSON.stringify(input.settings)}::jsonb,version=version+1,updated_at=now() WHERE id=${input.id} AND project_id=${input.projectId} AND version=${input.version} RETURNING id`,
  );
}
export function listIntelligenceRecords(
  projectId: string,
  tabId: string,
  territory: Territory,
  year: number,
) {
  const scope = territory.city
    ? sql`r.municipality_code=${territory.city}`
    : territory.uf
      ? sql`r.state_code=${territory.uf}`
      : territory.region
        ? sql`r.region_code=${territory.region}`
        : sql`true`;
  return query<IntelligenceRecord>(
    sql`SELECT r.id,r.tab_id AS "tabId",r.title,r.category,r.metric,r.value::float8 AS value,r.unit,r.year,r.region_code AS "regionCode",r.state_code AS "stateCode",r.municipality_code AS "municipalityCode",r.territory_label AS "territoryLabel",r.source_name AS "sourceName",r.source_url AS "sourceUrl",r.notes,r.status,r.details,r.version,r.updated_at::text AS "updatedAt" FROM intelligence_records r JOIN analysis_tabs t ON t.id=r.tab_id WHERE t.project_id=${projectId} AND r.tab_id=${tabId} AND r.year=${year} AND ${scope} ORDER BY r.updated_at DESC,r.id LIMIT 500`,
  );
}
