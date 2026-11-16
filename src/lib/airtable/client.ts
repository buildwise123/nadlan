/**
 * Minimal Airtable Web API client.
 *
 * - Spaces requests to stay under Airtable's limit of 5 requests/second per base.
 * - On 429 waits 30 seconds (Airtable's documented penalty) and retries.
 * - On 5xx / network errors retries with exponential backoff.
 * - Never includes the token in errors or logs.
 * - Counts calls, so each sync run can record its API usage.
 *
 * Relative imports only: this file is also used by scripts run outside Next.js.
 */

const API = "https://api.airtable.com/v0";

export class AirtableError extends Error {
  constructor(
    public readonly status: number,
    public readonly type: string,
    message: string,
  ) {
    super(`Airtable ${status} ${type}: ${message}`);
    this.name = "AirtableError";
  }
}

export type AirtableRecord<F = Record<string, unknown>> = { id: string; createdTime?: string; fields: F };

export type ClientOptions = {
  token: string;
  fetchImpl?: typeof fetch;
  maxRequestsPerSecond?: number;
  maxRetries?: number;
  rateLimitWaitMs?: number;
  backoffBaseMs?: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export class AirtableClient {
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly minIntervalMs: number;
  private readonly maxRetries: number;
  private readonly rateLimitWaitMs: number;
  private readonly backoffBaseMs: number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly now: () => number;
  private nextSlot = 0;
  private queue: Promise<void> = Promise.resolve();
  callCount = 0;

  constructor(options: ClientOptions) {
    if (!options.token) throw new Error("Airtable token is required");
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.minIntervalMs = 1000 / (options.maxRequestsPerSecond ?? 5);
    this.maxRetries = options.maxRetries ?? 4;
    this.rateLimitWaitMs = options.rateLimitWaitMs ?? 30_000;
    this.backoffBaseMs = options.backoffBaseMs ?? 1_000;
    this.sleep = options.sleep ?? defaultSleep;
    this.now = options.now ?? Date.now;
  }

  /** Waits for this request's turn, keeping requests at least minIntervalMs apart. */
  private takeSlot(): Promise<void> {
    const turn = this.queue.then(async () => {
      const wait = this.nextSlot - this.now();
      if (wait > 0) await this.sleep(wait);
      this.nextSlot = Math.max(this.now(), this.nextSlot) + this.minIntervalMs;
    });
    this.queue = turn.catch(() => undefined);
    return turn;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      await this.takeSlot();
      this.callCount++;
      let response: Response;
      try {
        response = await this.fetchImpl(`${API}${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${this.token}`,
            ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
      } catch (error) {
        if (attempt >= this.maxRetries) {
          throw new AirtableError(0, "NETWORK_ERROR", (error as Error).message);
        }
        await this.sleep(this.backoffBaseMs * 2 ** attempt);
        continue;
      }

      if (response.ok) return (await response.json()) as T;

      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < this.maxRetries) {
        await this.sleep(response.status === 429 ? this.rateLimitWaitMs : this.backoffBaseMs * 2 ** attempt);
        continue;
      }

      let type = "UNKNOWN";
      let message = response.statusText;
      try {
        const data = (await response.json()) as { error?: string | { type?: string; message?: string } };
        if (typeof data.error === "string") type = data.error;
        else if (data.error) {
          type = data.error.type ?? type;
          message = data.error.message ?? message;
        }
      } catch {
        // body was not JSON; keep the status text
      }
      throw new AirtableError(response.status, type, message);
    }
  }

  // ---------- records ----------

  async listRecords<F = Record<string, unknown>>(
    baseId: string,
    table: string,
    query: { filterByFormula?: string; fields?: string[]; maxRecords?: number; pageSize?: number } = {},
  ): Promise<AirtableRecord<F>[]> {
    const records: AirtableRecord<F>[] = [];
    let offset: string | undefined;
    do {
      const params = new URLSearchParams();
      if (query.filterByFormula) params.set("filterByFormula", query.filterByFormula);
      if (query.maxRecords) params.set("maxRecords", String(query.maxRecords));
      params.set("pageSize", String(query.pageSize ?? 100));
      for (const field of query.fields ?? []) params.append("fields[]", field);
      if (offset) params.set("offset", offset);
      const page = await this.request<{ records: AirtableRecord<F>[]; offset?: string }>(
        "GET",
        `/${baseId}/${encodeURIComponent(table)}?${params.toString()}`,
      );
      records.push(...page.records);
      offset = page.offset;
    } while (offset && (!query.maxRecords || records.length < query.maxRecords));
    return records;
  }

  /** Creates records in batches of 10 (Airtable's per-request limit). */
  async createRecords<F = Record<string, unknown>>(baseId: string, table: string, fields: F[]): Promise<AirtableRecord<F>[]> {
    const created: AirtableRecord<F>[] = [];
    for (let i = 0; i < fields.length; i += 10) {
      const batch = fields.slice(i, i + 10).map((f) => ({ fields: f }));
      const result = await this.request<{ records: AirtableRecord<F>[] }>(
        "POST",
        `/${baseId}/${encodeURIComponent(table)}`,
        { records: batch, typecast: true },
      );
      created.push(...result.records);
    }
    return created;
  }

  /** Updates (merges) records in batches of 10. */
  async updateRecords<F = Record<string, unknown>>(
    baseId: string,
    table: string,
    updates: { id: string; fields: Partial<F> }[],
  ): Promise<AirtableRecord<F>[]> {
    const updated: AirtableRecord<F>[] = [];
    for (let i = 0; i < updates.length; i += 10) {
      const result = await this.request<{ records: AirtableRecord<F>[] }>(
        "PATCH",
        `/${baseId}/${encodeURIComponent(table)}`,
        { records: updates.slice(i, i + 10), typecast: true },
      );
      updated.push(...result.records);
    }
    return updated;
  }

  // ---------- schema (Metadata API) ----------

  listTables(baseId: string) {
    return this.request<{ tables: MetaTable[] }>("GET", `/meta/bases/${baseId}/tables`).then((r) => r.tables);
  }

  createBase(workspaceId: string, name: string, tables: NewTable[]) {
    return this.request<{ id: string; tables: MetaTable[] }>("POST", "/meta/bases", { workspaceId, name, tables });
  }

  createTable(baseId: string, table: NewTable) {
    return this.request<MetaTable>("POST", `/meta/bases/${baseId}/tables`, table);
  }

  createField(baseId: string, tableId: string, field: FieldSpec) {
    return this.request<MetaField>("POST", `/meta/bases/${baseId}/tables/${tableId}/fields`, field);
  }
}

export type FieldSpec = { name: string; type: string; description?: string; options?: Record<string, unknown> };
export type NewTable = { name: string; description?: string; fields: FieldSpec[] };
export type MetaField = { id: string; name: string; type: string; options?: Record<string, unknown> };
export type MetaTable = { id: string; name: string; primaryFieldId?: string; fields: MetaField[] };
