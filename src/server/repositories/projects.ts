import "server-only";
import { sql } from "drizzle-orm";
import { query } from "@/server/db/client";
import type { Project } from "@/types/domain";
import type { ProjectFields } from "@/validators/projects";

const columns = sql`id, name, slug, color, description, image, version`;
export function listProjects() {
  return query<Project>(sql`SELECT ${columns} FROM projects ORDER BY created_at, id`);
}
export async function insertProject(
  input: ProjectFields & {
    id: string;
    slug: string;
    color: string;
    actorId: string;
    tabs: { id: string; name: string; kind: string; position: number }[];
  },
) {
  const rows = await query<Project>(sql`
    WITH created_project AS (
      INSERT INTO projects (id,name,slug,description,color,image)
      SELECT ${input.id}::uuid,${input.name},${input.slug},${input.description},${input.color},${input.image || null}
      FROM users WHERE id=${input.actorId}::uuid AND role='admin'
      RETURNING *
    ), created_tabs AS (
      INSERT INTO analysis_tabs (id,project_id,name,kind,position)
      SELECT x.id,p.id,x.name,x.kind,x.position FROM created_project p CROSS JOIN
      jsonb_to_recordset(${JSON.stringify(input.tabs)}::jsonb) AS x(id uuid,name text,kind text,position int)
    ) SELECT ${columns} FROM created_project
  `);
  return rows[0] ?? null;
}
export async function updateProject(
  input: ProjectFields & { id: string; version: number; actorId: string },
) {
  const rows =
    await query<Project>(sql`UPDATE projects SET name=${input.name},description=${input.description},image=${input.image || null},version=version+1,updated_at=now()
    WHERE id=${input.id}::uuid AND version=${input.version} AND EXISTS(SELECT 1 FROM users WHERE id=${input.actorId}::uuid AND role='admin') RETURNING ${columns}`);
  return rows[0] ?? null;
}
