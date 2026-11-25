import "server-only";
import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { paginationRange } from "@/libs/pagination";
import { query } from "@/server/db/client";
import type { AttachmentScope, TaskAttachment } from "@/types/domain";

type WriteScope = { scope: AttachmentScope; actorId: string };
type StoredAttachment = TaskAttachment & {
  uploadedBy: string;
  contentType: string;
  status: "pending" | "ready";
  storageBucket: string;
  storagePath: string;
  expiresAt: string;
};

function permittedOwner({ scope, actorId }: WriteScope) {
  if (scope.kind === "project")
    return sql`SELECT p.id FROM projects p JOIN users u ON u.id=${actorId}::uuid AND u.role='admin'
      WHERE p.id=${scope.id}::uuid`;
  return sql`SELECT t.id FROM tasks t JOIN users u ON u.id=${actorId}::uuid
    WHERE t.id=${scope.id}::uuid AND t.deleted_at IS NULL
      AND (u.role='admin' OR t.administrator_id=u.id OR EXISTS (
        SELECT 1 FROM task_assignees ta WHERE ta.task_id=t.id AND ta.user_id=u.id
      ))
    FOR UPDATE OF t`;
}

export async function reserveWorkspaceAttachment(
  input: WriteScope & { folderId: string | null } & Pick<
      StoredAttachment,
      "id" | "name" | "size" | "contentType" | "storageBucket" | "storagePath"
    >,
) {
  const { scope, actorId } = input;
  const rows = await query<{ id: string }>(sql`
    WITH permitted AS (${permittedOwner(input)})
    INSERT INTO workspace_attachments(id, task_id, project_id, folder_id, uploaded_by, name, content_type,
      size, storage_bucket, storage_path, expires_at)
    SELECT ${input.id}::uuid, ${scope.kind === "task" ? scope.id : null}::uuid,
      ${scope.kind === "project" ? scope.id : null}::uuid, ${input.folderId}::uuid,
      ${actorId}::uuid, ${input.name}, ${input.contentType},
      ${input.size}, ${input.storageBucket}, ${input.storagePath}, now() + interval '2 hours'
    FROM permitted
    WHERE ${allowedFolder(scope.kind === "project" ? scope.id : null, input.folderId)}
    RETURNING id
  `);
  return rows[0] ?? null;
}

function attachmentOwner(scope: AttachmentScope) {
  return scope.kind === "task"
    ? sql`t.id=${scope.id}::uuid AND t.deleted_at IS NULL`
    : sql`(a.project_id=${scope.id}::uuid OR (t.project_id=${scope.id}::uuid AND t.deleted_at IS NULL))`;
}

export async function findWorkspaceAttachment(scope: AttachmentScope, id: string) {
  const rows = await query<StoredAttachment>(sql`
    SELECT a.id, a.name, a.size, a.status, a.content_type AS "contentType", a.uploaded_by AS "uploadedBy",
      a.storage_bucket AS "storageBucket", a.storage_path AS "storagePath", a.expires_at::text AS "expiresAt"
    FROM workspace_attachments a LEFT JOIN tasks t ON t.id=a.task_id
    WHERE a.id=${id}::uuid AND ${attachmentOwner(scope)}
  `);
  return rows[0] ?? null;
}

export async function completeWorkspaceAttachment(
  input: WriteScope & { attachmentId: string; path: string },
) {
  const ownerColumn = input.scope.kind === "task" ? sql`a.task_id` : sql`a.project_id`;
  const rows = await query<{ id: string }>(sql`
    WITH permitted AS (${permittedOwner(input)}), confirmed AS (
      UPDATE workspace_attachments a SET status='ready', storage_path=${input.path}
      FROM permitted p
      WHERE a.id=${input.attachmentId}::uuid AND ${ownerColumn}=p.id
        AND a.uploaded_by=${input.actorId}::uuid AND a.status='pending' AND a.expires_at>now()
      RETURNING a.id, a.task_id, a.name, a.size
    ), event AS (
      INSERT INTO task_events (id, task_id, actor_id, kind, snapshot)
      SELECT ${v7()}::uuid, task_id, ${input.actorId}::uuid, 'attachment_added',
        jsonb_build_object('id', id, 'name', name, 'size', size)
      FROM confirmed WHERE task_id IS NOT NULL
    )
    SELECT id FROM confirmed
  `);
  return rows[0] ?? null;
}

function allowedFolder(projectId: string | null, folderId: string | null) {
  return folderId === null
    ? sql`TRUE`
    : sql`EXISTS (SELECT 1 FROM project_file_folders f
      WHERE f.id=${folderId}::uuid AND f.project_id=${projectId}::uuid)`;
}

export function listProjectFileFolders(projectId: string) {
  return query<{ id: string; name: string }>(sql`
    SELECT id, name FROM project_file_folders WHERE project_id=${projectId}::uuid
    ORDER BY lower(name), id
  `);
}

export async function insertProjectFileFolder(input: {
  projectId: string;
  actorId: string;
  name: string;
}) {
  const [result] = await query<{ id: string | null; allowed: boolean }>(sql`
    WITH permitted AS (${permittedOwner({ scope: { kind: "project", id: input.projectId }, actorId: input.actorId })}),
    inserted AS (
      INSERT INTO project_file_folders (id, project_id, name)
      SELECT ${v7()}::uuid, id, ${input.name} FROM permitted
      ON CONFLICT (project_id, lower(name)) DO NOTHING RETURNING id
    )
    SELECT (SELECT id FROM inserted) AS id, EXISTS (SELECT 1 FROM permitted) AS allowed
  `);
  return result;
}

export async function moveProjectAttachment(input: {
  projectId: string;
  actorId: string;
  attachmentId: string;
  sourceFolderId: string | null;
  folderId: string | null;
}) {
  const { projectId, actorId, attachmentId, sourceFolderId, folderId } = input;
  const rows = await query<{ id: string }>(sql`
    WITH permitted AS (${permittedOwner({ scope: { kind: "project", id: projectId }, actorId })}),
    locked_task AS MATERIALIZED (
      SELECT t.id FROM tasks t
      JOIN workspace_attachments a ON a.task_id=t.id AND a.id=${attachmentId}::uuid
      JOIN permitted p ON p.id=t.project_id
      WHERE t.deleted_at IS NULL AND a.status='ready'
      FOR UPDATE OF t
    )
    UPDATE workspace_attachments a SET folder_id=${folderId}::uuid
    FROM permitted p
    WHERE a.id=${attachmentId}::uuid AND a.status='ready'
      AND (a.project_id=p.id OR a.task_id IN (SELECT id FROM locked_task))
      AND a.folder_id IS NOT DISTINCT FROM ${sourceFolderId}::uuid
      AND ${allowedFolder(projectId, folderId)}
    RETURNING a.id
  `);
  return rows[0] ?? null;
}

export async function listProjectFiles(
  projectId: string,
  folderId: string | null,
  page: number,
  pageSize: number,
) {
  const files = sql`FROM workspace_attachments a LEFT JOIN tasks t ON t.id=a.task_id
    WHERE ${attachmentOwner({ kind: "project", id: projectId })} AND a.status='ready'
      AND ${folderId ? sql`a.folder_id=${folderId}::uuid` : sql`a.folder_id IS NULL`}`;
  const [count] = await query<{ total: number }>(sql`SELECT count(*)::int AS total ${files}`);
  const pagination = paginationRange(count.total, page, pageSize);
  const items = await query<TaskAttachment & { taskTitle: string | null; createdAt: string }>(sql`
    SELECT a.id, a.name, a.size, t.title AS "taskTitle", a.created_at::text AS "createdAt"
    ${files} ORDER BY a.created_at DESC, a.id DESC LIMIT ${pagination.pageSize} OFFSET ${pagination.offset}
  `);
  return { pagination, items };
}
