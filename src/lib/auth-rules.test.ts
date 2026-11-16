import { describe, expect, it } from "vitest";
import { decide, isAllowedUser, isPublicPath } from "./auth-rules";

const ALLOWED = "351364537";

describe("isAllowedUser", () => {
  it("accepts only the configured GitHub id", () => {
    expect(isAllowedUser("351364537", ALLOWED)).toBe(true);
    expect(isAllowedUser("123", ALLOWED)).toBe(false);
    expect(isAllowedUser(undefined, ALLOWED)).toBe(false);
    expect(isAllowedUser("", "")).toBe(false);
  });
});

describe("isPublicPath", () => {
  it("allows login, auth callbacks and health only", () => {
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/api/auth/callback/github")).toBe(true);
    expect(isPublicPath("/api/health")).toBe(true);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/deals")).toBe(false);
    expect(isPublicPath("/api/status")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });
});

describe("decide", () => {
  it("lets the allowed user through", () => {
    expect(decide("/deals", "", ALLOWED, ALLOWED)).toEqual({ type: "next" });
  });

  it("redirects anonymous page visits to login, keeping the destination", () => {
    expect(decide("/deals", "?x=1", undefined, ALLOWED)).toEqual({
      type: "redirect",
      location: "/login?callbackUrl=%2Fdeals%3Fx%3D1",
    });
  });

  it("answers 401 for anonymous API calls", () => {
    expect(decide("/api/status", "", undefined, ALLOWED)).toEqual({ type: "unauthorized" });
  });

  it("treats a different GitHub account like an anonymous one", () => {
    expect(decide("/", "", "999", ALLOWED).type).toBe("redirect");
    expect(decide("/api/status", "", "999", ALLOWED).type).toBe("unauthorized");
  });

  it("never blocks the login page itself", () => {
    expect(decide("/login", "", undefined, ALLOWED)).toEqual({ type: "next" });
  });
});
