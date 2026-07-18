import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { allowHttpTestOrigin } from "./support/local-origin";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await allowHttpTestOrigin(page);
});

test("el turno queda confirmado y puede pagarse online después", async ({ page }) => {
  await page.goto("/agendar", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Lautaro/i }).click();
  await page.getByRole("button", { name: /Corte Masculino/i }).click();
  await page.locator(".wz-2col").locator('button[aria-pressed="false"]:not([disabled])').first().click();
  await page.getByRole("button", { name: "15:00", exact: true }).click();
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByLabel("Nombre completo").fill("Cliente Prueba");
  await page.getByLabel("Teléfono / WhatsApp").fill("+5491112345678");
  await page.getByRole("button", { name: "Confirmar turno" }).click();

  await expect(page.getByText("Tu turno ya está confirmado.")).toBeVisible();
  await page.getByRole("button", { name: "Pagar ahora con Mercado Pago" }).click();
  await expect(page).toHaveURL(/\/pago-demo\//);
  await expect(page.getByText("el turno ya está confirmado")).toBeVisible();
  await page.getByRole("button", { name: "Simular pago aprobado" }).click();
  await expect(page).toHaveURL(/\/pago\/resultado/);
  await expect(page.getByRole("heading", { name: "Pago aprobado" })).toBeVisible();
  await expect(page.getByText("Tu turno sigue confirmado y ya figura abonado.")).toBeVisible();

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
});
