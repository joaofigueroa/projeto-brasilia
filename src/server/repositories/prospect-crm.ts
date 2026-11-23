import "server-only";
import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import type { CrmStage } from "@/libs/prospect-crm";
import { query } from "@/server/db/client";
import type { CrmAttachment, CrmEvent } from "@/types/prospect-crm";

export type CrmScope = { projectId: string; prospectId: string };
type WriteScope = CrmScope & { actorId: string };
function favorite(input: WriteScope) {
  return sql`EXISTS(SELECT 1 FROM research_prospect_favorites fav WHERE fav.prospect_id=p.id AND fav.user_id=${input.actorId}::uuid)`;
}
export async function crmContext(input: CrmScope, viewerId: string) {
  const [row] = await query<{ stage: CrmStage; version: number; canManage: boolean }>(sql`
    SELECT COALESCE(f.stage,'new_lead') AS stage,COALESCE(f.version,0)::int AS version,
      EXISTS(SELECT 1 FROM research_prospect_favorites fav WHERE fav.prospect_id=p.id AND fav.user_id=${viewerId}::uuid) AS "canManage"
    FROM research_prospects p LEFT JOIN prospect_followups f ON f.prospect_id=p.id
    WHERE p.id=${input.prospectId}::uuid AND p.project_id=${input.projectId}::uuid AND p.active=true`);
  return row ?? null;
}
export async function crmHistory(
  prospectId: string,
  cursor: { createdAt: string; id: string } | null,
) {
  const rows = await query<
    CrmEvent & { cursorTime: string }
  >(sql`SELECT e.id,e.kind,e.changes,e.body,e.created_at AS "createdAt",to_char(e.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "cursorTime",
    jsonb_build_object('id',u.id,'name',u.name,'image',u.image) AS actor
    FROM prospect_followup_events e JOIN users u ON u.id=e.actor_id
    WHERE e.prospect_id=${prospectId}::uuid ${cursor ? sql`AND (e.created_at,e.id)<(${cursor.createdAt}::timestamptz,${cursor.id}::uuid)` : sql``}
    ORDER BY e.created_at DESC,e.id DESC LIMIT 21`);
  const entries = rows
    .slice(0, 20)
    .map(({ cursorTime: _, ...r }) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() }));
  const last = rows[19];
  return {
    entries,
    nextCursor: rows.length > 20 && last ? { createdAt: last.cursorTime, id: last.id } : null,
  };
}
export async function setCrmStage(
  input: WriteScope & { stage: CrmStage; version: number; beforeLabel: string; afterLabel: string },
) {
  const [row] = await query<{ version: number }>(sql`WITH previous AS (
    SELECT f.* FROM prospect_followups f JOIN research_prospects p ON p.id=f.prospect_id
    WHERE p.id=${input.prospectId}::uuid AND p.project_id=${input.projectId}::uuid AND p.active=true AND ${favorite(input)}
  ), updated AS (
    UPDATE prospect_followups f SET stage=${input.stage}::prospect_crm_stage,version=f.version+1,updated_by=${input.actorId}::uuid,updated_at=now()
    FROM previous WHERE f.prospect_id=previous.prospect_id AND f.version=${input.version}
    RETURNING f.*
  ), event AS (
    INSERT INTO prospect_followup_events(id,prospect_id,actor_id,kind,changes,snapshot)
    SELECT ${v7()}::uuid,prospect_id,${input.actorId}::uuid,'stage_changed',
      jsonb_build_array(jsonb_build_object('field','stage','before',${input.beforeLabel}::text,'after',${input.afterLabel}::text)),
      jsonb_build_object('stage',stage,'version',version) FROM updated
  ) SELECT version FROM updated`);
  return row ?? null;
}
export async function insertCrmComment(input: WriteScope & { body: string }) {
  const [row] = await query<{
    id: string;
  }>(sql`INSERT INTO prospect_followup_events(id,prospect_id,actor_id,kind,body,snapshot)
    SELECT ${v7()}::uuid,f.prospect_id,${input.actorId}::uuid,'comment',${input.body},jsonb_build_object('stage',f.stage,'version',f.version)
    FROM prospect_followups f JOIN research_prospects p ON p.id=f.prospect_id
    WHERE p.id=${input.prospectId}::uuid AND p.project_id=${input.projectId}::uuid AND p.active=true AND ${favorite(input)} RETURNING id`);
  return row ?? null;
}
export async function crmAttachments(prospectId: string, page: number) {
  const [count] = await query<{ total: number }>(
    sql`SELECT count(*)::int AS total FROM prospect_attachments WHERE prospect_id=${prospectId}::uuid AND status='ready'`,
  );
  const pages = Math.max(1, Math.ceil(count.total / 12));
  const current = Math.min(page, pages);
  const items =
    await query<CrmAttachment>(sql`SELECT a.id,a.name,a.content_type AS "contentType",a.size,a.created_at AS "createdAt",u.name AS "uploadedBy"
    FROM prospect_attachments a JOIN users u ON u.id=a.uploaded_by WHERE a.prospect_id=${prospectId}::uuid AND a.status='ready'
    ORDER BY a.created_at DESC,a.id DESC LIMIT 12 OFFSET ${(current - 1) * 12}`);
  return {
    items: items.map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() })),
    total: count.total,
    page: current,
    pages,
  };
}
export async function reserveCrmAttachment(
  input: WriteScope & {
    id: string;
    name: string;
    contentType: string;
    size: number;
    storageProvider: string;
    storageBucket: string;
    storagePath: string;
  },
) {
  const [row] = await query<{
    id: string;
  }>(sql`INSERT INTO prospect_attachments(id,prospect_id,uploaded_by,name,content_type,size,storage_provider,storage_bucket,storage_path,expires_at)
    SELECT ${input.id}::uuid,p.id,${input.actorId}::uuid,${input.name},${input.contentType},${input.size},${input.storageProvider},${input.storageBucket},${input.storagePath},now()+interval '2 hours'
    FROM research_prospects p JOIN prospect_followups f ON f.prospect_id=p.id
    WHERE p.id=${input.prospectId}::uuid AND p.project_id=${input.projectId}::uuid AND p.active=true AND ${favorite(input)} RETURNING id`);
  return row ?? null;
}
export type StoredAttachment = {
  id: string;
  name: string;
  size: number;
  contentType: string;
  storageProvider: string;
  storageBucket: string;
  storagePath: string;
  status: string;
  uploadedBy: string;
  expiresAt: string;
};
export async function findCrmAttachment(input: CrmScope & { attachmentId: string }) {
  const [row] =
    await query<StoredAttachment>(sql`SELECT a.id,a.name,a.size,a.content_type AS "contentType",a.storage_provider AS "storageProvider",a.storage_bucket AS "storageBucket",a.storage_path AS "storagePath",a.status,a.uploaded_by AS "uploadedBy",a.expires_at AS "expiresAt"
    FROM prospect_attachments a JOIN research_prospects p ON p.id=a.prospect_id WHERE a.id=${input.attachmentId}::uuid AND p.id=${input.prospectId}::uuid AND p.project_id=${input.projectId}::uuid AND p.active=true`);
  return row ?? null;
}
export async function completeCrmAttachment(
  input: WriteScope & { attachmentId: string; finalPath?: string },
) {
  const [row] = await query<{ id: string }>(sql`WITH uploaded AS (
    UPDATE prospect_attachments a SET status='ready',storage_path=COALESCE(${input.finalPath ?? null},a.storage_path) FROM research_prospects p
    WHERE a.id=${input.attachmentId}::uuid AND a.prospect_id=p.id AND p.id=${input.prospectId}::uuid AND p.project_id=${input.projectId}::uuid
    AND p.active=true AND a.uploaded_by=${input.actorId}::uuid AND a.status='pending' AND a.expires_at>now() AND ${favorite(input)} RETURNING a.*
  ), event AS (
    INSERT INTO prospect_followup_events(id,prospect_id,actor_id,kind,body,snapshot)
    SELECT ${v7()}::uuid,prospect_id,${input.actorId}::uuid,'attachment_added',name,jsonb_build_object('attachmentId',id,'name',name,'size',size,'contentType',content_type) FROM uploaded
  ) SELECT id FROM uploaded`);
  return row ?? null;
}
