/**
 * Records every job run (import, enrichment, setup) in the "Sync Runs" table.
 * Vercel Hobby keeps runtime logs for one hour only, so this is the durable log.
 *
 * Status rule: no errors -> Success; errors but some records written -> Partial;
 * errors and nothing written -> Failed.
 */
import type { AirtableClient } from "./airtable/client";
import { maskSecrets } from "./logger";

export type JobType = "rentcast-import" | "enrichment" | "city-refresh" | "schools-import" | "airtable-setup" | "manual";
export type Trigger = "Apify Schedule" | "Manual" | "Setup";
export type RunStatus = "Success" | "Partial" | "Failed";

const MAX_ERRORS_STORED = 20;
const MAX_ERROR_LENGTH = 500;

export type RunCounters = { read: number; created: number; updated: number; skipped: number };

export function decideStatus(counters: RunCounters, errorCount: number): RunStatus {
  if (errorCount === 0) return "Success";
  return counters.created + counters.updated > 0 ? "Partial" : "Failed";
}

export function formatErrors(errors: string[]): string {
  const shown = errors.slice(0, MAX_ERRORS_STORED).map((e) => {
    const clean = maskSecrets(e);
    return clean.length > MAX_ERROR_LENGTH ? `${clean.slice(0, MAX_ERROR_LENGTH)}…` : clean;
  });
  const hidden = errors.length - shown.length;
  return hidden > 0 ? `${shown.join("\n")}\n(+${hidden} more)` : shown.join("\n");
}

export class SyncRun {
  readonly counters: RunCounters = { read: 0, created: 0, updated: 0, skipped: 0 };
  readonly errors: string[] = [];
  readonly calls: Record<string, number> = {};

  private constructor(
    private readonly client: AirtableClient,
    private readonly baseId: string,
    readonly recordId: string,
    private readonly now: () => Date,
  ) {}

  static async start(
    client: AirtableClient,
    baseId: string,
    jobType: JobType,
    trigger: Trigger,
    now: () => Date = () => new Date(),
  ): Promise<SyncRun> {
    const started = now();
    const [record] = await client.createRecords(baseId, "Sync Runs", [
      {
        Name: `${jobType} ${started.toISOString()}`,
        "Job Type": jobType,
        Trigger: trigger,
        "Started At": started.toISOString(),
        Status: "Running",
      },
    ]);
    return new SyncRun(client, baseId, record.id, now);
  }

  recordError(error: unknown) {
    this.errors.push(error instanceof Error ? error.message : String(error));
  }

  countCall(source: string, n = 1) {
    this.calls[source] = (this.calls[source] ?? 0) + n;
  }

  async finish(): Promise<RunStatus> {
    const status = decideStatus(this.counters, this.errors.length);
    await this.client.updateRecords(this.baseId, "Sync Runs", [
      {
        id: this.recordId,
        fields: {
          "Finished At": this.now().toISOString(),
          Status: status,
          "Records Read": this.counters.read,
          "Records Created": this.counters.created,
          "Records Updated": this.counters.updated,
          "Records Skipped": this.counters.skipped,
          "Error Count": this.errors.length,
          "Error Details": formatErrors(this.errors),
          "Calls Used": JSON.stringify(this.calls),
        },
      },
    ]);
    return status;
  }
}
