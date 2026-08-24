import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3000";
process.env.DATABASE_URL ??= "postgresql://postgres:recruiterpal@127.0.0.1:5499/recruiterpal";
process.env.BETTER_AUTH_SECRET ??= "playwright-local-only-secret";
process.env.BETTER_AUTH_URL ??= baseURL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : "list",
  outputDir: "output/playwright",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter @recruiterpal/web dev",
    url: `${baseURL}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
