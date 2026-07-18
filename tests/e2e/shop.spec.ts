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

  test("SEO propio del subdominio", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "contrato independiente del viewport");
    await page.goto(`${shopOrigin}/productos/pomada-matte`, { waitUntil: "networkidle" });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${shopOrigin}/productos/pomada-matte`);
    const schema = JSON.parse(await page.locator('script[data-schema="product"]').textContent() ?? "{}");
    expect(schema["@type"]).toBe("Product");
    expect(schema.offers.priceCurrency).toBe("ARS");
    const robots = await (await page.request.get(`${shopOrigin}/robots.txt`)).text();
    expect(robots).toContain("Disallow: /checkout");
    const sitemap = await (await page.request.get(`${shopOrigin}/sitemap.xml`)).text();
    expect(sitemap).toContain(`${shopOrigin}/productos/pomada-matte`);
  });
});
