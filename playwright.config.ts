import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "claims.spec.ts",
  workers: 1,
  fullyParallel: false,
  timeout: 45_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm exec vite -- preview --config vite.site.config.ts --host 127.0.0.1 --port 4173",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
