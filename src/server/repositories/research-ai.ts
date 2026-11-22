import "server-only";
import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { query } from "@/server/db/client";
export async function readResearchAiConnection(projectId: string) {
  const [row] = await query<{ encryptedKey: string; model: string; version: number }>(
    sql`SELECT encrypted_key AS "encryptedKey",model,version FROM research_ai_connections WHERE project_id=${projectId}::uuid`,
  );
  return row ?? null;
}
export function writeResearchAiConnection(input: {
  projectId: string;
  encryptedKey: string;
  model: string;
  actorId: string;
  version: number;
}) {
  if (input.version === 0)
    return query(
      sql`INSERT INTO research_ai_connections(id,project_id,encrypted_key,model,updated_by) SELECT ${v7()}::uuid,${input.projectId}::uuid,${input.encryptedKey},${input.model},${input.actorId}::uuid WHERE EXISTS(SELECT 1 FROM users WHERE id=${input.actorId}::uuid AND role='admin') ON CONFLICT DO NOTHING RETURNING id`,
    );
  return query(
    sql`UPDATE research_ai_connections SET encrypted_key=${input.encryptedKey},model=${input.model},updated_by=${input.actorId}::uuid,version=version+1,updated_at=now() WHERE project_id=${input.projectId}::uuid AND version=${input.version} AND EXISTS(SELECT 1 FROM users WHERE id=${input.actorId}::uuid AND role='admin') RETURNING id`,
  );
}
