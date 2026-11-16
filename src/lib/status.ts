import "server-only";
import { AirtableClient } from "./airtable/client";
import { TABLE_NAMES } from "./airtable/schema";
import { airtableSchema, authSchema, EnvError, readEnv } from "./env";

/**
 * System status for the "מצב מערכת" page and /api/status.
 * Reports which settings exist (by name only, never values) and whether
 * Airtable answers with the expected tables.
 */

export type Check = { name: string; ok: boolean; detail: string };

function envCheck(name: string, read: () => unknown): Check {
  try {
    read();
    return { name, ok: true, detail: "מוגדר" };
  } catch (error) {
    const missing = error instanceof EnvError ? error.variables.join(", ") : "שגיאה";
    return { name, ok: false, detail: `חסר: ${missing}` };
  }
}

export async function getStatus(): Promise<{ checks: Check[]; checkedAt: string }> {
  const checks: Check[] = [
    envCheck("הגדרות התחברות", () => readEnv(authSchema)),
    envCheck("הגדרות Airtable", () => readEnv(airtableSchema)),
  ];

  try {
    const env = readEnv(airtableSchema);
    const client = new AirtableClient({ token: env.AIRTABLE_TOKEN, maxRetries: 1 });
    const tables = await client.listTables(env.AIRTABLE_BASE_ID);
    const names = new Set(tables.map((t) => t.name));
    const missing = TABLE_NAMES.filter((t) => !names.has(t));
    checks.push({
      name: "חיבור ל-Airtable",
      ok: missing.length === 0,
      detail: missing.length === 0 ? `${tables.length} טבלאות` : `חסרות טבלאות: ${missing.join(", ")}`,
    });
  } catch (error) {
    checks.push({
      name: "חיבור ל-Airtable",
      ok: false,
      detail: error instanceof EnvError ? "לא נבדק: הגדרות חסרות" : (error as Error).message,
    });
  }

  return { checks, checkedAt: new Date().toISOString() };
}
