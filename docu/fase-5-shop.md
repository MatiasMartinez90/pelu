# Fase 5 — Shop independiente

## Estado

Listo y verificado en `dev`. No se promovió a `main`, demo ni producción; cualquier promoción futura requiere autorización explícita.

## Alcance

El shop usa el mismo artefacto white-label, pero se publica en el dominio configurado para la tienda. Para NOX dev el host es `shop-dev-nox.cloud-it.com.ar`; un cliente nuevo obtiene otro host y catálogo sin un fork de código.

Incluye:

- categorías, listado, búsqueda, filtros y ficha de producto;
- carrito invitado durable mediante un token opaco; el token se guarda sólo como SHA-256 en PostgreSQL;
- carrito compatible con una identidad autenticada futura mediante `customer_email`;
- checkout con retiro exclusivo en el local y pago local;
- pedido e items con snapshots de nombre, SKU y precio;
- descuento de stock transaccional y ledger en `stock_movements`;
- idempotencia de checkout para que un reintento no duplique pedido ni stock;
- estados `pending`, `confirmed`, `ready`, `completed` y `cancelled`;
- restauración de stock exactamente una vez al cancelar;
- administración de categorías, ficha pública, stock y pedidos.

Mercado Pago queda deliberadamente fuera de esta fase y se integra en la Fase 6 sobre los campos `payment_method` y `payment_status` ya preparados.

## Incrementos

### 5.1 Núcleo de comercio

Branch `feat/shop-commerce-core`:

- migración 012 con catálogo enriquecido, carritos, pedidos, items e historial;
- API pública de categorías, productos, carrito y checkout;
- API administrativa de categorías, ficha comercial y flujo de pedidos;
- bootstrap white-label ampliado con metadatos opcionales de producto;
- pruebas de integración contra PostgreSQL 16 real.

### 5.2 Experiencia independiente

Branch `feat/shop-standalone-experience`:

- shell propio del shop en el host configurado;
- home del shop, búsqueda/categorías, fichas y datos estructurados Product;
- carrito responsive persistido y checkout accesible;
- estados de carga, vacío, error, sin stock y confirmación;
- BFF same-origin para no exponer detalles internos del backend.
- `robots.txt`, sitemap y canonical propios del subdominio;
- teaser del Home alimentado por el mismo catálogo PostgreSQL, sin productos hardcodeados;
- budgets iniciales de 210 KB JS gzip y 25 KB CSS gzip para la ruta Shop;
- Lighthouse mobile/desktop configurado también para el host del Shop.

### 5.3 Operación y despliegue

Branch `feat/shop-admin-operations`:

- pestaña Pedidos con filtro, detalle, retiro, pago, items y total;
- flujo operativo `confirmed → ready → completed` y cancelación con motivo;
- catálogo administrativo con categorías, ficha, imágenes, orden, destacado y publicación;
- separación explícita entre la ficha comercial y los ajustes auditados de stock;
- E2E de contratos del admin y viewport mobile/desktop.

El host `shop-dev-nox.cloud-it.com.ar` usa el mismo artefacto versionado y se monta mediante el dominio configurado para la instalación. La separación pública de canonical, sitemap, robots, navegación y URLs no depende de valores NOX en el código.

## Invariantes

- El backend es la autoridad de precio y stock; nunca confía en totales enviados por el navegador.
- El checkout bloquea carrito y productos dentro de una transacción.
- `Idempotency-Key` identifica un intento de checkout y se almacena hasheado.
- Un pedido conserva snapshots aunque luego cambie la ficha del producto.
- Todo ajuste de stock genera un movimiento auditable.
- Cancelar un pedido terminal o completado está prohibido.
- El carrito no contiene secretos de proveedor ni datos de pago.
- Retiro local es el único modo de entrega en esta POC.

## Evidencia local del incremento 5.1

- contratos NOX y Aurora válidos;
- Ruff limpio;
- OpenAPI generado con 57 rutas;
- suite sin servicios: `62 passed, 7 skipped`;
- PostgreSQL 16 descartable con las 12 migraciones: `4 passed` para bootstrap + commerce;
- checkout repetido devuelve el mismo pedido y descuenta stock una sola vez;
- cancelación restaura stock una sola vez y deja movimiento en el ledger.

Evidencia del incremento 5.2:

- lint, TypeScript y build de producción verdes;
- budgets: 200.844 B JS gzip y 16.457 B CSS gzip, debajo de los límites;
- 78/78 pruebas responsive existentes sin regresiones;
- 10/10 pruebas Shop relevantes: seis snapshots, accesibilidad mobile/desktop, checkout completo y SEO;
- SEO del host: canonical, Product JSON-LD, moneda, robots y sitemap verificados;
- servidor de performance con fixture aislado y smoke de home/robots/sitemap en 200.
- PR [#41](https://github.com/MatiasMartinez90/pelu/pull/41), squash `1254447` hacia `dev`;
- CI verde: seguridad/dependencias, Lighthouse mobile/desktop y regresión visual;
- workflow de deploy `29635758406` exitoso;
- smoke real 200 para catálogo, ficha, `robots.txt` y `sitemap.xml`;
- BFF real: catálogo de seis productos y creación de carrito ARS con token opaco.

Evidencia local del incremento 5.3:

- lint y TypeScript verdes;
- E2E: transición de pedido, edición de ficha sin enviar `qty` y viewport mobile/desktop;
- las pruebas PostgreSQL del core cubren checkout concurrente/idempotente, ledger y restauración única al cancelar.
- Lighthouse reproduce 350 ms de latencia del catálogo para cubrir el streaming; CLS del shop fue 0 en 3/3 corridas tras estabilizar el footer durante `loading`.

Evidencia CI y ambiente del incremento 5.3:

- PR [#42](https://github.com/MatiasMartinez90/pelu/pull/42), squash `98e0adf` hacia `dev`;
- CI verde: código/configuración, dependencias, 4m04s de matriz responsive y 4m31s de Lighthouse/budgets;
- workflow de deploy `29636577136` exitoso;
- GitOps PR [#14](https://github.com/MatiasMartinez90/agents-hetzner-k3s/pull/14), moneda `ARS` explícita sólo en `nox-dev`;
- Argo CD `Synced/Healthy` en revisión `7ef0465`, con web y API listas;
- checkout real en `shop-dev-nox.cloud-it.com.ar`: pedido #1 por ARS 21.000 con `pay_at_store`;
- cancelación real auditada: stock de `nox-sss` pasó 9 → 8 → 9 y el pedido quedó `cancelled`;
- el login real de `dev` conserva Google; la interacción del admin se cubrió por E2E porque una sesión Google no se automatiza con credenciales simuladas;
- los digests de demo y producción permanecieron sin cambios.

## Rollback

El frontend puede volver al digest anterior sin tocar pedidos. La migración 012 es aditiva sobre `products`; su reversión destructiva elimina datos comerciales y exige backup/export previo. En `dev`, antes de cualquier rollback de schema, se conserva el ledger, pedidos, items y carritos para auditoría.
