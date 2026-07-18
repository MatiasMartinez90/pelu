import type { Page } from "@playwright/test";

export async function allowHttpTestOrigin(page: Page) {
  // Producción sirve HTTPS. WebKit aplica `upgrade-insecure-requests` también
  // a localhost y bloquearía los chunks JS del servidor HTTP de Playwright.
  await page.route("**/*", async (route) => {
    if (route.request().resourceType() !== "document") return route.fallback();
    const response = await route.fetch();
    const headers = response.headers();
    delete headers["content-security-policy"];
    await route.fulfill({ response, headers });
  });
}
