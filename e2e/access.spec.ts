import { expect, test, type BrowserContext } from "@playwright/test";
import { encode } from "next-auth/jwt";
import { E2E_SECRET, E2E_USER_ID } from "../playwright.config";

/** Puts a signed next-auth session cookie in the browser, as GitHub login would. */
async function signInAs(context: BrowserContext, githubId: string) {
  const value = await encode({ token: { githubId, name: "e2e" }, secret: E2E_SECRET });
  await context.addCookies([{ name: "next-auth.session-token", value, url: "http://localhost:3200" }]);
}

test.describe("anonymous visitor (AC-10)", () => {
  test("is sent to the login page and back afterwards", async ({ page }) => {
    await page.goto("/deals");
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdeals/);
    await expect(page.getByRole("button", { name: "התחבר עם GitHub" })).toBeVisible();
  });

  test("gets 401 from private APIs, 200 from health", async ({ request }) => {
    expect((await request.get("/api/status")).status()).toBe(401);
    expect((await request.get("/api/health")).status()).toBe(200);
  });

  test("cannot reach a look-alike of a public path", async ({ page }) => {
    await page.goto("/loginx");
    await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  });
});

test.describe("a different GitHub account (AC-10)", () => {
  test("is treated like an anonymous visitor", async ({ context, page }) => {
    await signInAs(context, "999999");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
    expect((await page.request.get("/api/status")).status()).toBe(401);
  });
});

test.describe("the allowed user", () => {
  test.beforeEach(async ({ context }) => signInAs(context, E2E_USER_ID));

  test("lands on the dashboard, in Hebrew, right to left", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "he");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("dashboard mockup shows the demo banner and its sections", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("note")).toContainText("תצוגת דמה");
    await expect(page.getByRole("list", { name: "מדדים עיקריים" }).getByRole("listitem")).toHaveCount(4);
    await expect(page.getByRole("heading", { name: /10 הנכסים המובילים/ })).toBeVisible();
    await expect(page.locator("table").first().locator("tbody tr")).toHaveCount(10);
  });

  test("can open every screen from the menu", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation", { name: "ניווט ראשי" });
    for (const [label, path, heading] of [
      ["מאגר נכסים", "/deals", "מאגר נכסים"],
      ["ניתוח נכס", "/analysis", "ניתוח נכס"],
      ["השוואה", "/compare", "השוואת נכסים"],
      ["מצב מערכת", "/status", "מצב מערכת"],
    ]) {
      await nav.getByRole("link", { name: label }).click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
  });

  test("status page reports missing Airtable settings without crashing", async ({ page }) => {
    await page.goto("/status");
    await expect(page.getByText("הגדרות התחברות")).toBeVisible();
    await expect(page.getByText("חסר: AIRTABLE_BASE_ID, AIRTABLE_TOKEN")).toBeVisible();
  });

  test("the status API answers for the signed-in user", async ({ page }) => {
    const response = await page.request.get("/api/status");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.checks.length).toBeGreaterThanOrEqual(3);
  });
});
