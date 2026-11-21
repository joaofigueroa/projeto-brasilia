import "server-only";
import { sql } from "drizzle-orm";
import { query } from "@/server/db/client";
import type { Project } from "@/types/domain";

export function listProjects() {
  return query<Project>(
    sql`SELECT id, name, slug, color, description FROM projects ORDER BY created_at, id`,
  );
}
