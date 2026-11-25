import "server-only";
import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { query } from "@/server/db/client";
import type { PublicUser, Role } from "@/types/domain";

const publicColumns = sql`id, name, email, role, image, job_title AS "jobTitle"`;

export async function findUserById(id: string) {
  const rows = await query<PublicUser>(
    sql`SELECT ${publicColumns} FROM users WHERE id = ${id}::uuid`,
  );
  return rows[0] ?? null;
}

export async function listUsers() {
  return query<PublicUser>(sql`SELECT ${publicColumns} FROM users ORDER BY name, id`);
}

export async function insertUser(input: {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  role: Role;
  passwordHash: string;
  image?: string | null;
}) {
  const accountId = v7();
  const rows = await query<PublicUser>(sql`
    WITH created_user AS (
      INSERT INTO users (id, name, email, job_title, role, image)
      VALUES (${input.id}::uuid, ${input.name}, ${input.email}, ${input.jobTitle}, ${input.role}::user_role, ${input.image ?? null})
      RETURNING *
    ), created_account AS (
      INSERT INTO accounts (id, user_id, account_id, provider_id, password)
      SELECT ${accountId}::uuid, id, id::text, 'credential', ${input.passwordHash} FROM created_user
    ) SELECT ${publicColumns} FROM created_user
  `);
  return rows[0];
}

export async function saveUserProfile(input: {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  image?: string;
  role?: Role;
  passwordHash?: string;
  revokeSessions: boolean;
}) {
  const rows = await query<PublicUser>(sql`
    WITH updated_user AS (
      UPDATE users SET name = ${input.name}, email = ${input.email}, job_title = ${input.jobTitle},
        image = CASE WHEN ${input.image !== undefined} THEN ${input.image || null} ELSE image END,
        role = CASE WHEN ${input.role !== undefined} THEN ${input.role ?? "collaborator"}::user_role ELSE role END,
        email_verified = CASE WHEN email != ${input.email} THEN false ELSE email_verified END, updated_at = now()
      WHERE id = ${input.id}::uuid RETURNING *
    ), updated_password AS (
      INSERT INTO accounts (id, user_id, account_id, provider_id, password)
      SELECT ${input.passwordHash ? v7() : null}::uuid, id, id::text, 'credential', ${input.passwordHash ?? null}
      FROM updated_user WHERE ${input.passwordHash !== undefined}
      ON CONFLICT (provider_id, account_id)
      DO UPDATE SET password = excluded.password, updated_at = now()
    ), revoked AS (
      DELETE FROM sessions WHERE user_id IN (SELECT id FROM updated_user) AND ${input.revokeSessions}
    ) SELECT ${publicColumns} FROM updated_user
  `);
  return rows[0] ?? null;
}

export async function consumeSensitiveAttempt(userId: string) {
  const now = Date.now();
  const rows = await query<{ count: number }>(sql`
    INSERT INTO rate_limits (id, key, count, last_request)
    VALUES (${v7()}::uuid, ${`sensitive:${userId}`}, 1, ${now})
    ON CONFLICT (key) DO UPDATE SET count = CASE WHEN rate_limits.last_request < ${now - 60000} THEN 1 ELSE rate_limits.count + 1 END,
    last_request = ${now} RETURNING count
  `);
  return rows[0].count <= 5;
}
