import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const catalog = {
  barbers: [
    { slug: "lautaro", name: "Lautaro", role: "BARBERO", photo_url: "/media/team/lautaro.v1.webp", bio: "Especialista en cortes y fades.", instagram: "" },
  ],
  services_by_barber: {
    lautaro: [
      { slug: "corte-masculino", name: "Corte Masculino", description: "Corte personalizado con estilo y terminación profesional.", price: 15000, duration_min: 30, badge: null, variable_price: false },
      { slug: "corte-barba", name: "Corte y Barba", description: "Corte de pelo y arreglo completo de barba.", price: 18000, duration_min: 45, badge: "Más pedido", variable_price: false },
    ],
  },
};

const products = [
  { slug: "pomada-matte", name: "Pomada Matte", sku: "TEST-POM", description: "Control flexible y terminación mate.", short_description: "Terminación mate y control flexible.", category_slug: "styling", category_name: "Styling", image_url: "/media/products/demo/texture-mash-matte.v1.webp", gallery: [], price: 25000, available_qty: 50, in_stock: true, featured: true },
  { slug: "polvo-texturizador", name: "Polvo Texturizador", sku: "TEST-POL", description: "Volumen y textura de acabado natural.", short_description: "Volumen con acabado natural.", category_slug: "styling", category_name: "Styling", image_url: "/media/products/demo/texture-dust-original.v1.webp", gallery: [], price: 22000, available_qty: 50, in_stock: true, featured: true },
  { slug: "aceite-barba", name: "Aceite para Barba", sku: "TEST-BAR", description: "Cuidado diario para barba.", short_description: "Cuidado diario para barba.", category_slug: "barba", category_name: "Barba", image_url: "/media/products/demo/beard-oil-cedro.v1.webp", gallery: [], price: 19000, available_qty: 50, in_stock: true, featured: false },
];
const carts = new Map();
const orders = new Map();
const payments = new Map();
const shopDelayMs = Math.max(0, Number(process.env.SHOP_FIXTURE_DELAY_MS ?? 0));

async function shopDelay() {
  if (shopDelayMs) await new Promise((resolve) => setTimeout(resolve, shopDelayMs));
}

function json(response, status, value, headers = {}) {
  response.writeHead(status, { "content-type": "application/json", ...headers });
  response.end(JSON.stringify(value));
}

async function body(request) {
  let value = "";
  for await (const chunk of request) value += chunk;
  return value ? JSON.parse(value) : {};
}

function renderedCart(cart) {
  const items = [...cart.items.entries()].map(([slug, quantity]) => {
    const product = products.find((item) => item.slug === slug);
    return { product, quantity, line_total: product.price * quantity };
  });
  return { token: cart.token, status: "active", currency: "ARS", items, subtotal: items.reduce((sum, item) => sum + item.line_total, 0), total_quantity: items.reduce((sum, item) => sum + item.quantity, 0), expires_at: new Date(Date.now() + 86400000).toISOString() };
}

createServer(async (request, response) => {
  const url = new URL(request.url, "http://fixture");
  if (url.pathname === "/health") {
    return json(response, 200, { status: "ok" });
  }
  if (url.pathname === "/api/v1/booking-bootstrap") {
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return response.end(JSON.stringify(catalog));
  }
  if (url.pathname === "/api/v1/shop/categories" && request.method === "GET") {
    await shopDelay();
    return json(response, 200, [
      { slug: "styling", name: "Styling", description: "Terminación y textura.", product_count: 2 },
      { slug: "barba", name: "Barba", description: "Cuidado de barba.", product_count: 1 },
    ]);
  }
  if (url.pathname === "/api/v1/shop/products" && request.method === "GET") {
    await shopDelay();
    const category = url.searchParams.get("category");
    const query = url.searchParams.get("q")?.toLowerCase();
    const items = products.filter((product) => (!category || product.category_slug === category) && (!query || product.name.toLowerCase().includes(query)));
    return json(response, 200, { items, total: items.length, limit: 24, offset: 0 });
  }
  const productMatch = url.pathname.match(/^\/api\/v1\/shop\/products\/([a-z0-9-]+)$/);
  if (productMatch && request.method === "GET") {
    const product = products.find((item) => item.slug === productMatch[1]);
    return product ? json(response, 200, product) : json(response, 404, { detail: "producto inexistente" });
  }
  if (url.pathname === "/api/v1/shop/carts" && request.method === "POST") {
    const token = `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`;
    const cart = { token, items: new Map() };
    carts.set(token, cart);
    return json(response, 201, renderedCart(cart));
  }
  const cartMatch = url.pathname.match(/^\/api\/v1\/shop\/carts\/([A-Za-z0-9_-]{32,128})(?:\/items\/([a-z0-9-]+))?$/);
  if (cartMatch) {
    const cart = carts.get(cartMatch[1]);
    if (!cart) return json(response, 404, { detail: "carrito inexistente" });
    if (request.method === "GET") return json(response, 200, renderedCart(cart));
    if (request.method === "PUT" && cartMatch[2]) {
      const payload = await body(request);
      cart.items.set(cartMatch[2], payload.quantity);
      return json(response, 200, renderedCart(cart));
    }
    if (request.method === "DELETE" && cartMatch[2]) {
      cart.items.delete(cartMatch[2]);
      return json(response, 200, renderedCart(cart));
    }
  }
  if (url.pathname === "/api/v1/shop/checkout" && request.method === "POST") {
    const payload = await body(request);
    const cart = carts.get(payload.cart_token);
    if (!cart || !cart.items.size) return json(response, 422, { detail: "carrito vacío" });
    const rendered = renderedCart(cart);
    carts.delete(payload.cart_token);
    const order = { id: randomUUID(), order_number: 42, customer_name: payload.customer.name, customer_email: payload.customer.email, customer_phone: payload.customer.phone, status: "confirmed", payment_method: "pay_at_store", payment_status: "unpaid", currency: "ARS", subtotal: rendered.subtotal, total: rendered.subtotal, pickup_location: "Av. Demo 1234, Palermo", customer_notes: payload.customer_notes ?? "", cancellation_reason: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString(), items: rendered.items.map(({ product, quantity, line_total }) => ({ product_slug: product.slug, product_name: product.name, sku: product.sku, unit_price: product.price, quantity, line_total })) };
    orders.set(order.id, { order, cartToken: payload.cart_token });
    return json(response, 201, order);
  }
  const preferenceMatch = url.pathname.match(/^\/api\/v1\/payments\/shop-orders\/([0-9a-f-]{36})\/preference$/);
  if (preferenceMatch && request.method === "POST") {
    const payload = await body(request);
    const record = orders.get(preferenceMatch[1]);
    if (!record || record.cartToken !== payload.cart_token) return json(response, 404, { detail: "pedido inexistente" });
    const token = `demo.${preferenceMatch[1].replaceAll("-", "")}.signed`;
    payments.set(token, { purpose: "shop_order", status: "pending", amount: record.order.total, currency: "ARS", expires_at: new Date(Date.now() + 1800000).toISOString(), sandbox: true });
    return json(response, 201, { checkout_url: `http://shop.localhost:3100/pago-demo/${token}`, status_token: token, ...payments.get(token) });
  }
  const payAtStoreMatch = url.pathname.match(/^\/api\/v1\/payments\/shop-orders\/([0-9a-f-]{36})\/pay-at-store$/);
  if (payAtStoreMatch && request.method === "POST") {
    const payload = await body(request);
    const record = orders.get(payAtStoreMatch[1]);
    if (!record || record.cartToken !== payload.cart_token) return json(response, 404, { detail: "pedido inexistente" });
    response.writeHead(204);
    return response.end();
  }
  const paymentStatusMatch = url.pathname.match(/^\/api\/v1\/payments\/status\/([A-Za-z0-9_.~-]+)$/);
  if (paymentStatusMatch && request.method === "GET") {
    const payment = payments.get(paymentStatusMatch[1]);
    return payment ? json(response, 200, payment) : json(response, 404, { detail: "link de pago inexistente" });
  }
  const demoPaymentMatch = url.pathname.match(/^\/api\/v1\/payments\/demo\/([A-Za-z0-9_.~-]+)$/);
  if (demoPaymentMatch && request.method === "POST") {
    const payment = payments.get(demoPaymentMatch[1]);
    if (!payment) return json(response, 404, { detail: "link de pago inexistente" });
    const payload = await body(request);
    payment.status = payload.outcome;
    return json(response, 200, payment);
  }
  if (url.pathname === "/api/v1/telemetry/web-vitals" && request.method === "POST") {
    request.resume();
    response.writeHead(204);
    return response.end();
  }
  response.writeHead(404);
  response.end();
}).listen(3998, "127.0.0.1");
