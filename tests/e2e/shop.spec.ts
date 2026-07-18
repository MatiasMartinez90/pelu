import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { allowHttpTestOrigin } from "./support/local-origin";

const shopOrigin = "http://shop.localhost:3100";

test.describe("shop independiente", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await allowHttpTestOrigin(page);
  });

  test("catálogo responsive sin overflow y snapshot", async ({ page }) => {
    await page.goto(shopOrigin, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /cuidá tu estilo/i })).toBeVisible();
    await expect(page.locator(".shop-product-card")).toHaveCount(3);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page).toHaveScreenshot("shop-home.png", { fullPage: true });
  });

  test("catálogo y ficha no tienen violaciones serias", async ({ page }, testInfo) => {
    test.skip(!["android", "desktop"].includes(testInfo.project.name), "muestra mobile/desktop");
    await page.goto(shopOrigin, { waitUntil: "networkidle" });
    let result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(result.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
    await page.goto(`${shopOrigin}/productos/pomada-matte`, { waitUntil: "networkidle" });
    result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(result.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  test("carrito y checkout local completos", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "flujo funcional único; la UI se cubre en toda la matriz");
    await page.goto(shopOrigin, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await expect(page.getByRole("link", { name: /carrito, 1 productos/i })).toBeVisible();
    await page.getByRole("link", { name: /carrito, 1 productos/i }).click();
    await expect(page.getByRole("heading", { name: "Carrito" })).toBeVisible();
    await page.getByRole("link", { name: "Continuar compra" }).click();
    await page.getByLabel("Nombre y apellido").fill("Cliente Prueba");
    await page.getByLabel("Email").fill("cliente@example.test");
    await page.getByLabel("Teléfono").fill("+5491112345678");
    await page.getByRole("button", { name: /Confirmar pedido/ }).click();
    await expect(page.getByRole("heading", { name: "¡Listo, Cliente!" })).toBeVisible();
    await expect(page.getByText("Pedido #000042")).toBeVisible();
    await expect(page.getByText("Av. Demo 1234, Palermo")).toBeVisible();
  });

  test("opciones de pago accesibles y sin overflow", async ({ page }, testInfo) => {
    test.skip(!["android-small", "desktop"].includes(testInfo.project.name), "muestra mínima mobile/desktop");
    await page.goto(shopOrigin, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.getByRole("link", { name: /carrito, 1 productos/i }).click();
    await page.getByRole("link", { name: "Continuar compra" }).click();
    await expect(page.getByLabel("Mercado Pago")).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(result.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  test("checkout demo acredita el pago y vuelve al resultado", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "flujo funcional único");
    await page.goto(shopOrigin, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.getByRole("link", { name: /carrito, 1 productos/i }).click();
    await page.getByRole("link", { name: "Continuar compra" }).click();
    await page.getByLabel("Nombre y apellido").fill("Cliente Mercado Pago");
    await page.getByLabel("Email").fill("mercadopago@example.test");
    await page.getByLabel("Teléfono").fill("+5491112345678");
    await page.getByLabel("Mercado Pago").check();
    await page.getByRole("button", { name: /Continuar a Mercado Pago/ }).click();
    await expect(page.getByRole("heading", { name: "Checkout de prueba" })).toBeVisible();
    let accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
    await page.getByRole("button", { name: "Simular pago aprobado" }).click();
    await expect(page.getByRole("heading", { name: "Pago aprobado" })).toBeVisible();
    await expect(page.getByText("Pedido #000042")).toBeVisible();
    accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze();
    expect(accessibility.violations.filter(({ impact }) => impact === "serious" || impact === "critical")).toEqual([]);
  });

  test("si el link online falla permite volver a pago local", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "flujo de recuperación único");
    await page.route("**/api/payments/shop-orders/*/preference", async (route) => {
      await route.fulfill({ status: 503, contentType: "application/json", body: '{"detail":"provider_unavailable"}' });
    }, { times: 1 });
    await page.goto(shopOrigin, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Agregar al carrito" }).first().click();
    await page.getByRole("link", { name: /carrito, 1 productos/i }).click();
    await page.getByRole("link", { name: "Continuar compra" }).click();
    await page.getByLabel("Nombre y apellido").fill("Cliente Fallback");
    await page.getByLabel("Email").fill("fallback@example.test");
    await page.getByLabel("Teléfono").fill("+5491112345678");
    await page.getByLabel("Mercado Pago").check();
    await page.getByRole("button", { name: /Continuar a Mercado Pago/ }).click();
    await expect(page.getByRole("heading", { name: "Tu pedido está reservado" })).toBeVisible();
    await page.getByRole("button", { name: "Pagar en el local" }).click();
    await expect(page.getByRole("heading", { name: "¡Listo, Cliente!" })).toBeVisible();
    await expect(page.getByText("En el local", { exact: true })).toBeVisible();
  });

  test("SEO propio del subdominio", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "contrato independiente del viewport");
    await page.goto(`${shopOrigin}/productos/pomada-matte`, { waitUntil: "networkidle" });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${shopOrigin}/productos/pomada-matte`);
    const schema = JSON.parse(await page.locator('script[data-schema="product"]').textContent() ?? "{}");
    expect(schema["@type"]).toBe("Product");
    expect(schema.offers.priceCurrency).toBe("ARS");
    const robots = await (await page.request.get(`${shopOrigin}/robots.txt`)).text();
    expect(robots).toContain("Disallow: /checkout");
    expect(robots).toContain("Disallow: /pago-demo/");
    const sitemap = await (await page.request.get(`${shopOrigin}/sitemap.xml`)).text();
    expect(sitemap).toContain(`${shopOrigin}/productos/pomada-matte`);
  });
});
