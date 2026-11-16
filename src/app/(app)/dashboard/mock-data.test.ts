import { describe, expect, it } from "vitest";
import { active, byId, newThisWeek, PRICE_CHANGES, PROPERTIES, stageCounts, topByCoc } from "./mock-data";

describe("dashboard demo data", () => {
  it("lists the top 10 active properties sorted by CoC, highest first", () => {
    const top = topByCoc(10);
    expect(top).toHaveLength(10);
    expect(top.every((p) => p.stage !== "Rejected")).toBe(true);
    for (let i = 1; i < top.length; i++) expect(top[i - 1].coc).toBeGreaterThanOrEqual(top[i].coc);
  });

  it("counts every property in exactly one stage", () => {
    expect(stageCounts().reduce((n, s) => n + s.count, 0)).toBe(PROPERTIES.length);
  });

  it("shows only properties listed in the last 7 days as new", () => {
    expect(newThisWeek().every((p) => p.daysListed <= 7)).toBe(true);
    expect(newThisWeek().length).toBeGreaterThan(0);
  });

  it("points every price change at a known property", () => {
    for (const change of PRICE_CHANGES) expect(byId(change.propertyId)).toBeDefined();
  });

  it("uses only invented street names, so no real listing is implied", () => {
    const fake = /(Demo|Sample|Example|Mockup|Placeholder|Testing|Fictional|Sandbox|Draft|Prototype)/;
    expect(PROPERTIES.every((p) => fake.test(p.address))).toBe(true);
  });

  it("computes metrics consistently (cap rate = NOI / price)", () => {
    for (const p of active()) expect(p.capRate).toBeCloseTo(p.noi / p.price, 10);
  });
});
