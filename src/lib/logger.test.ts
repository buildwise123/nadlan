import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { createLogger, maskSecrets, secretValues } from "./logger";

function capture() {
  const lines: Record<string, unknown>[] = [];
  const destination = new Writable({
    write(chunk, _encoding, done) {
      lines.push(JSON.parse(chunk.toString()));
      done();
    },
  });
  return { lines, destination };
}

describe("logger", () => {
  it("writes structured JSON with level and message", () => {
    const { lines, destination } = capture();
    createLogger({ level: "info", destination, secrets: [] }).info({ job: "import" }, "started");
    expect(lines[0]).toMatchObject({ app: "nadlan", job: "import", msg: "started", level: 30 });
  });

  it("redacts secret-looking keys in log objects", () => {
    const { lines, destination } = capture();
    const log = createLogger({ level: "info", destination, secrets: [] });
    log.info({ token: "pat-123456789", request: { headers: { authorization: "Bearer abc" }, apiKey: "k-987654321" } });
    const line = JSON.stringify(lines[0]);
    expect(line).not.toContain("pat-123456789");
    expect(line).not.toContain("Bearer abc");
    expect(line).not.toContain("k-987654321");
    expect(line).toContain("[REDACTED]");
  });

  it("masks secret values that appear inside a message string", () => {
    const { lines, destination } = capture();
    const log = createLogger({ level: "info", destination, secrets: ["super-secret-key-1"] });
    log.warn("GET https://api.example.com/x?api_key=super-secret-key-1 failed");
    expect(lines[0].msg).toBe("GET https://api.example.com/x?api_key=[REDACTED] failed");
  });

  it("picks secret values only from TOKEN/SECRET/KEY variables of 8+ characters", () => {
    const values = secretValues({
      AIRTABLE_TOKEN: "patABCDEFGH",
      NEXTAUTH_SECRET: "s".repeat(40),
      RENTCAST_API_KEY: "short",
      NEXTAUTH_URL: "http://localhost:3000",
    });
    expect(values).toEqual(["patABCDEFGH", "s".repeat(40)]);
  });

  it("maskSecrets leaves text without secrets unchanged", () => {
    expect(maskSecrets("nothing to hide", ["abcdefgh12"])).toBe("nothing to hide");
  });
});
