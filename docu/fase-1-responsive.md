# Fase 1 · Responsive y mobile

Estado: implementada sobre las superficies existentes en `dev`.

## Objetivo

Evitar regresiones de layout y de interacción táctil en el sitio público, el turnero y los tres portales autenticados. La tienda todavía no existe; `/shop` se incorpora a esta misma matriz cuando se implemente en la Fase 5.

## Matriz automatizada

| Proyecto | Motor | Viewport | Cobertura principal |
| --- | --- | --- | --- |
| `android-small` | Chromium móvil | 320 × 700 | teléfonos angostos |
| `android` | Chromium móvil | 390 × 844 | Chrome Android |
| `android-landscape` | Chromium móvil | 844 × 390 | orientación horizontal |
| `ios` | WebKit móvil | 390 × 844 | Safari iOS |
| `ipad` | WebKit táctil | 768 × 1024 | tablet |
| `desktop` | Chromium | 1440 × 1000 | escritorio ancho |

Rutas públicas verificadas: `/`, `/agendar`, `/servicios`, `/equipo`, `/galeria`, `/nosotros`, `/faq`, `/contacto` y `/login`.

Rutas autenticadas verificadas con perfiles demo y APIs determinísticas: `/admin`, `/barbero` y `/mi-cuenta`.

Cada ejecución valida:

- ausencia de overflow horizontal de página;
- targets del sistema de acciones de al menos 44 × 44 px;
- login e hidratación de los tres perfiles demo;
- render de datos privados simulados sin depender de infraestructura externa;
- `prefers-reduced-motion`;
- regresión visual del primer viewport del home en cada proyecto.

## Defectos corregidos

1. El footer imponía un ancho mínimo de 375 px y desbordaba en pantallas de 320 px.
2. Las estadísticas de `Nosotros` y `Mi cuenta` mantenían dos columnas demasiado angostas en teléfonos pequeños.
3. Las filas de agenda del barbero no refluían y el precio quedaba fuera del viewport.
4. Los controles de calendario y cantidad medían entre 26 y 32 px; ahora respetan 44 px y tienen nombres accesibles.
5. Las acciones principales y de newsletter no garantizaban altura táctil mínima.
6. Safari podía intentar interactuar con el login antes de su hidratación; los controles permanecen deshabilitados hasta estar operativos.

## Ejecución local

```bash
npx playwright install --with-deps chromium webkit
npm run test:responsive
```

Para aceptar un cambio visual intencional:

```bash
npm run test:responsive:update
```

## CI y artefactos

El workflow `responsive-visual` se ejecuta cuando cambian el frontend, assets, pruebas o configuración asociada. Ante un fallo conserva el reporte y los traces durante siete días. Todas las acciones de terceros están fijadas por SHA.

Resultado base de la Fase 1: **78/78 pruebas aprobadas**.

## Pendientes vinculados

- Agregar `/shop`, producto, carrito y checkout a la matriz durante la Fase 5.
- La validación manual en dispositivos físicos complementa WebKit/Chromium emulados antes del hito final.
- Zoom de texto al 200 %, teclado completo y auditoría WCAG exhaustiva pertenecen también a la Fase 2 (SEO, GEO y accesibilidad) y reutilizarán esta infraestructura.
