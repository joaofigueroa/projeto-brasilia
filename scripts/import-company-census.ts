import "./environment";
import { readFile } from "node:fs/promises";
import { sql } from "drizzle-orm";
import { v7 } from "uuid";
import { z } from "zod";
import { buildCensusProfile, censusCities } from "../src/libs/company-census";
import { closeDatabase, query } from "../src/server/db/client";
import * as repository from "../src/server/repositories/commercial-research";
import { researchProspectSchema } from "../src/validators/commercial-research";
import { migrateDatabase } from "./migrate";

const args = process.argv.slice(2);
const filename = args.find((arg) => !arg.startsWith("--"));
if (!filename)
  throw new Error("Provide the extracted companies.json path. Add --apply to persist it.");
const data = z
  .object({
    dataset: z
      .string()
      .regex(/^(ArthurKrieger|cnpjaberto)\/cnpj-dados-receita-brasil-\d{4}-\d{2}$/),
    month: z.string().regex(/^\d{4}-\d{2}$/),
    rows: z.array(z.record(z.string(), z.string().nullable())).max(100000),
  })
  .parse(JSON.parse(await readFile(filename, "utf8")));
const curated = repository.readCommercialResearch();
const profiles = data.rows.map((row) =>
  researchProspectSchema.parse(
    buildCensusProfile(
      row,
      row,
      data.dataset,
      data.month,
      curated.prospects.find(
        (profile) => profile.registry?.cnpj === `${row.cnpj_basico}${row.cnpj_ordem}${row.cnpj_dv}`,
      ),
    ),
  ),
);
if (new Set(profiles.map((profile) => profile.registry?.cnpj)).size !== profiles.length)
  throw new Error("Duplicate CNPJ in source.");
console.log(
  "Validated complete extraction:",
  JSON.stringify(
    censusCities.map((city) => ({
      city: city.name,
      count: profiles.filter((profile) => profile.cityCode === city.code).length,
    })),
  ),
);
if (args.includes("--apply")) {
  try {
    await migrateDatabase();
    const [actor] = await query<{ id: string }>(
      sql`SELECT id FROM users WHERE role='admin' ORDER BY created_at,id LIMIT 1`,
    );
    if (!actor) throw new Error("Create an administrator before importing the census.");
    for (const city of censusCities) {
      const scoped = profiles.filter((profile) => profile.cityCode === city.code);
      const previous = (await repository.listResearchRuns(curated.projectId, [city.code])).find(
        (run) => run.kind === "census",
      );
      if (
        previous?.status === "completed" &&
        previous.source === data.dataset &&
        previous.cursor === scoped.length
      ) {
        console.log(`${city.name}: already imported.`);
        continue;
      }
      let run =
        previous &&
        ["pending", "running"].includes(previous.status) &&
        previous.source === data.dataset
          ? previous
          : await repository.createResearchRun({
              projectId: curated.projectId,
              cityCode: city.code,
              kind: "census",
              actorId: actor.id,
              source: data.dataset,
              sourceMonth: data.month,
            });
      if (!run) throw new Error("Another census update is active.");
      await query(
        sql`UPDATE research_runs SET total=${scoped.length},source_month=${data.month} WHERE id=${run.id}::uuid`,
      );
      for (let offset = run.cursor; offset < scoped.length; offset += 500) {
        const token = v7();
        const claimed = await repository.claimResearchRun(curated.projectId, run.id, token);
        if (!claimed)
          throw new Error("Census lease is owned by another worker. Retry after it finishes.");
        const batch = scoped.slice(offset, offset + 500);
        await repository.upsertCensusBatch(claimed, token, batch, actor.id, batch.length);
        if ((offset + 500) % 2500 === 0 || offset + 500 >= scoped.length)
          console.log(`${city.name}: ${Math.min(scoped.length, offset + 500)} / ${scoped.length}`);
      }
      run = await repository.findResearchRun(curated.projectId, run.id);
      if (run?.status !== "completed" || run.cursor !== scoped.length)
        throw new Error("The source was not fully imported.");
      await repository.archiveMissingCensusProfiles(run);
    }
  } finally {
    await closeDatabase();
  }
} else console.log("Dry run only. No database changes.");
