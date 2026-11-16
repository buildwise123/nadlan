import { describe, expect, it } from "vitest";
import { airtableEnv, authEnv, EnvError, logEnv } from "./env";

const validAuth = {
  AUTH_GITHUB_ID: "Iv1.abc",
  AUTH_GITHUB_SECRET: "shh-very-secret-value",
  NEXTAUTH_SECRET: "x".repeat(40),
  ALLOWED_GITHUB_USER_ID: "351364537",
};

describe("env", () => {
  it("returns the values when everything is present", () => {
    expect(authEnv(validAuth).ALLOWED_GITHUB_USER_ID).toBe("351364537");
  });

  it("names every missing variable", () => {
    expect(() => authEnv({})).toThrowError(EnvError);
    try {
      authEnv({});
    } catch (error) {
      expect((error as EnvError).variables).toEqual([
        "ALLOWED_GITHUB_USER_ID",
        "AUTH_GITHUB_ID",
        "AUTH_GITHUB_SECRET",
        "NEXTAUTH_SECRET",
      ]);
    }
  });

  it("treats blank values as missing", () => {
    expect(() => authEnv({ ...validAuth, AUTH_GITHUB_SECRET: "   " })).toThrowError(/AUTH_GITHUB_SECRET/);
  });

  it("never prints secret values in the error", () => {
    const bad = { ...validAuth, NEXTAUTH_SECRET: "too-short-secret" };
    expect(() => authEnv(bad)).toThrowError(/NEXTAUTH_SECRET/);
    try {
      authEnv(bad);
    } catch (error) {
      expect((error as Error).message).not.toContain("too-short-secret");
    }
  });

  it("rejects a malformed Airtable base id", () => {
    expect(() => airtableEnv({ AIRTABLE_TOKEN: "pat123", AIRTABLE_BASE_ID: "nope" })).toThrowError(/AIRTABLE_BASE_ID/);
    expect(airtableEnv({ AIRTABLE_TOKEN: "pat123", AIRTABLE_BASE_ID: "appABCDEFGHIJKLMN" }).AIRTABLE_BASE_ID).toBe( // gitleaks:allow (fake test id)
      "appABCDEFGHIJKLMN", // gitleaks:allow (fake test id)
    );
  });

  it("defaults the log level to info", () => {
    expect(logEnv({}).LOG_LEVEL).toBe("info");
  });
});
