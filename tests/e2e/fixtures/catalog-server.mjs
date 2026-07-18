import { createServer } from "node:http";

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

createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    return response.end('{"status":"ok"}');
  }
  if (request.url === "/api/v1/booking-bootstrap") {
    response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    return response.end(JSON.stringify(catalog));
  }
  if (request.url === "/api/v1/telemetry/web-vitals" && request.method === "POST") {
    request.resume();
    response.writeHead(204);
    return response.end();
  }
  response.writeHead(404);
  response.end();
}).listen(3998, "127.0.0.1");
