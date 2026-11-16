import { describe, expect, it } from "vitest";
import type { MetaTable } from "./client";
import { planSchema } from "./plan";
import { SCHEMA, TABLE_NAMES } from "./schema";

/** Turns the desired schema into what Airtable would report after creating it. */
function asExisting(): MetaTable[] {
  return SCHEMA.map((spec, i) => ({
    id: `tbl${i}`,
    name: spec.name,
    fields: [
      ...spec.fields.map((f, j) => ({ id: `fld${i}_${j}`, name: f.name, type: f.type })),
      ...spec.links.map((l, j) => ({ id: `lnk${i}_${j}`, name: l.name, type: "multipleRecordLinks" })),
    ],
  }));
}

describe("schema", () => {
  it("defines the 12 tables from the spec, each with a text primary field called Name", () => {
    expect(SCHEMA.map((t) => t.name)).toEqual([...TABLE_NAMES]);
    expect(SCHEMA).toHaveLength(12);
    for (const table of SCHEMA) {
      expect(table.fields[0]).toMatchObject({ name: "Name", type: "singleLineText" });
    }
  });

  it("has no duplicate field names within a table", () => {
    for (const table of SCHEMA) {
      const names = [...table.fields.map((f) => f.name), ...table.links.map((l) => l.name)];
      expect(new Set(names).size, table.name).toBe(names.length);
    }
  });

  it("links only to tables that exist in the schema", () => {
    for (const table of SCHEMA) {
      for (const link of table.links) expect(TABLE_NAMES).toContain(link.to);
    }
  });

  it("includes the D-18 flags and the Provenance fields", () => {
    const props = SCHEMA.find((t) => t.name === "Properties")!.fields.map((f) => f.name);
    expect(props).toEqual(expect.arrayContaining(["Vacant Building", "Tax Delinquent", "Tax Delinquent Amount"]));
    const dp = SCHEMA.find((t) => t.name === "Data Points")!.fields.map((f) => f.name);
    expect(dp).toEqual(expect.arrayContaining(["Origin", "Collected At", "Period Start", "Period End", "Accuracy", "Reliability"]));
  });
});

describe("planSchema", () => {
  it("creates every table, then every link, for an empty base", () => {
    const plan = planSchema(SCHEMA, []);
    const tables = plan.steps.filter((s) => s.kind === "createTable");
    const links = plan.steps.filter((s) => s.kind === "createLink");
    expect(tables).toHaveLength(12);
    expect(links).toHaveLength(SCHEMA.reduce((n, t) => n + t.links.length, 0));
    // all tables before any link
    const lastTable = plan.steps.findLastIndex((s) => s.kind === "createTable");
    const firstLink = plan.steps.findIndex((s) => s.kind === "createLink");
    expect(lastTable).toBeLessThan(firstLink);
  });

  it("does nothing when the base already matches (safe to run twice)", () => {
    expect(planSchema(SCHEMA, asExisting())).toEqual({ steps: [], warnings: [] });
  });

  it("adds only the missing field", () => {
    const existing = asExisting();
    existing[0].fields = existing[0].fields.filter((f) => f.name !== "Flood Zone");
    const plan = planSchema(SCHEMA, existing);
    expect(plan.steps).toEqual([
      { kind: "createField", table: "Properties", field: { name: "Flood Zone", type: "singleLineText" } },
    ]);
  });

  it("warns about a changed field type but does not touch it", () => {
    const existing = asExisting();
    existing[0].fields.find((f) => f.name === "Units")!.type = "singleLineText";
    const plan = planSchema(SCHEMA, existing);
    expect(plan.steps).toEqual([]);
    expect(plan.warnings[0]).toMatch(/Properties\.Units/);
  });

  it("ignores extra fields, such as reverse links Airtable adds", () => {
    const existing = asExisting();
    existing[0].fields.push({ id: "fldX", name: "Listings", type: "multipleRecordLinks" });
    expect(planSchema(SCHEMA, existing).steps).toEqual([]);
  });
});
