import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw/http";
import { setupServer } from "msw/node";
import { AirtableClient, AirtableError } from "./client";

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const BASE = "appTESTTESTTEST01";
const URL_ = `https://api.airtable.com/v0/${BASE}/Properties`;

function makeClient(sleeps: number[] = [], clock = { t: 0 }) {
  return new AirtableClient({
    token: "patSECRET123456789",
    sleep: async (ms) => {
      sleeps.push(ms);
      clock.t += ms;
    },
    now: () => clock.t,
    backoffBaseMs: 100,
    rateLimitWaitMs: 30_000,
  });
}

describe("AirtableClient", () => {
  it("sends the token and follows pagination", async () => {
    const auth: (string | null)[] = [];
    server.use(
      http.get(URL_, ({ request }) => {
        auth.push(request.headers.get("authorization"));
        const offset = new URL(request.url).searchParams.get("offset");
        return offset
          ? HttpResponse.json({ records: [{ id: "rec2", fields: {} }] })
          : HttpResponse.json({ records: [{ id: "rec1", fields: {} }], offset: "page2" });
      }),
    );
    const records = await makeClient().listRecords(BASE, "Properties");
    expect(records.map((r) => r.id)).toEqual(["rec1", "rec2"]);
    expect(auth).toEqual(["Bearer patSECRET123456789", "Bearer patSECRET123456789"]);
  });

  it("creates records in batches of 10", async () => {
    const sizes: number[] = [];
    server.use(
      http.post(URL_, async ({ request }) => {
        const body = (await request.json()) as { records: unknown[] };
        sizes.push(body.records.length);
        return HttpResponse.json({ records: body.records.map((_, i) => ({ id: `rec${i}`, fields: {} })) });
      }),
    );
    const created = await makeClient().createRecords(BASE, "Properties", Array.from({ length: 25 }, (_, i) => ({ n: i })));
    expect(sizes).toEqual([10, 10, 5]);
    expect(created).toHaveLength(25);
  });

  it("waits 30 seconds after a 429 and retries", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls++;
        return calls === 1
          ? HttpResponse.json({ errors: [{ error: "RATE_LIMIT_REACHED" }] }, { status: 429 })
          : HttpResponse.json({ records: [] });
      }),
    );
    const sleeps: number[] = [];
    await makeClient(sleeps).listRecords(BASE, "Properties");
    expect(calls).toBe(2);
    expect(sleeps).toContain(30_000);
  });

  it("gives up after the retry limit on server errors", async () => {
    let calls = 0;
    server.use(
      http.get(URL_, () => {
        calls++;
        return new HttpResponse("oops", { status: 503 });
      }),
    );
    await expect(makeClient().listRecords(BASE, "Properties")).rejects.toBeInstanceOf(AirtableError);
    expect(calls).toBe(5); // first try + 4 retries
  });

  it("reports Airtable's error type and never the token", async () => {
    server.use(
      http.post(URL_, () =>
        HttpResponse.json(
          { error: { type: "INVALID_VALUE_FOR_COLUMN", message: "Field Units cannot accept text" } },
          { status: 422 },
        ),
      ),
    );
    const error = await makeClient()
      .createRecords(BASE, "Properties", [{ Units: "two" }])
      .catch((e) => e);
    expect(error).toBeInstanceOf(AirtableError);
    expect(error.status).toBe(422);
    expect(error.type).toBe("INVALID_VALUE_FOR_COLUMN");
    expect(error.message).not.toContain("patSECRET");
  });

  it("keeps requests at least 200 ms apart (5 per second)", async () => {
    server.use(http.get(URL_, () => HttpResponse.json({ records: [] })));
    const sleeps: number[] = [];
    const clock = { t: 0 };
    const client = makeClient(sleeps, clock);
    await Promise.all(Array.from({ length: 6 }, () => client.listRecords(BASE, "Properties")));
    expect(client.callCount).toBe(6);
    // 6 requests need 5 gaps of 200 ms: the clock advances by at least 1 second.
    expect(clock.t).toBeGreaterThanOrEqual(1000);
    expect(sleeps.every((ms) => ms <= 200)).toBe(true);
  });
});
