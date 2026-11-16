import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a production build.
 * Test-only settings (never real secrets): a throwaway session secret and a
 * fake allowed user id, so tests can mint a session without GitHub.
 * Variables set here take precedence over .env.local.
 */
export const E2E_SECRET = "e2e-only-secret-not-used-anywhere-else-0123456789";
export const E2E_USER_ID = "4242";
const PORT = 3200;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${PORT}`, locale: "he-IL" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      NEXTAUTH_SECRET: E2E_SECRET,
      NEXTAUTH_URL: `http://localhost:${PORT}`,
      ALLOWED_GITHUB_USER_ID: E2E_USER_ID,
      AUTH_GITHUB_ID: "e2e-client-id",
      AUTH_GITHUB_SECRET: "e2e-client-secret",
      // Keep Airtable unset in e2e: the status page must degrade gracefully.
      AIRTABLE_TOKEN: "",
      AIRTABLE_BASE_ID: "",
    },
  },
});
