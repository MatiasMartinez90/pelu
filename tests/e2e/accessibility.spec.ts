import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { allowHttpTestOrigin } from "./support/local-origin";

const routes = ["/", "/agendar", "/servicios", "/equipo", "/galeria", "/nosotros", "/faq", "/contacto", "/login"];

test.describe("WCAG 2.2 A/AA", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "axe cubre el DOM; viewport móvil y desktop se validan en Chromium");

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(!["android", "desktop"].includes(testInfo.project.name), "Matriz representativa mobile/desktop");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await allowHttpTestOrigin(page);
  });

  for (const route of routes) {
    test(`${route} no tiene violaciones serias o críticas`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("body")).toBeVisible();
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      const blocking = result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });
  }
});
