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
      ? sql`INSERT INTO research_prospect_favorites(id,user_id,prospect_id) SELECT ${v7()}::uuid,${input.userId}::uuid,p.id FROM research_prospects p WHERE p.id=${input.prospectId}::uuid AND p.project_id=${input.projectId}::uuid AND p.active=true ON CONFLICT(user_id,prospect_id) DO UPDATE SET user_id=excluded.user_id RETURNING prospect_id AS id`
      : sql`WITH allowed AS(SELECT id FROM research_prospects WHERE id=${input.prospectId}::uuid AND project_id=${input.projectId}::uuid),removed AS(DELETE FROM research_prospect_favorites WHERE user_id=${input.userId}::uuid AND prospect_id IN(SELECT id FROM allowed) RETURNING id) SELECT id FROM allowed`,
  );
  return !!row;
}
