import "server-only";
import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { query } from "@/server/db/client";
export async function isProspectFavorite(userId: string, prospectId: string) {
  const [row] = await query<{ favorite: boolean }>(
    sql`SELECT EXISTS(SELECT 1 FROM research_prospect_favorites WHERE user_id=${userId}::uuid AND prospect_id=${prospectId}::uuid) AS favorite`,
  );
  return row.favorite;
}
export async function setProspectFavorite(input: {
  userId: string;
  projectId: string;
  prospectId: string;
  favorite: boolean;
}) {
  const [row] = await query<{ id: string }>(
    input.favorite
      ? sql`WITH saved AS (
        INSERT INTO research_prospect_favorites(id,user_id,prospect_id) SELECT ${v7()}::uuid,${input.userId}::uuid,p.id FROM research_prospects p WHERE p.id=${input.prospectId}::uuid AND p.project_id=${input.projectId}::uuid AND p.active=true ON CONFLICT(user_id,prospect_id) DO UPDATE SET user_id=excluded.user_id RETURNING prospect_id AS id
      ), opened AS (
        INSERT INTO prospect_followups(prospect_id,created_by,updated_by) SELECT id,${input.userId}::uuid,${input.userId}::uuid FROM saved ON CONFLICT(prospect_id) DO NOTHING RETURNING *
      ), event AS (
        INSERT INTO prospect_followup_events(id,prospect_id,actor_id,kind,snapshot) SELECT ${v7()}::uuid,prospect_id,${input.userId}::uuid,'created',jsonb_build_object('stage',stage,'version',version) FROM opened
      ) SELECT id FROM saved`
      : sql`WITH allowed AS(SELECT id FROM research_prospects WHERE id=${input.prospectId}::uuid AND project_id=${input.projectId}::uuid),removed AS(DELETE FROM research_prospect_favorites WHERE user_id=${input.userId}::uuid AND prospect_id IN(SELECT id FROM allowed) RETURNING id) SELECT id FROM allowed`,
  );
  return !!row;
}
