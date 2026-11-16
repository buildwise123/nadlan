import { describe, expect, it } from "vitest";
import { renderDemoHtml } from "./export-demo";

describe("static demo export", () => {
  const html = renderDemoHtml();

  it("is a Hebrew right-to-left page that search engines should not index", () => {
    expect(html).toContain('<html lang="he" dir="rtl"');
    expect(html).toContain('<meta name="robots" content="noindex, nofollow">');
  });

  it("shows the demo banner and the dashboard sections", () => {
    expect(html).toContain("תצוגת דמה");
    expect(html).toContain("10 הנכסים המובילים");
    expect(html).toContain("מצב מקורות הנתונים");
  });

  it("contains no links into the real app and no login", () => {
    expect(html).not.toMatch(/href="\/(dashboard|deals|analysis|compare|status|login|api)/);
    expect(html).not.toContain("התחבר עם GitHub");
  });
});
