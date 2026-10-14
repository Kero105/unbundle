import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// The smoke test is for local and preview runs only. Refuse anything that is
// not localhost so it can never be pointed at production by accident.
const { hostname } = new URL(baseURL);
if (hostname !== "localhost" && hostname !== "127.0.0.1") {
  throw new Error("E2E_BASE_URL must be localhost; the smoke test never runs against a deployed site.");
}

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "en-US",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next dev -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
    // /share needs a configured site address; this is the local one, nothing real.
    env: { NEXT_PUBLIC_SITE_URL: baseURL },
  },
});
