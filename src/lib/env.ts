import { z } from "zod";

/**
 * Environment variables, validated lazily per feature.
 *
 * Each feature (auth, Airtable, ...) reads only the variables it needs, so a
 * missing RentCast key never blocks login. Errors name the missing variables
 * but never print their values.
 */

export class EnvError extends Error {
  constructor(public readonly variables: string[]) {
    super(
      `Missing or invalid environment variables: ${variables.join(", ")}. ` +
        "See .env.example for what each one is.",
    );
    this.name = "EnvError";
  }
}

type Source = Record<string, string | undefined>;

export function readEnv<S extends z.ZodObject>(schema: S, source: Source = process.env): z.infer<S> {
  // Treat empty strings as missing, so a blank line in .env.local fails loudly.
  const cleaned: Source = {};
  for (const key of Object.keys(schema.shape)) {
    const value = source[key];
    cleaned[key] = value === undefined || value.trim() === "" ? undefined : value.trim();
  }
  const result = schema.safeParse(cleaned);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => String(issue.path[0])))];
    throw new EnvError(names.sort());
  }
  return result.data;
}

export const authSchema = z.object({
  AUTH_GITHUB_ID: z.string().min(1),
  AUTH_GITHUB_SECRET: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(32),
  ALLOWED_GITHUB_USER_ID: z.string().regex(/^\d+$/, "numeric GitHub user id"),
});

export const airtableSchema = z.object({
  AIRTABLE_TOKEN: z.string().min(1),
  AIRTABLE_BASE_ID: z.string().regex(/^app[A-Za-z0-9]{14}$/, "Airtable base id (app...)"),
});

export const airtableSetupSchema = z.object({
  AIRTABLE_TOKEN: z.string().min(1),
  AIRTABLE_WORKSPACE_ID: z.string().regex(/^wsp[A-Za-z0-9]{14}$/, "Airtable workspace id (wsp...)"),
});

export const logSchema = z.object({
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export const authEnv = (source?: Source) => readEnv(authSchema, source);
export const airtableEnv = (source?: Source) => readEnv(airtableSchema, source);
export const airtableSetupEnv = (source?: Source) => readEnv(airtableSetupSchema, source);
export const logEnv = (source?: Source) => readEnv(logSchema, source);
