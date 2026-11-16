import { describe, expect, it } from "vitest";
import type { AirtableClient } from "./airtable/client";
import { decideStatus, formatErrors, SyncRun } from "./sync-runs";

function fakeClient() {
  const created: Record<string, unknown>[] = [];
  const updated: { id: string; fields: Record<string, unknown> }[] = [];
  const client = {
    createRecords: async (_base: string, _table: string, rows: Record<string, unknown>[]) => {
      created.push(...rows);
      return rows.map((fields, i) => ({ id: `recRun${i}`, fields }));
    },
    updateRecords: async (_base: string, _table: string, rows: { id: string; fields: Record<string, unknown> }[]) => {
      updated.push(...rows);
      return rows;
    },
  } as unknown as AirtableClient;
  return { client, created, updated };
}

const fixedNow = () => new Date("2026-11-16T07:00:00.000Z");

describe("decideStatus", () => {
  it("follows the Success / Partial / Failed rule", () => {
    expect(decideStatus({ read: 5, created: 5, updated: 0, skipped: 0 }, 0)).toBe("Success");
    expect(decideStatus({ read: 5, created: 3, updated: 0, skipped: 0 }, 2)).toBe("Partial");
    expect(decideStatus({ read: 5, created: 0, updated: 0, skipped: 0 }, 1)).toBe("Failed");
  });
});

describe("formatErrors", () => {
  it("keeps the first 20 errors and says how many were left out", () => {
    const text = formatErrors(Array.from({ length: 23 }, (_, i) => `error ${i}`));
    expect(text.split("\n")).toHaveLength(21);
    expect(text).toContain("(+3 more)");
  });

  it("truncates very long messages", () => {
    expect(formatErrors(["x".repeat(800)]).length).toBeLessThan(510);
  });
});

describe("SyncRun", () => {
  it("opens a Running record, then closes it with counts, status and calls", async () => {
    const { client, created, updated } = fakeClient();
    const run = await SyncRun.start(client, "appX", "rentcast-import", "Manual", fixedNow);
    expect(created[0]).toMatchObject({ "Job Type": "rentcast-import", Status: "Running", Trigger: "Manual" });

    run.counters.read = 10;
    run.counters.created = 7;
    run.countCall("rentcast", 2);
    run.recordError(new Error("address not found: 123 Main St"));
    const status = await run.finish();

    expect(status).toBe("Partial");
    expect(updated[0].id).toBe(run.recordId);
    expect(updated[0].fields).toMatchObject({
      Status: "Partial",
      "Records Read": 10,
      "Records Created": 7,
      "Error Count": 1,
      "Calls Used": JSON.stringify({ rentcast: 2 }),
    });
    expect(updated[0].fields["Error Details"]).toContain("address not found");
  });
});
