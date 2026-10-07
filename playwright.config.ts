import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const baseURL = externalBaseUrl ?? "http://127.0.0.1:3100";
const systemBrowserChannel = process.env.PLAYWRIGHT_USE_SYSTEM_CHROME ? "chrome" : undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  outputDir: ".playwright-results",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"], channel: systemBrowserChannel },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 5"], channel: systemBrowserChannel },
    },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3100",
        url: `${baseURL}/api/live`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
