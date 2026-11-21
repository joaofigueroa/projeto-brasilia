import "server-only";
import { neon } from "@neondatabase/serverless";
import type { SQL } from "drizzle-orm";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzleLocal } from "drizzle-orm/pglite";
import * as schema from "./schema";

async function createDatabase() {
  if (process.env.BRASILIA_LOCAL_DATABASE) {
    if (process.env.NODE_ENV === "production")
      throw new Error("Local database is disabled in production. Configure DATABASE_URL for Neon.");
    const { PGlite } = await import("@electric-sql/pglite");
    const client = new PGlite(process.env.BRASILIA_LOCAL_DATABASE);
    await client.waitReady;
    const orm = drizzleLocal(client, { schema });
    return {
      orm,
      async query<T>(statement: SQL): Promise<T[]> {
        return (await orm.execute(statement)).rows as T[];
      },
      close: () => client.close(),
    };
  }
  if (!process.env.DATABASE_URL)
    throw new Error(
      "Missing DATABASE_URL. Configure a dedicated Neon database or run pnpm setup:local.",
    );
  const orm = drizzleNeon(neon(process.env.DATABASE_URL), { schema });
  return {
    orm,
    async query<T>(statement: SQL): Promise<T[]> {
      return (await orm.execute(statement)).rows as T[];
    },
    close: async () => {},
  };
}

type Database = Awaited<ReturnType<typeof createDatabase>>;
const globalDatabase = globalThis as typeof globalThis & { brasiliaDatabase?: Promise<Database> };
export function getDatabase() {
  globalDatabase.brasiliaDatabase ??= createDatabase();
  return globalDatabase.brasiliaDatabase;
}

export async function query<T>(statement: SQL) {
  return (await getDatabase()).query<T>(statement);
}

export async function closeDatabase() {
  if (globalDatabase.brasiliaDatabase) await (await globalDatabase.brasiliaDatabase).close();
  delete globalDatabase.brasiliaDatabase;
}
