import "server-only";
import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { statusLabels } from "@/libs/presentation";
import { query } from "@/server/db/client";
import type { Change, Task, TaskHistory, TaskHistoryCursor, TaskStatus } from "@/types/domain";
import type { TaskFields } from "@/validators";

export type StoredTask = Omit<Task, "canEdit" | "canMove">;
const taskColumns = sql`t.id, t.title, t.description, t.status, t.priority, t.week_start::text AS "weekStart",
  t.due_date::text AS "dueDate", t.project_id AS "projectId", t.administrator_id AS "administratorId", t.created_by AS "createdBy",
  t.version, t.created_at::text AS "createdAt", t.updated_at::text AS "updatedAt",
  COALESCE((SELECT jsonb_agg(a.user_id ORDER BY a.user_id) FROM task_assignees a WHERE a.task_id = t.id), '[]'::jsonb) AS "assigneeIds"`;

export function listTasks(input: { week: string; project?: string; assignee?: string; q: string }) {
  return query<StoredTask>(sql`SELECT ${taskColumns} FROM tasks t
    WHERE t.deleted_at IS NULL AND t.week_start = ${input.week}::date
      ${input.project ? sql`AND t.project_id = ${input.project}::uuid` : sql``}
      ${input.assignee ? sql`AND EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = t.id AND a.user_id = ${input.assignee}::uuid)` : sql``}
      ${input.q ? sql`AND (position(lower(${input.q}) IN lower(t.title)) > 0 OR position(lower(${input.q}) IN lower(t.description)) > 0)` : sql``}
    ORDER BY CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, t.created_at, t.id`);
}

export async function findTask(id: string) {
  const rows = await query<StoredTask>(
    sql`SELECT ${taskColumns} FROM tasks t WHERE t.id = ${id}::uuid AND t.deleted_at IS NULL`,
  );
  return rows[0] ?? null;
}

export const taskHistoryPageSize = 50;
export function listTaskHistory(taskId: string, cursor?: TaskHistoryCursor) {
  return query<TaskHistory>(sql`
    SELECT e.id, e.kind, to_char(e.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS "createdAt", e.changes,
      CASE WHEN e.kind = 'attachment_added' THEN e.snapshot ELSE NULL END AS attachment,
      jsonb_build_object('id', u.id, 'name', u.name, 'image', u.image) AS actor
    FROM task_events e JOIN users u ON u.id = e.actor_id
    WHERE e.task_id = ${taskId}::uuid
    ${cursor ? sql`AND (e.created_at, e.id) < (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)` : sql``}
    ORDER BY e.created_at DESC, e.id DESC LIMIT ${taskHistoryPageSize}
  `);
}

function memberships(assigneeIds: string[]) {
  return JSON.stringify(assigneeIds.map((userId) => ({ id: v7(), user_id: userId })));
}

export async function insertTask(
  input: TaskFields & { id: string; actorId: string; changes: Change[] },
) {
  const rows = await query<{ id: string }>(sql`
    WITH created AS (
      INSERT INTO tasks (id, project_id, administrator_id, created_by, title, description, status, priority, week_start, due_date)
      VALUES (${input.id}::uuid, ${input.projectId}::uuid, ${input.administratorId}::uuid, ${input.actorId}::uuid,
        ${input.title}, ${input.description}, ${input.status}::task_status, ${input.priority}::task_priority, ${input.weekStart}::date, ${input.dueDate}::date)
      RETURNING *
    ), assigned AS (
      INSERT INTO task_assignees (id, task_id, user_id)
      SELECT m.id, c.id, m.user_id FROM created c CROSS JOIN jsonb_to_recordset(${memberships(input.assigneeIds)}::jsonb) AS m(id uuid, user_id uuid)
    ), audited AS (
      INSERT INTO task_events (id, task_id, actor_id, kind, changes, snapshot)
      SELECT ${v7()}::uuid, c.id, ${input.actorId}::uuid, 'created', ${JSON.stringify(input.changes)}::jsonb,
        to_jsonb(c) || jsonb_build_object('assignee_ids', ${JSON.stringify(input.assigneeIds)}::jsonb) FROM created c
    ) SELECT id FROM created
  `);
  return rows[0].id;
}

export async function saveTask(
  input: TaskFields & {
    id: string;
    actorId: string;
    version: number;
    changes: Change[];
    kind: "updated" | "moved";
  },
) {
  const rows = await query<{ id: string }>(sql`
    WITH updated AS (
      UPDATE tasks t SET title = ${input.title}, description = ${input.description}, status = ${input.status}::task_status,
        priority = ${input.priority}::task_priority, project_id = ${input.projectId}::uuid, administrator_id = ${input.administratorId}::uuid,
        week_start = ${input.weekStart}::date, due_date = ${input.dueDate}::date, version = version + 1, updated_at = now()
      WHERE t.id = ${input.id}::uuid AND t.version = ${input.version} AND t.deleted_at IS NULL
        AND (t.administrator_id = ${input.actorId}::uuid OR EXISTS (SELECT 1 FROM users WHERE id = ${input.actorId}::uuid AND role = 'admin')
          OR (${input.kind === "moved"} AND EXISTS (SELECT 1 FROM task_assignees WHERE task_id = t.id AND user_id = ${input.actorId}::uuid)))
      RETURNING *
    ), removed AS (
      DELETE FROM task_assignees WHERE task_id IN (SELECT id FROM updated)
      AND user_id NOT IN (SELECT value::uuid FROM jsonb_array_elements_text(${JSON.stringify(input.assigneeIds)}::jsonb))
    ), assigned AS (
      INSERT INTO task_assignees (id, task_id, user_id)
      SELECT m.id, u.id, m.user_id FROM updated u CROSS JOIN jsonb_to_recordset(${memberships(input.assigneeIds)}::jsonb) AS m(id uuid, user_id uuid)
      WHERE NOT EXISTS (SELECT 1 FROM task_assignees a WHERE a.task_id = u.id AND a.user_id = m.user_id)
    ), audited AS (
      INSERT INTO task_events (id, task_id, actor_id, kind, changes, snapshot)
      SELECT ${v7()}::uuid, u.id, ${input.actorId}::uuid, ${input.kind}, ${JSON.stringify(input.changes)}::jsonb,
        to_jsonb(u) || jsonb_build_object('assignee_ids', ${JSON.stringify(input.assigneeIds)}::jsonb) FROM updated u
    ) SELECT id FROM updated
  `);
  return rows[0]?.id ?? null;
}

export async function softDeleteTask(input: { id: string; version: number; actorId: string }) {
  const rows = await query<{ id: string }>(sql`
  WITH deleted AS (
    UPDATE tasks t SET deleted_at=now(),updated_at=now(),version=version+1
    WHERE t.id=${input.id}::uuid AND t.version=${input.version} AND t.deleted_at IS NULL
      AND (t.administrator_id=${input.actorId}::uuid OR EXISTS(SELECT 1 FROM users WHERE id=${input.actorId}::uuid AND role='admin'))
    RETURNING *
  ), audited AS (
    INSERT INTO task_events (id,task_id,actor_id,kind,changes,snapshot)
    SELECT ${v7()}::uuid,d.id,${input.actorId}::uuid,'deleted',
      '[{"field":"availability","before":"Disponível no quadro","after":"Excluída"}]'::jsonb,
      to_jsonb(d)||jsonb_build_object('assignee_ids',COALESCE((SELECT jsonb_agg(a.user_id ORDER BY a.user_id) FROM task_assignees a WHERE a.task_id=d.id),'[]'::jsonb))
    FROM deleted d
  ) SELECT id FROM deleted
 `);
  return rows[0]?.id ?? null;
}

export async function mutateTasksInBulk(
  input: {
    tasks: { id: string; version: number }[];
    actorId: string;
  } & (
    | { operation: "delete" }
    | { operation: "week"; weekStart: string }
    | { operation: "status"; status: TaskStatus }
  ),
) {
  const update =
    input.operation === "delete"
      ? sql`deleted_at=now()`
      : input.operation === "week"
        ? sql`week_start=${input.weekStart}::date`
        : sql`status=${input.status}::task_status`;
  const changed =
    input.operation === "delete"
      ? sql`true`
      : input.operation === "week"
        ? sql`t.week_start IS DISTINCT FROM ${input.weekStart}::date`
        : sql`t.status IS DISTINCT FROM ${input.status}::task_status`;
  const changes =
    input.operation === "delete"
      ? sql`'[{"field":"availability","before":"Disponível no quadro","after":"Excluída"}]'::jsonb`
      : input.operation === "week"
        ? sql`jsonb_build_array(jsonb_build_object('field','weekStart','before',e.week_start::text,'after',u.week_start::text))`
        : sql`jsonb_build_array(jsonb_build_object('field','status',
          'before',${JSON.stringify(statusLabels)}::jsonb ->> e.status::text,
          'after',${JSON.stringify(statusLabels)}::jsonb ->> u.status::text))`;
  const kind =
    input.operation === "delete" ? "deleted" : input.operation === "status" ? "moved" : "updated";
  const requested = input.tasks.map((task) => ({ ...task, event_id: v7() }));
  const [result] = await query<{ matched: number; changed: number }>(sql`
    WITH requested AS MATERIALIZED (
      SELECT * FROM jsonb_to_recordset(${JSON.stringify(requested)}::jsonb)
        AS r(id uuid, version integer, event_id uuid)
    ), locked AS MATERIALIZED (
      SELECT t.*, r.version AS expected_version, r.event_id
      FROM tasks t JOIN requested r ON r.id=t.id
      ORDER BY t.id FOR UPDATE OF t
    ), eligible AS MATERIALIZED (
      SELECT l.* FROM locked l
      WHERE l.deleted_at IS NULL AND l.version=l.expected_version
        AND (l.administrator_id=${input.actorId}::uuid
          OR EXISTS(SELECT 1 FROM users WHERE id=${input.actorId}::uuid AND role='admin'))
    ), updated AS (
      UPDATE tasks t SET
        ${update},
        version=t.version+1,updated_at=now()
      FROM eligible e
      WHERE t.id=e.id AND t.version=e.version
        AND (SELECT count(*) FROM eligible)=${input.tasks.length}
        AND (${changed})
      RETURNING t.*
    ), audited AS (
      INSERT INTO task_events(id,task_id,actor_id,kind,changes,snapshot)
      SELECT e.event_id,u.id,${input.actorId}::uuid,${kind},${changes},
        to_jsonb(u)||jsonb_build_object('assignee_ids',COALESCE((SELECT jsonb_agg(a.user_id ORDER BY a.user_id)
          FROM task_assignees a WHERE a.task_id=u.id),'[]'::jsonb))
      FROM updated u JOIN eligible e ON e.id=u.id
    ) SELECT (SELECT count(*)::int FROM eligible) AS matched,(SELECT count(*)::int FROM updated) AS changed
  `);
  return result;
}
