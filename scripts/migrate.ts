import "./environment";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { migrate as migrateLocal } from "drizzle-orm/pglite/migrator";
import { closeDatabase, getDatabase } from "../src/server/db/client";

export async function migrateDatabase() {
  const { orm } = await getDatabase();
  const config = { migrationsFolder: "./drizzle" };
  if (process.env.BRASILIA_LOCAL_DATABASE)
    await migrateLocal(orm as Parameters<typeof migrateLocal>[0], config);
  else await migrateNeon(orm as Parameters<typeof migrateNeon>[0], config);
}

if (process.argv[1]?.endsWith("/migrate.ts")) {
  try {
    await migrateDatabase();
    console.log("Migrations aplicadas.");
  } finally {
    await closeDatabase();
  }
}
