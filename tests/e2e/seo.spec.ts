import { expect, test } from "@playwright/test";
import { allowHttpTestOrigin } from "./support/local-origin";

const publicPages = [
  ["/", "NOX Barber"],
  ["/servicios", "Servicios"],
  ["/equipo", "Equipo"],
  ["/nosotros", "Nosotros"],
  ["/faq", "Preguntas frecuentes"],
  ["/contacto", "Cómo llegar"],
  ["/agendar", "Agendá tu turno"],
] as const;

test.describe("contrato SEO y GEO", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "El markup es independiente del motor y del viewport");
    await allowHttpTestOrigin(page);
  });

  for (const [path, title] of publicPages) {
    test(`${path} expone metadata indexable y canonical`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveTitle(new RegExp(title, "i"));
      const description = await page.locator('meta[name="description"]').getAttribute("content");
      expect(description?.trim().length).toBeGreaterThanOrEqual(40);
      const canonical = path === "/" ? "http://localhost:3100" : `http://localhost:3100${path}`;
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", canonical);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /index, follow/i);
    });
  }

  test("publica LocalBusiness verificable", async ({ page }) => {
    await page.goto("/");
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const values = schemas.map((schema) => JSON.parse(schema));
    const business = values.find((value) => value["@type"] === "HairSalon");
    expect(business).toMatchObject({
      name: "NOX Barber",
      url: "http://localhost:3100",
      address: { addressCountry: "AR" },
    });
    expect(business.openingHoursSpecification).toHaveLength(2);
  });

  test("FAQ publica FAQPage consistente con el contenido visible", async ({ page }) => {
    await page.goto("/faq");
    const schema = JSON.parse(await page.locator('script[type="application/ld+json"][data-schema="faq-page"]').textContent() ?? "{}");
    expect(schema["@type"]).toBe("FAQPage");
    await expect(page.locator("details.faq-item")).toHaveCount(schema.mainEntity.length);
  });

  test("cada servicio tiene página, breadcrumbs y schema Service", async ({ page }) => {
    await page.goto("/servicios/corte-masculino");
    await expect(page.getByRole("heading", { level: 1, name: "Corte Masculino" })).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "http://localhost:3100/servicios/corte-masculino");
    const service = JSON.parse(await page.locator('script[data-schema="service"]').textContent() ?? "{}");
    expect(service).toMatchObject({ "@type": "Service", name: "Corte Masculino", offers: { priceCurrency: "ARS", price: 15000 } });
    const breadcrumbs = JSON.parse(await page.locator('script[data-schema="breadcrumbs"]').textContent() ?? "{}");
    expect(breadcrumbs.itemListElement).toHaveLength(3);
  });

  test("rutas privadas declaran noindex", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex, nofollow/i);
  });

  test("robots, sitemap y llms.txt son coherentes", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    await expect(robots).toBeOK();
    expect(await robots.text()).toContain("Sitemap: http://localhost:3100/sitemap.xml");

    const sitemap = await request.get("/sitemap.xml");
    await expect(sitemap).toBeOK();
    const xml = await sitemap.text();
    expect(xml).toContain("http://localhost:3100/agendar");
    expect(xml).toContain("http://localhost:3100/servicios/corte-masculino");
    expect(xml).not.toContain("/admin");

    const llms = await request.get("/llms.txt");
    await expect(llms).toBeOK();
    const text = await llms.text();
    expect(text).toContain("# NOX Barber");
    expect(text).toContain("La disponibilidad de turnos cambia en tiempo real");
  });
});
