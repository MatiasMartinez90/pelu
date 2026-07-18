import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://localhost:3100";

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "test-results/playwright",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.015 },
  },
  use: {
    baseURL,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    colorScheme: "dark",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    // Se prueba el artefacto de producción: evita watchers, reproduce el runtime
    // desplegado y funciona también en hosts con límites conservadores de inotify.
    command: "npm run build && npm run start -- --hostname 127.0.0.1 --port 3100",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      AUTH_SECRET: "responsive-tests-only-secret-with-32-characters",
      AUTH_URL: baseURL,
      AUTH_KEYCLOAK_ISSUER: "http://127.0.0.1:3999/realms/responsive-tests",
      AUTH_KEYCLOAK_ID: "responsive-tests",
      AUTH_KEYCLOAK_SECRET: "responsive-tests",
      DEMO_MODE: "true",
      DEMO_AUTH_SECRET: "responsive-tests-demo-secret-with-32-characters",
    },
  },
  projects: [
    {
      name: "android-small",
      use: { ...devices["Pixel 5"], viewport: { width: 320, height: 700 } },
    },
    {
      name: "android",
      use: { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "android-landscape",
      use: { ...devices["Pixel 5 landscape"], viewport: { width: 844, height: 390 } },
    },
    {
      name: "ios",
      use: { ...devices["iPhone 13"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "ipad",
      use: { ...devices["iPad (gen 7)"], viewport: { width: 768, height: 1024 } },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } },
    },
  ],
});
