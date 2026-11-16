/**
 * Compares the desired schema with what exists in a base and lists the steps
 * to close the gap. Additive only: it never deletes or changes existing fields,
 * it only reports differences as warnings.
 */
import type { FieldSpec, MetaTable, NewTable } from "./client";
import type { TableSpec } from "./schema";

export type Step =
  | { kind: "createTable"; table: NewTable }
  | { kind: "createField"; table: string; field: FieldSpec }
  | { kind: "createLink"; table: string; field: string; to: string };

export type Plan = { steps: Step[]; warnings: string[] };

export function planSchema(desired: TableSpec[], existing: MetaTable[]): Plan {
  const steps: Step[] = [];
  const warnings: string[] = [];
  const byName = new Map(existing.map((t) => [t.name, t]));

  // Pass 1: tables and plain fields.
  for (const spec of desired) {
    const current = byName.get(spec.name);
    if (!current) {
      steps.push({ kind: "createTable", table: { name: spec.name, description: spec.description, fields: spec.fields } });
      continue;
    }
    const fields = new Map(current.fields.map((f) => [f.name, f]));
    for (const field of spec.fields) {
      const have = fields.get(field.name);
      if (!have) steps.push({ kind: "createField", table: spec.name, field });
      else if (have.type !== field.type) {
        warnings.push(`${spec.name}.${field.name}: type is ${have.type}, schema says ${field.type} (left unchanged)`);
      }
    }
  }

  // Pass 2: links, after every table exists.
  for (const spec of desired) {
    const current = byName.get(spec.name);
    const fields = new Map((current?.fields ?? []).map((f) => [f.name, f]));
    for (const link of spec.links) {
      const have = fields.get(link.name);
      if (!have) steps.push({ kind: "createLink", table: spec.name, field: link.name, to: link.to });
      else if (have.type !== "multipleRecordLinks") {
        warnings.push(`${spec.name}.${link.name}: type is ${have.type}, schema says a link to ${link.to} (left unchanged)`);
      }
    }
  }

  return { steps, warnings };
}

/** Summary used by the setup script and the tests: table name -> field names. */
export function describeTables(tables: MetaTable[]): Record<string, string[]> {
  return Object.fromEntries(tables.map((t) => [t.name, t.fields.map((f) => f.name)]));
}
