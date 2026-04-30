## Changelog

### v4.7.1
- **Fix crítico** — `haptic()` definida dentro de `<script src="firebase-app-compat.js">` en 12 apps: los navegadores ignoran el contenido inline de scripts con atributo `src`, por lo que la función **nunca se ejecutaba**. Causa raíz de todos los `ReferenceError: haptic is not defined`. Movida a un `<script>` standalone en las 21 apps HTML.
- **Fix** — Meta tag `apple-mobile-web-app-capable` deprecado → añadido `mobile-web-app-capable` en todas las apps.
- `sw.js` v10.7, manifest v4.7.1

### v4.7.0
- **Limpieza** — Minificación CSS en 20 apps: bloques `<style>` compactados (~11 KB ahorrados en total).
- **Limpieza** — Trailing whitespace y líneas en blanco múltiples eliminados de todos los archivos.
- **Docs** — `README.md`: changelog completo con todas las entradas faltantes de v4.1.0 a v4.6.2.
- `sw.js` v10.6, manifest v4.7.0


### v4.6.2
- **Fix** — `despensa.html`: `render()` sin definición en listeners `wapps:recovered` → corregido a `renderDespensa()`.
- `sw.js` v10.5, manifest v4.6.2

### v4.6.1
- **Fix** — `coches`, `ninos`, `obra`, `suministros`: `haptic()` no definida (`ReferenceError`) al añadir elementos — la limpieza del boilerplate había eliminado la función.
- **Fix** — `index.html`: `hero-info-grid` con 7 bloques en grid de 3 columnas fijas dejaba un hueco vacío → cambiado a `auto-fit / minmax(120px,1fr)`.
- `sw.js` v10.4, manifest v4.6.1

### v4.6.0
- **Limpieza L12** — Eliminado boilerplate sync inline de 16 apps (~35 KB): `_fb()`, `_sync()`, `updateSyncUI()`, `manualSync/Pull/PushApp()`. Todas usan `wapps-sync-ui.js`.
- **Limpieza L13** — `manualPull()` centralizado en módulo.
- **Rendimiento P3** — Debounce 200ms en `save()` añadido a `compra`, `decisor`, `deseados`, `finanzas`, `mascotas`, `semana`, `setlist`.
- `sw.js` v10.3, manifest v4.6.0

### v4.5.1
- **Fix crítico** — `suministros.html`: HTML de predicciones inyectado dentro del `<script>` → SyntaxError que rompía tabs y navegación.
- **Fix crítico** — `coches.html`, `ninos.html`, `obra.html`: debounce partió `_saveImmediate()` separando `try` del `catch` → SyntaxError silencioso, imposible añadir elementos.
- `sw.js` v10.2, manifest v4.5.1

### v4.5.0
- **Fix crítico** — `wuid()` devolvía UUID con guiones en 16 apps → `onclick="fn(${id})"` generaba JS inválido. Revertido a `Date.now()` numérico.
- **Fix crítico** — Sync nunca quedaba a la par: `WStore.set()` y `pushToFirestore()` generaban `_updatedAt` distintos → Firebase siempre más nuevo → descarga infinita. Arreglado con `pushToFirestoreExact()`.
- **Fix** — `manualPull()` hacía `location.reload()` en 14 apps → cambiado a `wapps:recovered` (sin recarga).
- **Fix** — Botón SYNC requería `pendingCount > 0` en 4 apps → habilitado con solo online+usuario.
- **Nuevo** — Favicon dinámico en `index.html`: 🟢/🟡/🔴 según estado de red y pendientes (Canvas 32×32px).
- **Nuevo** — iPad landscape: media queries `orientation:landscape` en 19 apps, grids ampliados, `max-width:900px`.
- **Nuevo** — Haptic en 8 apps restantes: `obra`, `coches`, `ninos`, `setlist`, `instrumentos`, `finanzas`, `suministros`, `backup`.
- **Nuevo** — `B4`: IDs con `wuid()` = `Date.now()` — sin colisiones entre dispositivos en uso real.
- **Mejora** — Hero index: "Latencia" → "Datos en Firebase" (KB sincronizados / 1 MB, porcentaje, aviso pendientes).
- `sw.js` v10.1, manifest v4.5.0

### v4.4.0
- **Nuevo** — Categorización automática de gastos: "Mercadona"→supermercado, "Repsol"→gasolina (30 reglas, ~80% cobertura).
- **Nuevo** — Búsqueda global: prefijo `>` en el buscador del index busca en gastos, tareas, despensa y compra.
- **Nuevo** — Alertas de cumpleaños en `mascotas` y `ninos`: toast al abrir si hoy es el día.
- **Nuevo** — Predicción de próxima factura en `suministros`: fecha estimada + días restantes con color.
- **Nuevo** — Stats por día de semana en `gastos-diarios`: barras horizontales Lun-Dom.
- **Nuevo** — Panel de errores de sync en `ajustes`: log últimos 20 fallos con timestamp.
- **Nuevo** — Stats por app en `ajustes`: grid con nº items, KB y fecha de última edición.
- **Nuevo** — Quick-add en `despensa`: barra inline para añadir productos sin formulario completo.
- **Nuevo** — Quick-new en `suministros`: botones ⚡/🔥/💧 que abren formulario con tipo preseleccionado.
- **Nuevo** — Detección de duplicados en `deseados` por nombre normalizado.
- **Mejora** — `inputmode="decimal"` en 36 inputs numéricos (coches, mascotas, ninos, obra, finanzas, gastos-diarios).
- **Mejora** — `aria-label` en botones icon-only en `coches`, `finanzas`, `obra`, `setlist`.
- **Mejora** — Haptic feedback, View Transitions API, Pull-to-refresh universal vía `wapps-nav.js`.
- **Fix** — B2: `localStorage` limpiado al logout.
- **Fix** — L2: 11 reglas CSS muertas eliminadas de `ninos.html`.
- **Fix** — L1: Modal QR y funciones muertas eliminados de `setlist.html`.
- `sw.js` v10.0, manifest v4.4.0

### v4.3.0
- **Nuevo** — SW cachea Firebase SDK, Fonts y jsPDF (Cloudflare) — app arranca 100% offline.
- **Nuevo** — Dashboard pausa `setInterval` cuando pestaña oculta (ahorra batería).
- **Nuevo** — Prefetch on hover/touchstart en tarjetas del index → navegación instantánea.
- **Nuevo** — Modo claro `index.html`: `.cmd-bar`/`.cmd-dropdown`/`.icon-card:hover` con colores hardcoded → variables CSS.
- **Fix** — Debounce 200ms en `save()`: `ninos`, `obra`, `coches`, `gastos-diarios`, `suministros`.
- **Fix** — Shortcuts manifest mejorados (Semana añadida, Gastos primero).
- **Fix** — Latencia muestra `—` inmediato al perder conexión.
- `sw.js` v9.6, manifest v4.3.0

### v4.2.1
- **Nuevo** — Prefetch dinámico en `index.html`: `<link rel="prefetch">` al primer hover/touchstart por tarjeta.
- **Fix** — `index.html`: `.cmd-bar` hardcoded `#111110` → `var(--bg2)`.

### v4.2.0
- **Fix crítico** — `pullFromFirestore` preserva `_updatedAt` — causa raíz de que iPad nunca recibía datos del móvil.
- **Nuevo** — Monitor de latencia en `wapps-firebase.js`: ping Cloudflare 30s, `wapps:latency`, corrige `navigator.onLine`.
- **Nuevo** — Auth event replay: `wapps:auth-change` se reemite al DOMContentLoaded (arregla "semana offline").
- **Nuevo** — `WFirebase.setOnline()`, `WFirebase.getLastAuth()`.
- **Nuevo** — `wapps-pdf.js`: WPDF con jsPDF lazy-load en `gastos-diarios`, `obra`, `suministros`, `setlist`.

### v4.1.1
- **Fix crítico** — `pullFromFirestore` borraba `_updatedAt` → `syncOnLoad` comparaba con timestamp 0 → iPad nunca recibía datos del móvil.
- **Nuevo** — Indicador de latencia en hero del index.
- **Mejora** — Hero del index: 6 bloques de info útil.

### v4.1.0
- **Fix** — Botón SYNC habilitado sin requerir pendientes > 0 (13 apps).
- **Mejora** — Responsive: body full-width, contenido centrado sin bordes en iPad.
- **Nuevo** — `wapps-nav.js`: ESC y swipe desde borde izquierdo vuelven al home.

### v4.0.0

**Versión mayor** con correcciones críticas, rediseño del panel de inicio, responsive completo y mejoras de rendimiento.

**🔴 Fix crítico — upload a Firebase roto en 4 apps**
- `wapps-firebase.js` · `LEGACY_MAP` estaba mal mapeado y faltaba `mascotas` por completo:
  - `compra.data` → `compra_v2` (antes: `compra_v1` ❌)
  - `deseados.data` → `deseados_v2` (antes: `deseados_v1` ❌)
  - `obra.data` → `obra_multiproj_v1` (antes: `miobra_v2` ❌)
  - `mascotas.data` → `mascotas_v1` (**antes: no existía en el mapa** ❌)
- **Consecuencia**: si tenías datos guardados en claves legacy de estas apps (instalación previa a v3.12), `_readLocal()` no los encontraba al hacer push → nunca se subían a Firebase ni migraban a `wapps.*`. De ahí que coches/mascotas pareciesen no subir nada.
- Verificación completa de las 13 apps sincronizadas: todas consistentes.

**🎨 Rediseño — index.html (panel de inicio)**
- Eliminado "MIS HERRAMIENTAS" y el carrusel ticker con nombres desplazándose horizontalmente.
- Nuevo **dashboard con 4 widgets** en el home que muestran datos reales:
  1. **Hoy** — tareas del día de `semana.data` (lista de checks con pendientes en negrita)
  2. **Gasto rápido** — form inline (importe · concepto · categoría · ✓ Añadir) que escribe directamente a `wapps.gastos.data` con marca pendiente
  3. **Próximamente** — próximos 7 días con tareas no hechas del calendario
  4. **Sincronización** — última sync, último backup local, nº pendientes (se actualiza al sync-done)
- **Rediseñadas las categorías**: antes sidebar vertical negra de 72 px, ahora pills horizontales arriba con scroll horizontal, icono + label + count, línea de acento por categoría (verde · amarillo · morado · azul · gris).
- Grid de apps ahora responsive: 3 cols móvil → 4 cols tablet → 5 cols desktop.

**📱 Responsive iPad/Android/web**
- Media queries añadidas a 19 apps:
  - ≥720 px: `body` con `max-width:720px` + centrado con sombra lateral
  - ≥1024 px: `body` con `max-width:900px`
- En móvil todo se comporta igual que antes.

**🧭 Navegación entre páginas mejorada**
- Nuevo `wapps-nav.js` (1.4 KB) cargado con `defer` en 21 HTML:
  - Tecla **ESC** → vuelve a `index.html` (ignorada en inputs/modales activos)
  - **Swipe** desde borde izquierdo (>80 px) → vuelve a `index.html`
- Los botones `.wnav-back` ya existentes siguen funcionando.

**🌓 Modo claro del OS**
- `color-scheme: dark` añadido al `:root` de los 22 HTML. Esto fuerza al navegador a renderizar scrollbars, inputs nativos y controles del sistema en tema oscuro aunque el OS esté en modo claro (antes aparecían en negro sobre negro).

**🔄 Botón SYNC con feedback**
- `manualSync()` en 13 apps: ahora muestra `✓ Al día` si no había pendientes, `✓ N` si subió N entradas, o `⚠ N/M` si falló algo. El texto vuelve al original a los 2.5 s.

**⚡ Rendimiento**
- `<link rel="preconnect">` a `fonts.googleapis.com`, `fonts.gstatic.com` y `firestore.googleapis.com` en 19 HTML. Reduce el handshake TLS en primera carga (~100-300 ms por dominio en móvil 4G).
- `obra.html`: fusionados 2 `<link>` de Google Fonts en uno.
- Icon grid del index pasó de 3 cols fijas a 3→4→5 según viewport.

**Bumps**
- `sw.js` v8.9 → v9.0 (cambio mayor de caché, limpieza automática al activar)
- `manifest.json` v3.13.0 → v4.0.0
- Nuevo archivo: `wapps-nav.js`

### v3.12.0
- **Fix crítico** — `suministros.html`: doble llave `{{ }}` en `manualPushApp` corregida (JS crasheaba silenciosamente → el botón ⬆ SUBIR no funcionaba)
- **Fix crítico** — `decisor.html`: faltaban los SDK de Firebase (`firebase-app-compat`, `firebase-auth-compat`, `firebase-firestore-compat`), `wapps-config.js`, `wapps-store.js` y `wapps-firebase.js`. El código usaba `_fb()` y `_sync()` pero nunca existían → ahora sincroniza correctamente con Firebase
- **Fix crítico** — `decisor.html`: `loadState()`/`save()` migrados de `localStorage('decisor_v1')` directo a `WStore.get/set('decisor','data')` con fallback legacy → los datos ahora se suben a Firestore
- **Fix** — 14 apps (`coches`, `compra`, `deseados`, `despensa`, `finanzas`, `gastos-diarios`, `instrumentos`, `mascotas`, `ninos`, `obra`, `semana`, `setlist`, `suministros`, `ajustes`): el handler `wapps:auth-change` no llamaba a `updateSyncUI()` → los botones ↓ PULL y ↑ SYNC quedaban `disabled` para siempre si cargabas la página ya logueado. Ahora se habilitan cuando Firebase confirma la sesión
- **Fix** — `ajustes.html`: añadido listener `wapps:recovered` (re-renderiza usuario y stats de storage al recuperar datos de Firestore)
- **Fix** — `decisor.html`: añadidos listeners `wapps:auth-change` (con `syncOnLoad`) y `wapps:recovered`
- **Fix** — `backup.html`: añadido listener `wapps:auth-change` (antes los botones nunca se habilitaban tras login porque no había handler que actualizase el estado de la UI)
- `sw.js` v8.8 — bump de caché para forzar actualización en PWAs instaladas
- `manifest.json` — descripción actualizada a v3.12.0

### v3.11.1
- **Fix** — `semana.html`: doble llave en `manualPushApp` corregida
- **Fix** — `finanzas`, `gastos-diarios`, `deseados`, `mascotas`, `coches`: doble llave en `manualPushApp` corregida
- **Fix** — `firebase-upload.html`: sesión Firebase ahora se detecta correctamente con `onAuthChange` + retry (9s)
- **Mejora** — Version badge `v1.x` añadido al wnav de todas las apps que no lo tenían
- **Añadido** — `despensa.html` y `semana.html` al repositorio de outputs
- **Añadido** — `setlist.html`: botones PULL y SUBIR en sync-bar

### v3.11.0
- **Onboarding** — tutorial de bienvenida añadido a 10 apps que no lo tenían: Instrumentos, Finanzas, Gastos Diarios, Suministros, Deseados, Mascotas, Coches, Niños, Mi Obra y Setlist. Cada app muestra 4 pasos explicativos la primera vez que se abre, con botón «👋 Ver guía de nuevo» en la sección de datos
- **index.html** — versión actualizada a v3.11.0, changelog interactivo actualizado, banner de actualización del Service Worker (aparece cuando hay una nueva versión disponible)
- **ajustes.html** — botón «⬆ Subir todo a Firebase» rediseñado como link-row discreto; abre panel con las 13 entidades individuales para subir seleccionando

### v3.10.1
- **Fix crítico** — `obra.html`, `compra.html`, `instrumentos.html`, `ninos.html`: JS roto por doble llave `${{var}}` en `manualPushApp()` → corregido a `${var}`
- **Fix** — `instrumentos.html`, `ninos.html`, `obra.html`: función `esc()` reescrita sin `/</g` ni `/"/g` en regex (causaban `Unexpected token` en vm.Script y algunos browsers)
- **Fix visual** — `obra.html`: `.btn-danger` añadido `background:rgba(240,64,48,0.08)` — botones Eliminar ahora visibles
- **Fix backup** — `backup.html`: `mascotas`, `coches` y `ninos` ahora incluidas en backup completo (`wkey` era `null`)

### v3.9.0
- **Fix** — `WSync.pushAll()` ahora lee claves legacy (`gastos_v1`, `compra_v1`, `semana_v2`, etc.) si `wapps.*` está vacío. Los datos que nunca pasaron por `WStore.set()` ahora se suben a Firebase al pulsar ⬆ SUBIR TODO
- `_readLocal()`: al encontrar datos en clave legacy, los migra al vuelo a `wapps.*` para que lecturas futuras sean directas
- Botón ⬆ SUBIR TODO: muestra resultado `✓ N SUBIDAS` o `⚠ N/M FAIL` 4 segundos tras completar
- Botón ⬆ SUBIR (por app): ídem, 3 segundos
- `sw.js` v8.7

### v3.8.0
- **Fix** — botón ⬆ SUBIR tenía HTML pero no función `manualPushApp()` en 11 apps — ahora funciona en todas
- **Fix** — `updateSyncUI()` ahora habilita y deshabilita correctamente los botones ↓ PULL y ⬆ SUBIR en todas las páginas
- `sw.js` v8.6

### v3.7.0
- **Fix crítico** — Firebase SDK (`firebase-app-compat`, `firebase-auth-compat`, `firebase-firestore-compat`), `wapps-config.js` y `wapps-firebase.js` añadidos al `<head>` de las 13 páginas de app. Antes `WFirebase` y `WSync` eran siempre `undefined` al abrir cualquier app directamente — todo el sync funcionaba solo desde `index.html`
- Los botones ↑ SYNC, ↓ PULL y ⬆ SUBIR ahora operan correctamente en cualquier página
- `syncOnLoad`, `wapps:auth-change` y `wapps:recovered` se ejecutan realmente en todas las apps
- `sw.js` v8.5

### v3.6.0
- **Fix crítico** — `wapps-store.js` ahora se carga correctamente en todas las apps: `coches`, `deseados`, `finanzas`, `gastos-diarios`, `mascotas`, `semana`, `setlist`, `suministros`, `instrumentos`, `ninos`. Antes el script no estaba en el `<head>` y todos los guards `typeof WStore !== 'undefined'` devolvían `false` — Firebase nunca recibía datos de estas apps
- `gastos-diarios.html` — conectado a Firebase: `load()`/`save()` pasan por `WStore.get/set('gastos','data')` + `syncOnLoad` + `wapps:auth-change` + `wapps:recovered`
- `WTransition` inline eliminado de 8 páginas — `wapps-store.js` ya lo incluye, era código duplicado
- `sw.js` v8.4 — bump de caché

### v3.5.0
- `wapps-firebase.js` — `WSync._mergeArrays(localArr, remoteArr, idField)`: merge inteligente de arrays por `id` — une items de ambos dispositivos en lugar de machacar uno con el otro
- `wapps-firebase.js` — `WSync.pullAll()`: si la diferencia entre versiones local y remota es menor de 24h, aplica merge inteligente en lugar de reemplazar (despensa·alimentos, compra·items, deseados·items, setlist·canciones/bandas, mascotas·pets, coches·cars, ninos·kids, suministros·facturas, finanzas·ingresos/gastos, instrumentos·items, obra·proyectos)
- `wapps-firebase.js` — `WSync._mergeArraysForKey()`: helper público usado también por `syncOnLoad`
- `wapps-store.js` — `WStore.syncOnLoad()`: usa merge inteligente cuando `WSync._mergeArraysForKey` está disponible y la diferencia < 24h
- `nextId` se ajusta al máximo de local y remoto en cada merge — evita colisiones de id entre dispositivos

### v3.4.0
- `wapps-firebase.js` — nuevo `WSync.pushAll(uid, filterKey?)`: fuerza subida completa a Firestore ignorando estado de pendientes
- `index.html` — botón **⬆ SUBIR TODO** en sync-bar global: sube todas las apps a Firebase de golpe
- Todas las apps — botón **⬆ SUBIR** individual en sync-bar: fuerza subida de los datos de esa app
- Todas las apps — botón **↓ PULL** en sync-bar: descarga datos desde Firebase manualmente
- `instrumentos.html`, `ninos.html` — sync-bar completa añadida (faltaba desde v3.1.1)
- **Fix crítico** — `syncOnLoad` + `wapps:auth-change` en todas las apps: si Firebase tarda en confirmar la sesión al cargar la página, los datos remotos ahora se aplican correctamente en cuanto el usuario se autentica (compra, despensa, semana, mascotas, coches, deseados, ninos, obra, setlist, suministros, finanzas, instrumentos)
- `wapps:recovered` extendido a todas las apps: reaccionan y re-renderizan al recuperar datos de Firestore tras un wipe de localStorage
- `sw.js` v8.3 — bump de caché para forzar actualización en PWAs instaladas


- `wapps-store.js` — `WStore.set()` captura `QuotaExceededError` y muestra banner de alerta en lugar de fallar silenciosamente
- `wapps-store.js` — `_mergeByField()`: merge campo a campo en sincronización en tiempo real — ediciones simultáneas en campos distintos ya no se pierden
- `wapps-store.js` — `_realtimeRegistry`: todos los listeners `onSnapshot` se registran y se limpian automáticamente en `pagehide` — sin conexiones Firestore huérfanas
- `wapps-store.js` — `_showRealtimeToast()`: toast verde sutil cuando llega una actualización desde otro dispositivo
- `wapps-store.js` — `WUpdate.dismiss()` persiste en `sessionStorage` — el banner reaparece al navegar a otra página si no se ha recargado
- `wapps-firebase.js` — detección de credenciales placeholder en `wapps-config.js` — aviso claro en consola y modo local en lugar de inicializar Firebase con valores de ejemplo
- `wapps-firebase.js` — expiración de sesión por inactividad (8 h por defecto, configurable con `sessionTimeoutHours` en `wapps-config.js`) — cierre automático en dispositivos compartidos
- `wapps-firebase.js` — `WSync` hace flush de pendientes en `visibilitychange` y `pagehide` — los cambios offline se suben al cerrar la pestaña si hay red
- `wapps-firebase.js` — `WSync` reintenta pendientes al autenticar (por si había cambios antes del login)
- `sw.js` v8.2 — precaché reducido al núcleo (módulos JS + `index.html` + fallbacks). El resto de páginas se cachean la primera vez que se visitan (lazy cache) — instalación más rápida y menos consumo de datos

### v3.3.1
- `sw.js` — estrategia stale-while-revalidate para HTML (antes cache-first puro). El SW ya no bloquea la activación con `skipWaiting`; espera a que el usuario confirme
- `sw.js` — detecta cambios de contenido por ETag/Last-Modified y notifica a los clientes con `postMessage({ type: 'UPDATE_AVAILABLE' })`
- `wapps-store.js` — nuevo módulo `WUpdate`: banner de actualización no intrusivo con botón "Recargar" y opción de ignorar. Compatible con el patrón SW `waiting`
- `wapps-firebase.js` — nuevo método `WFirebase.watchDocument(uid, key, callback)`: listener `onSnapshot` sobre un documento Firestore
- `wapps-store.js` — nuevo método `WStore.watchRealtime(app, key, onUpdate)`: sincronización en tiempo real entre dispositivos. Aplica cambios remotos solo si `_updatedAt` remoto es más reciente

### v3.3.0
- `WTheme` reescrito — sistema de temas completo: modo dark/light, 6 colores de acento, 3 tamaños de fuente
- Los cambios de tema se aplican via `<style>` inyectado que cubre también inline styles
- Anti-flash en páginas sin wapps-store: tema aplicado antes del primer render
- `ajustes.html` — panel de apariencia completo con selector de acento y botones de fuente

### v3.2.0
- `WTheme` — dark/light mode toggle en ajustes, persistido en localStorage
- `WSkeleton` — skeleton loaders y empty states con botón de acción
- `WPDF` — exportación a PDF en gastos-diarios, obra y suministros (jsPDF)
- `sw.js` — precaché tolerante a fallos con `Promise.allSettled`
- `finanzas.html` — bridge suministros usa WStore en lugar de clave legacy
- Empty states mejorados con botón de acción en coches, mascotas, instrumentos, deseados, setlist, suministros

### v3.1.0
- `mascotas.html`, `deseados.html` y `finanzas.html` conectados a WStore y Firebase
- `mascotas_v1` y `deseados_v2` añadidos al mapa de migración legacy
- Barra de sync (ONLINE/OFFLINE/SINCRONIZANDO) extendida a todas las páginas restantes

### v3.0.0
- Versión mayor — consolidación de todas las mejoras desde v2.2.0
- `offline.html`, `404.html` y `ajustes.html` excluidos del grid de apps
- `ajustes.html` accesible desde el botón ⚙️ del panel principal

### v2.10.0
- `wapps-config.js` — credenciales Firebase separadas del código fuente
- `wapps-config.example.js` — plantilla para nuevos desarrolladores
- `.gitignore` — `wapps-config.js` excluido del repo
- `wapps-firebase.js` — lee config desde `window.WAPPS_CONFIG` con aviso claro si falta
- SW v8: `wapps-config.js` en precaché

### v2.9.0
- `WTransition` — fade-out/in de 160ms entre todas las páginas, sin parpadeo blanco

### v2.8.0
- `ajustes.html` — página central de ajustes

### v2.7.0
- Eliminadas claves legacy de `wapps-store.js`
- Añadida `migrateLegacy()` — migración one-shot al arrancar

### v2.6.0
- `semana.html`, `instrumentos.html` y `setlist.html` conectados a WStore y Firebase

### v2.5.0
- Firebase SDK actualizado de 9.23.0 a 11.6.0
- `404.html` — página de error con accesos directos

### v2.4.0
- Indicador de sync (ONLINE/OFFLINE/SINCRONIZANDO) extendido
- `coches.html` y `ninos.html` conectados a WStore y Firebase

### v2.3.0
- Offline completo: todas las páginas HTML en precaché del SW
- `offline.html` como fallback con redirección automática

### v2.2.0
- `WStore` y `WNotify` — bus de datos y sistema de notificaciones
- `WSync` — cola de pendientes offline con merge por timestamp

### v2.1.0
- Service Worker con estrategia network-first para HTML

### v2.0.0
- Integración Firebase Auth + Firestore
- Sincronización multi-dispositivo
