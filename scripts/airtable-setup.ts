/**
 * Creates or completes an Airtable base so it matches src/lib/airtable/schema.ts.
 *
 *   npm run airtable:setup -- --base nadlan        (uses AIRTABLE_BASE_ID)
 *   npm run airtable:setup -- --base nadlan-test   (uses AIRTABLE_TEST_BASE_ID)
 *   add --dry-run to only print the plan
 *
 * If the base id variable is empty, a new base is created in AIRTABLE_WORKSPACE_ID
 * and its id is printed, to be pasted into .env.local.
 * Additive only: never deletes or changes existing tables or fields.
 */
import { AirtableClient, type MetaTable } from "../src/lib/airtable/client";
import { planSchema } from "../src/lib/airtable/plan";
import { SCHEMA } from "../src/lib/airtable/schema";
import { airtableSetupEnv } from "../src/lib/env";
import { SyncRun } from "../src/lib/sync-runs";

const BASES = {
  nadlan: "AIRTABLE_BASE_ID",
  "nadlan-test": "AIRTABLE_TEST_BASE_ID",
} as const;
type BaseName = keyof typeof BASES;

function parseArgs(argv: string[]) {
  const i = argv.indexOf("--base");
  const base = (i >= 0 ? argv[i + 1] : "nadlan-test") as BaseName;
  if (!(base in BASES)) throw new Error(`--base must be one of: ${Object.keys(BASES).join(", ")}`);
  return { base, dryRun: argv.includes("--dry-run") };
}

async function main() {
  const { base, dryRun } = parseArgs(process.argv.slice(2));
  const env = airtableSetupEnv();
  const client = new AirtableClient({ token: env.AIRTABLE_TOKEN });
  const idVar = BASES[base];
  let baseId = process.env[idVar]?.trim() || "";

  if (!baseId) {
    const plan = planSchema(SCHEMA, []);
    console.log(`${idVar} is empty: a new base "${base}" will be created with ${SCHEMA.length} tables.`);
    if (dryRun) return printPlan(plan.steps.length, plan.warnings);
    const created = await client.createBase(
      env.AIRTABLE_WORKSPACE_ID,
      base,
      SCHEMA.map((t) => ({ name: t.name, description: t.description, fields: t.fields })),
    );
    baseId = created.id;
    console.log(`Created base ${base}: ${baseId}`);
    console.log(`>>> Put this in .env.local:  ${idVar}=${baseId}`);
  }

  let existing: MetaTable[] = await client.listTables(baseId);
  const plan = planSchema(SCHEMA, existing);
  if (dryRun) return printPlan(plan.steps.length, plan.warnings, plan.steps);

  const tableId = (name: string) => {
    const table = existing.find((t) => t.name === name);
    if (!table) throw new Error(`table not found after creation: ${name}`);
    return table.id;
  };

  for (const step of plan.steps) {
    if (step.kind === "createTable") {
      await client.createTable(baseId, step.table);
      existing = await client.listTables(baseId);
      console.log(`+ table ${step.table.name}`);
    } else if (step.kind === "createField") {
      await client.createField(baseId, tableId(step.table), step.field);
      console.log(`+ field ${step.table}.${step.field.name}`);
    } else {
      await client.createField(baseId, tableId(step.table), {
        name: step.field,
        type: "multipleRecordLinks",
        options: { linkedTableId: tableId(step.to) },
      });
      console.log(`+ link  ${step.table}.${step.field} -> ${step.to}`);
    }
  }
  for (const warning of plan.warnings) console.warn(`! ${warning}`);

  // Record this run in the base's own log.
  const run = await SyncRun.start(client, baseId, "airtable-setup", "Setup");
  run.counters.created = plan.steps.length;
  run.countCall("airtable", client.callCount);
  await run.finish();

  const final = await client.listTables(baseId);
  console.log(`Done. ${final.length} tables in ${base} (${baseId}). Airtable calls used: ${client.callCount}.`);
}

function printPlan(count: number, warnings: string[], steps?: unknown[]) {
  console.log(`Dry run: ${count} step(s) needed.`);
  if (steps) for (const s of steps) console.log(JSON.stringify(s));
  for (const w of warnings) console.warn(`! ${w}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
