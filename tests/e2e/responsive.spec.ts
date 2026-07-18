import { expect, test, type Page } from "@playwright/test";

const publicRoutes = [
  "/",
  "/agendar",
  "/servicios",
  "/equipo",
  "/galeria",
  "/nosotros",
  "/faq",
  "/contacto",
  "/login",
];

const now = new Date();
const future = new Date(now.getTime() + 7 * 86_400_000).toISOString();
const past = new Date(now.getTime() - 30 * 86_400_000).toISOString();

async function allowHttpTestOrigin(page: Page) {
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

async function mockPrivateApis(page: Page) {
  await page.route("**/api/backoffice/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.includes("dashboard/summary")) {
      return route.fulfill({ json: {
        kpis: { month_revenue: 180000, month_appointments: 24, month_customers: 18, month_cancelled: 2, month_whatsapp: 14, month_web: 10 },
        revenue_daily: [{ day: "2026-07-01", revenue: 30000 }, { day: "2026-07-02", revenue: 45000 }],
        top_services: [{ name: "Corte masculino", count: 14 }],
        barber_performance: [{ name: "Lautaro", revenue: 120000, count: 16 }],
      } });
    }
    return route.fulfill({ json: [] });
  });
  await page.route("**/api/barber/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/stats")) {
      return route.fulfill({ json: {
        month: "2026-07", barber: "Lautaro", kpis: { revenue: 120000, appointments: 16, completed: 14, cancelled: 2, customers: 12 },
        top_services: [{ name: "Corte masculino", count: 10 }],
      } });
    }
    return route.fulfill({ json: [{ id: "a1", starts_at: future, ends_at: future, status: "active", price_at_booking: 15000, channel: "telegram", customer: "Cliente Demo", service: "Corte masculino" }] });
  });
  await page.route("**/api/me/**", async (route) => route.fulfill({ json: {
    email: "demo-cliente@nox.local", name: "Cliente Demo",
    upcoming: [{ id: "b1", starts_at: future, ends_at: future, status: "active", price_at_booking: 15000, channel: "web", barber: "Lautaro", service: "Corte masculino" }],
    history: [{ id: "b0", starts_at: past, ends_at: past, status: "completed", price_at_booking: 15000, channel: "whatsapp", barber: "Lautaro", service: "Corte masculino" }],
  } }));
}

async function assertNoPageOverflow(page: Page, route: string) {
  await expect.poll(() => page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }))).toEqual(expect.objectContaining({ viewport: page.viewportSize()?.width }));
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  const offenders = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    return [...document.querySelectorAll<HTMLElement>("body *")]
      .map((element) => ({
        element: `${element.tagName.toLowerCase()}${element.className ? `.${String(element.className).trim().replace(/\\s+/g, ".")}` : ""}`,
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
        width: Math.round(element.getBoundingClientRect().width),
      }))
      .filter(({ left, right }) => left < -1 || right > viewport + 1)
      .slice(0, 5);
  });
  expect(dimensions.content, `${route} desborda horizontalmente: ${JSON.stringify(offenders)}`).toBeLessThanOrEqual(dimensions.viewport + 1);
}

async function assertTouchTargets(page: Page, route: string) {
  const undersized = await page.locator(".qbtn, .miniact, .nox-btn, .nox-news").evaluateAll((elements) =>
    elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return { label: element.getAttribute("aria-label") || element.textContent?.trim(), width: Math.round(rect.width), height: Math.round(rect.height) };
      }),
  );
  expect(undersized, `${route} tiene controles táctiles menores a 44 px`).toEqual([]);
}

async function demoLogin(page: Page, role: "admin" | "barbero" | "cliente", callbackUrl: string) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  const labels = { admin: "administrador", barbero: "barbero", cliente: "cliente" };
  const button = page.getByRole("button", { name: new RegExp(`Ingresar como ${labels[role]}`, "i") });
  await expect(button, `La pantalla de login no hidrató: ${pageErrors.join(" | ")}`).toBeEnabled();
  await button.click();
  await page.waitForURL(`**${callbackUrl}`);
}

test.describe("matriz responsive pública", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await allowHttpTestOrigin(page);
  });
  for (const route of publicRoutes) {
    test(`${route} no produce overflow horizontal`, async ({ page }) => {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await assertNoPageOverflow(page, route);
      await assertTouchTargets(page, route);
    });
  }
});

test.describe("portales autenticados", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await allowHttpTestOrigin(page);
    await mockPrivateApis(page);
  });

  for (const entry of [
    { role: "admin" as const, route: "/admin" },
    { role: "barbero" as const, route: "/barbero" },
    { role: "cliente" as const, route: "/mi-cuenta" },
  ]) {
    test(`${entry.route} conserva el viewport`, async ({ page }) => {
      await demoLogin(page, entry.role, entry.route);
      await assertNoPageOverflow(page, entry.route);
      await assertTouchTargets(page, entry.route);
    });
  }
});

test("regresión visual del home", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await allowHttpTestOrigin(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page).toHaveScreenshot("home.png");
});
