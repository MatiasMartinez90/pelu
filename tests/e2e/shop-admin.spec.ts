import { expect, test, type Page, type Route } from "@playwright/test";
import { allowHttpTestOrigin } from "./support/local-origin";

const order = {
  id: "11111111-1111-4111-8111-111111111111",
  order_number: 42,
  customer_name: "Cliente Shop",
  customer_email: "shop@example.test",
  customer_phone: "+5491112345678",
  status: "confirmed",
  payment_method: "pay_at_store",
  payment_status: "unpaid",
  currency: "ARS",
  subtotal: 25000,
  total: 25000,
  item_count: 1,
  pickup_location: "Av. Demo 1234, Palermo",
  customer_notes: "Retiro por la tarde",
  cancellation_reason: "",
  created_at: "2026-07-18T12:00:00-03:00",
  updated_at: "2026-07-18T12:00:00-03:00",
  items: [{ product_slug: "pomada-matte", product_name: "Pomada Matte", sku: "TEST-POM", unit_price: 25000, quantity: 1, line_total: 25000 }],
};

const product = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Pomada Matte",
  sku: "TEST-POM",
  slug: "pomada-matte",
  qty: 12,
  min_qty: 3,
  price: 25000,
  active: true,
  description: "Control flexible y terminación mate.",
  short_description: "Terminación mate.",
  image_url: "https://media.example.test/pomada.webp",
  gallery: [],
  featured: true,
  sort_order: 1,
  category_slug: "styling",
};

async function demoLogin(page: Page) {
  await page.goto("/login?callbackUrl=%2Fadmin");
  const button = page.getByRole("button", { name: /Ingresar como administrador/i });
  await expect(button).toBeEnabled();
  await button.click();
  await page.waitForURL("**/admin");
}

async function mockAdmin(page: Page, onMutation?: (route: Route) => void) {
  await page.route("**/api/backoffice/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== "GET") onMutation?.(route);
    if (path.includes("dashboard/summary")) return route.fulfill({ json: { kpis: { month_revenue: 0, month_appointments: 0, month_customers: 0, month_cancelled: 0, month_whatsapp: 0, month_web: 0 }, revenue_daily: [], top_services: [], barber_performance: [] } });
    if (path.endsWith("/orders") && request.method() === "GET") return route.fulfill({ json: [{ ...order, items: undefined }] });
    if (path.endsWith(`/orders/${order.id}`)) return route.fulfill({ json: order });
    if (path.endsWith(`/orders/${order.id}/status`) && request.method() === "PATCH") {
      const payload = request.postDataJSON();
      return route.fulfill({ json: { ...order, status: payload.status } });
    }
    if (path.endsWith("/products") && request.method() === "GET") return route.fulfill({ json: [product] });
    if (path.endsWith("/product-categories")) return route.fulfill({ json: [{ id: "cat-1", slug: "styling", name: "Styling", description: "", sort_order: 1, active: true }] });
    if (path.endsWith(`/products/${product.id}/shop`) && request.method() === "PATCH") return route.fulfill({ json: { ...product, ...request.postDataJSON() } });
    return route.fulfill({ json: [] });
  });
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await allowHttpTestOrigin(page);
});

test("admin procesa un pedido del shop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  let transition: Record<string, unknown> | null = null;
  await mockAdmin(page, (route) => {
    if (route.request().url().endsWith("/status")) transition = route.request().postDataJSON();
  });
  await demoLogin(page);
  await page.getByRole("button", { name: "Pedidos", exact: true }).click();
  await page.getByRole("button", { name: /#42/ }).click();
  await expect(page.getByRole("region", { name: "Detalle del pedido 42" })).toContainText("Cliente Shop");
  await page.getByRole("button", { name: "Marcar listo" }).click();
  await expect.poll(() => transition).toEqual({ status: "ready", note: "" });
  await expect(page.getByRole("region", { name: "Detalle del pedido 42" }).getByText("Listo para retirar")).toBeVisible();
});

test("admin edita la ficha pública sin tocar el stock", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  let payload: Record<string, unknown> | null = null;
  await mockAdmin(page, (route) => {
    if (route.request().url().endsWith("/shop")) payload = route.request().postDataJSON();
  });
  await demoLogin(page);
  await page.getByRole("button", { name: "Stock", exact: true }).click();
  await page.getByRole("button", { name: "Editar ficha" }).click();
  await page.getByLabel("Descripción breve").fill("Nueva descripción pública");
  await page.getByRole("button", { name: "Guardar ficha" }).click();
  await expect.poll(() => payload).toEqual(expect.objectContaining({ short_description: "Nueva descripción pública", slug: "pomada-matte", active: true }));
  expect(payload).not.toHaveProperty("qty");
});

test("pedidos conserva el viewport en móvil y escritorio", async ({ page }, testInfo) => {
  test.skip(!["android-small", "desktop"].includes(testInfo.project.name));
  await mockAdmin(page);
  await demoLogin(page);
  await page.getByRole("button", { name: "Pedidos", exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});
