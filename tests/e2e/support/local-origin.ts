import type { Page } from "@playwright/test";

export async function allowHttpTestOrigin(page: Page) {
  // Producción sirve HTTPS. WebKit aplica `upgrade-insecure-requests` también
  // a localhost y sus subdominios, bloqueando los chunks JS de Playwright.
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const isLocalTestOrigin = (
      url.protocol === "http:"
      && url.port === "3100"
      && (url.hostname === "localhost" || url.hostname.endsWith(".localhost"))
    );
    if (request.resourceType() !== "document" || !isLocalTestOrigin) {
      return route.fallback();
    }
    const response = await route.fetch();
    const headers = response.headers();
    delete headers["content-security-policy"];
    await route.fulfill({ response, headers });
  });
}
