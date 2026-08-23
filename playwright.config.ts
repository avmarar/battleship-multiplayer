import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [["github"], ["html", { open: "never" }]]
    : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command:
        "npx firebase emulators:start --only firestore,auth --project battleship-multiplayer-demo",
      url: "http://127.0.0.1:8080",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "npx next dev --port 3000",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
