# Plan de performance y accesibilidad de NOX

## Objetivo

Convertir el sitio público, el flujo de reservas y el panel administrativo en una experiencia perceptiblemente inmediata, manteniendo consistencia de datos, seguridad y accesibilidad.

Este documento registra el diagnóstico realizado sobre el frontend Next.js, el backend FastAPI, PostgreSQL y el despliegue en Kubernetes. También define el alcance, las decisiones técnicas y los criterios de aceptación para la futura implementación.

## Estado actual medido

Las siguientes mediciones son muestras puntuales tomadas desde el host de análisis. Sirven como línea de base técnica, pero no reemplazan percentiles de usuarios reales:

| Recurso o métrica | Resultado observado |
|---|---:|
| Inicio `/` | TTFB aproximado de 92 ms |
| HTML de inicio | 48,7 KB |
| `/agendar` | TTFB aproximado de 359 ms |
| HTML de `/agendar` | 19,5 KB |
| API pública de barberos | Aproximadamente 202 ms y 951 B |
| API pública de servicios | Aproximadamente 82 ms |
| JavaScript inicial | Aproximadamente 192 KB gzip |
| CSS inicial | Aproximadamente 14 KB gzip |
| Video WebM del hero | 559 KB |
| Video MP4 alternativo | 925 KB |
| Poster del hero | 25 KB |
| Seis fotos del wizard | Aproximadamente 320 KB en total |

El navegador normalmente selecciona WebM o MP4 según compatibilidad; no se debe sumar automáticamente el peso de ambos como transferencia inicial.

El build de producción confirma que inicio, servicios, equipo, galería, FAQ y contacto se prerenderizan. `/agendar` se genera dinámicamente.

## Resultado de PageSpeed informado

PageSpeed Insights no dispone todavía de suficientes datos de usuarios reales y mostró el siguiente resultado de laboratorio:

| Métrica | Valor |
|---|---:|
| Performance | 89 |
| Accesibilidad | 96 |
| Buenas prácticas | 100 |
| SEO | 100 |
| FCP | 2,9 s |
| LCP | 2,9 s |
| TBT | 40 ms |
| CLS | 0,003 |
| Speed Index | 3,8 s |

TBT y CLS ya son excelentes. La pérdida principal está en la aparición tardía del primer contenido y del elemento visual principal. Por eso las primeras acciones deben concentrarse en el hero, las fuentes, el descubrimiento temprano de recursos y la cascada de datos de reservas.

El objetivo de laboratorio será llegar a 100 cuando las condiciones sean reproducibles, con un umbral de CI no inferior a 95. No se puede garantizar que toda ejecución externa de Lighthouse produzca siempre 100 porque la puntuación varía con la red, la carga y el entorno de prueba.

## Hallazgos principales

### Flujo de reservas

El navegador recibe el HTML de `/agendar`, descarga e hidrata React, consulta barberos, renderiza las tarjetas y recién entonces descubre las fotos. Después ejecuta otra consulta para servicios y una tercera para disponibilidad.

La latencia percibida proviene de la secuencia completa y no de una consulta PostgreSQL particularmente costosa:

```text
HTML dinámico
  -> JavaScript
    -> hidratación
      -> API de barberos
        -> render
          -> imágenes
```

### Imágenes

Las páginas editoriales principales ya utilizan `next/image`, pero el wizard de reservas utiliza imágenes convencionales para las fotos obtenidas desde PostgreSQL. Eso impide controlar adecuadamente variantes responsivas, prioridad, dimensiones y carga diferida.

Las imágenes institucionales dependen además de URLs externas de Unsplash. Esta dependencia agrega otra resolución DNS, conexión TLS y un servicio que no está bajo control operativo de NOX.

### Fuentes

La aplicación carga Geist y Oswald mediante `next/font`, y Archivo y Bodoni Moda mediante una hoja externa de Google Fonts. Hay cuatro familias y múltiples pesos. La hoja externa y las conexiones adicionales compiten con el recurso LCP.

### Navegación

Los enlaces internos se implementan mayormente con `<a href>`. Esto provoca recargas completas y desaprovecha navegación cliente y prefetch de Next.js.

### Hero

Todo el hero es un Client Component aunque sólo necesita JavaScript para controlar la transición del video. El poster también está declarado como fondo CSS, lo que dificulta priorizarlo como recurso LCP. El video, filtros, blur y animación permanente aumentan trabajo visual en dispositivos modestos.

### Datos institucionales

El frontend público todavía mantiene servicios, profesionales, contacto y preguntas frecuentes en estructuras hardcodeadas. El backend actual posee un endpoint institucional, pero el frontend no lo consume. La producción consultada todavía no exponía la versión actual de `/api/v1/site`, señal de que existe diferencia entre el código de la branch y el despliegue activo.

Cuando el contenido público se conecte a PostgreSQL, no debe transformarse en una consulta dinámica por cada visita. Debe entregarse desde Server Components con caché e invalidación controlada.

### Infraestructura de imágenes

Next.js tiene dos réplicas y cada pod utiliza un `.next/cache` efímero e independiente. Una transformación de imagen puede repetirse en cada réplica y se pierde al recrear el pod. Para una solución escalable conviene servir variantes ya transformadas desde storage y CDN propios.

### Panel administrativo

El Admin es un único Client Component de gran tamaño. Aunque se muestre solamente una sección, el navegador recibe el código de resumen, agenda, clientes, stock, agente, conversaciones, ajustes y disponibilidad.

La carga actual sigue esta secuencia:

```text
HTML
  -> hidratación del Admin completo
    -> BFF de Next.js
      -> validación de sesión
        -> FastAPI por red interna
          -> PostgreSQL
            -> render
```

El BFF interno, `no-store`, el índice de agenda y la ejecución paralela de las consultas del resumen son decisiones correctas que deben conservarse.

### Accesibilidad

El código contiene controles interactivos implementados como `div` o `span`, navegación y selectores sin semántica completa, botones sólo con símbolos, estados comunicados principalmente por color y mensajes dinámicos sin anuncios para lectores de pantalla. Estos patrones explican posibles descuentos del 96 informado y requieren una auditoría completa.

## Plan de implementación

### 1. Precargar barberos y servicios en el servidor

- Obtener el catálogo desde el Server Component de `/agendar`.
- Entregar barberos, servicios y relaciones en el HTML/RSC inicial.
- Consumir FastAPI por el servicio interno del clúster cuando la ejecución sea server-side.
- Mantener en el cliente únicamente la interacción del wizard y las consultas dinámicas de disponibilidad.
- Evitar el mensaje inicial `Cargando profesionales...` en condiciones normales.
- Definir fallback y manejo de errores si el backend no está disponible durante el render.

### 2. Reemplazar imágenes del wizard y mover fotos a CDN propio

- Sustituir `<img>` por `next/image` donde corresponda.
- Definir `width`, `height`, `sizes`, prioridad y lazy loading según viewport.
- Mantener sólo las primeras imágenes visibles con prioridad alta.
- Migrar fotos institucionales a object storage administrado por el proyecto.
- Generar variantes WebP/AVIF y tamaños responsivos.
- Servir los archivos con nombres versionados, CDN y caché `immutable`.
- Evitar que una caída de Unsplash afecte el sitio o el proceso de reserva.

### 3. Eliminar Google Fonts externo y reducir familias y pesos

- Servir Archivo y Bodoni Moda mediante `next/font` o archivos locales WOFF2.
- Preferir fuentes variables y subconjunto latino.
- Auditar el uso real de Geist y Oswald y eliminar las familias no necesarias.
- Definir estrategia `swap` u `optional` según el rol de cada fuente.
- Eliminar conexiones y permisos CSP de Google Fonts cuando ya no sean necesarios.

### 4. Migrar enlaces internos a `Link`

- Reemplazar enlaces internos por `next/link`.
- Conservar `<a>` para destinos externos, WhatsApp, Instagram, Maps y tienda.
- Agregar prefetch explícito sólo a rutas de alta intención, especialmente reservas.
- Incorporar límites de `loading.tsx` donde mejoren la navegación dinámica.
- Evitar prefetch indiscriminado de áreas autenticadas o pesadas.

### 5. Separar hero y FAQ en Server Components con islas interactivas

- Convertir el contenido estructural del hero en Server Component.
- Aislar el estado del video en un componente cliente mínimo.
- Convertir FAQ en contenido server-rendered.
- Usar `<details>/<summary>` o una isla accesible pequeña para el acordeón.
- Reducir HTML serializado e hidratación innecesaria.

### 6. Incorporar caché HTTP y tagged caching para información estable

- Cachear perfil, profesionales, servicios y relaciones de catálogo.
- Usar el modelo de caché vigente del proyecto Next.js y etiquetas de invalidación.
- Invalidar etiquetas después de cambios administrativos.
- Agregar `Cache-Control`, `ETag` y `stale-while-revalidate` a endpoints públicos estables.
- No aplicar caché pública a disponibilidad, reservas ni datos privados.
- Coordinar el caché de Next.js con el backend para evitar información indefinidamente obsoleta.

### 7. Consolidar consultas de disponibilidad y cancelar requests obsoletos

- Reducir round-trips PostgreSQL para obtener barbero, servicio, relación, reglas y ocupación.
- Mantener la reserva final como validación autoritativa ante carreras.
- Incorporar `AbortController` o identificadores de request en el cliente.
- Evitar que una respuesta vieja reemplace la fecha seleccionada más recientemente.
- Evaluar un caché de muy corta duración sólo si se preserva la validación transaccional al reservar.
- Medir con `EXPLAIN ANALYZE` antes de crear índices adicionales.

### 8. Optimizar video según dispositivo y conexión

- Hacer que el poster LCP sea descubrible y prioritario desde el HTML.
- Evaluar `preload="none"` para móvil, `Save-Data`, conexiones lentas y usuarios con movimiento reducido.
- Mostrar sólo poster cuando `prefers-reduced-motion` lo indique.
- Conservar video progresivo en dispositivos capaces sin bloquear contenido.
- Pausar animaciones y video cuando estén fuera de pantalla o la pestaña no esté visible.
- Revisar filtros, blur y composición en GPU en móviles de gama baja.
- Versionar video y poster para caché prolongada segura.

### 9. Agregar RUM para LCP, INP y CLS

- Capturar LCP, INP, CLS, FCP y TTFB desde usuarios reales.
- Separar resultados por ruta, móvil/escritorio, tipo de conexión y versión desplegada.
- Evitar datos personales en la telemetría.
- Enviar las métricas de forma diferida con `sendBeacon` o equivalente.
- Crear paneles p50, p75 y p95.
- Correlacionar regresiones con releases sin agregar scripts bloqueantes.

### 10. Establecer presupuestos de CI para JavaScript, imágenes y Core Web Vitals

- Medir HTML, JS, CSS, fuentes, imágenes y video durante CI.
- Ejecutar Lighthouse CI en perfiles móvil y escritorio reproducibles.
- Fallar CI ante regresiones superiores al margen acordado.
- Auditar rutas representativas: inicio, reservas, equipo, FAQ, login y Admin autenticado cuando el entorno lo permita.
- Guardar artefactos y comparativas por commit.
- Incorporar pruebas automáticas de accesibilidad con axe.

Presupuestos iniciales propuestos, a validar después del primer baseline reproducible:

| Presupuesto | Umbral inicial |
|---|---:|
| Lighthouse Performance | >= 95; objetivo 100 |
| Lighthouse Accessibility | 100 |
| LCP de laboratorio móvil | <= 2,5 s |
| TBT de laboratorio móvil | <= 150 ms |
| CLS | <= 0,1 |
| JavaScript inicial del Home | <= 205 KB gzip (baseline medido: 197,5 KB) |
| JavaScript inicial del Admin | <= 215 KB gzip (baseline medido: 205,3 KB) |
| CSS inicial | <= 25 KB gzip |
| Imagen individual no-LCP | <= 120 KB en viewport objetivo |
| Regresión permitida sin aprobación | 0 % en accesibilidad; <= 5 % en tiempos y bytes |

### 11. Performance del Admin y acceso privado a datos

- Dividir el Admin por secciones y chunks independientes.
- Evaluar rutas anidadas como `/admin/agenda`, `/admin/clientes` y `/admin/stock`.
- Obtener el resumen inicial en el servidor después de validar la sesión.
- Mantener el access token exclusivamente en servidor.
- Implementar caché privada con deduplicación, cancelación y stale-while-revalidate en memoria.
- Prefetch de secciones por intención del usuario, no de todo el Admin.
- Mantener datos anteriores durante cambios de fecha y filtros.
- Incorporar actualizaciones optimistas con rollback en mutaciones.
- Invalidar sólo los recursos afectados después de completar, cancelar o editar.
- Agregar paginación por cursor en clientes, eventos y conversaciones.
- Cancelar búsquedas y requests reemplazados por nuevas selecciones.
- Usar caché corta únicamente para datos de referencia no sensibles.
- No cachear públicamente agenda, clientes, métricas ni conversaciones.
- Evaluar eventos SSE/WebSocket para agenda y conversaciones cuando aporten valor.
- Medir por separado navegador, BFF, autenticación, backend y PostgreSQL.
- Agregar índices o agregaciones sólo después de observar consultas lentas reales.

### 12. Accesibilidad 100/100 y auditoría continua

- Sustituir controles `div/span onClick` por `button`, `a`, `input`, `details` y otros elementos nativos.
- Garantizar uso completo por teclado.
- Definir foco visible y orden lógico de tabulación.
- Agregar nombres accesibles a botones de calendario, navegación y cierre.
- Comunicar estados seleccionados con `aria-current`, `aria-selected`, `aria-pressed` o semántica nativa.
- Agregar `aria-live` para carga, errores y confirmaciones importantes.
- Revisar labels, instrucciones y asociación de errores en formularios.
- Revisar jerarquía de encabezados, landmarks y enlace de salto al contenido.
- Verificar contraste WCAG AA en texto, bordes, foco y estados deshabilitados.
- Evitar que el color sea la única forma de comunicar estado.
- Respetar `prefers-reduced-motion`.
- Validar zoom al 200 %, reflow móvil y tamaños mínimos de objetivos táctiles.
- Probar con teclado, axe, Lighthouse y al menos un lector de pantalla.
- Convertir accesibilidad 100 en requisito bloqueante de CI para las rutas acordadas.

## Estrategia de caché por tipo de dato

| Tipo de dato | Estrategia |
|---|---|
| Perfil, dirección y contacto | Caché pública, revalidación por etiqueta |
| Barberos, fotos y servicios | Caché pública, revalidación por cambios de Admin |
| Configuración no sensible del sitio | Caché pública o compartida según campo |
| Disponibilidad | `no-store` o TTL extremadamente corto con validación final |
| Creación/cancelación de reservas | Nunca cachear |
| Resumen del Admin | Caché privada en memoria y revalidación |
| Agenda y clientes | Privado, sin CDN; mantener datos anteriores durante refresh |
| Stock y settings | Privado, caché corta e invalidación después de mutar |
| Conversaciones | Privado y actualizado por polling eficiente o eventos |

## Criterios de aceptación funcionales

- Los profesionales aparecen en el primer render útil de `/agendar`.
- Cambiar rápidamente de fecha no puede mostrar slots de una selección anterior.
- Una reserva concurrente sigue siendo rechazada correctamente si el slot fue ocupado.
- Los cambios administrativos invalidan catálogo y contenido público de forma controlada.
- Las fotos no dependen de URLs externas de terceros.
- El sitio sigue siendo utilizable sin video y con movimiento reducido.
- La navegación pública no recarga documentos completos innecesariamente.
- Ningún dato privado del Admin se almacena en caché pública o CDN.
- El Admin conserva consistencia después de mutaciones optimistas y rollback.
- Los flujos principales funcionan completamente con teclado.

## Criterios de aceptación de performance

- Performance Lighthouse >= 95 en CI y objetivo de 100 en la configuración de referencia.
- Accesibilidad Lighthouse igual a 100.
- Sin regresiones en Buenas Prácticas ni SEO.
- LCP móvil de laboratorio <= 2,5 s.
- TBT móvil <= 150 ms y CLS <= 0,1.
- RUM preparado para evaluar p75 móvil cuando exista volumen suficiente.
- Presupuestos de recursos y reportes comparativos disponibles en cada PR.
- `/agendar` no espera a hidratar para descubrir catálogo e imágenes iniciales.
- Cada sección del Admin descarga solamente el código necesario para esa sección.

## Verificación prevista

1. Build de producción y tests existentes.
2. Tests de backend, reservas, caché e invalidación.
3. Análisis de bundles por ruta.
4. Lighthouse CI móvil y escritorio con varias ejecuciones.
5. axe automatizado sobre rutas públicas y Admin.
6. Navegación manual por teclado y lector de pantalla.
7. Pruebas con red y CPU limitadas.
8. Pruebas con `Save-Data` y `prefers-reduced-motion`.
9. Pruebas de concurrencia de reservas.
10. Revisión de cabeceras HTTP, CDN y ausencia de datos privados cacheados.
11. Comparativa documentada antes/después.

## Secuencia recomendada

1. Crear baseline reproducible y presupuestos iniciales.
2. Optimizar fuentes y recurso LCP del hero.
3. Implementar bootstrap server-side del catálogo de reservas.
4. Migrar imágenes a storage/CDN y ajustar `next/image`.
5. Migrar navegación y reducir Client Components.
6. Implementar caché e invalidación de contenido estable.
7. Optimizar disponibilidad y carreras de requests.
8. Dividir y optimizar Admin.
9. Corregir accesibilidad de todos los flujos afectados.
10. Agregar RUM y cerrar presupuestos definitivos de CI.

La implementación deberá realizarse en una branch nueva, con commits revisables y un PR que incluya resultados antes/después, decisiones, pruebas ejecutadas y cualquier desviación justificada de este plan.

## Registro de implementación

Branch: `feat/frontend-performance-accessibility`.

- Catálogo de reservas precargado en Server Component mediante un único endpoint bootstrap, con caché etiquetada e invalidación desde el BFF.
- Fotos del equipo versionadas bajo `/media/team`, con migración SQL reversible y cabeceras inmutables preparadas para un CDN propio.
- Fuentes autohospedadas por `next/font`, sin requests runtime a Google, dos familias variables y carga `optional`.
- Navegación interna migrada a `Link`; hero y FAQ renderizados en servidor y video aislado como mejora progresiva.
- Disponibilidad validada con una consulta consolidada; requests obsoletos cancelados con `AbortController`.
- Video omitido en móvil, `Save-Data`, 2G y movimiento reducido; poster LCP precargado.
- RUM de FCP, LCP, CLS, INP y TTFB segmentado por ruta, dispositivo, conexión y release, sin PII.
- Admin con preload autenticado por intención, caché privada, invalidación después de mutaciones, búsqueda cancelable y clientes paginados por cursor.
- Controles interactivos migrados a semántica nativa, foco visible, skip link, estados ARIA y regiones live.
- Presupuestos bloqueantes para JavaScript, CSS, poster y video; Lighthouse móvil y escritorio bloqueantes en CI.

Baseline de recursos del build de producción:

| Ruta/recurso | Resultado |
|---|---:|
| Home JavaScript inicial | 197,5 KB gzip |
| Home CSS inicial | 15,4 KB gzip |
| Admin JavaScript inicial | 205,3 KB gzip |
| Admin CSS inicial | 15,4 KB gzip |
| Poster del hero | 25,5 KB |
| Video WebM | 558,8 KB |

La corrida local final de Lighthouse Desktop confirmó **100 Performance, 100 Accesibilidad, 100 Buenas Prácticas y 100 SEO**, con FCP 0,3 s, LCP 0,7 s, TBT 20 ms, CLS 0 y Speed Index 0,7 s. En móvil, Accesibilidad, Buenas Prácticas y SEO también resultaron 100. La performance móvil debe tomarse de las tres corridas reproducibles de CI: el Chromium Snap del host varió el TBT entre 270 ms y 1.330 ms sobre el mismo build y no se usa como baseline estable. El RUM observado durante esas corridas registró LCP entre 0,7 y 2,3 s. El objetivo externo continúa siendo 100 y el gate estable se mantiene en 95 para no prometer que una ejecución variable de PageSpeed siempre resulte exactamente 100.
