# W//APPS

Panel de herramientas personales en formato PWA. Funciona como aplicación instalable en móvil y escritorio, con soporte offline completo y sincronización opcional con Firebase.

---

## Módulos incluidos

| App | Archivo | Descripción |
|---|---|---|
| 🏠 Inicio | `index.html` | Panel principal y acceso a todas las apps |
| 🥦 Despensa | `despensa.html` | Inventario con alertas de caducidad |
| 🛒 Compra | `compra.html` | Lista de la compra con categorías y establecimientos |
| 💰 Gastos | `gastos-diarios.html` | Control de gastos diarios |
| 📊 Finanzas | `finanzas.html` | Ingresos, gastos fijos y presupuesto mensual |
| 💡 Suministros | `suministros.html` | Registro de facturas de luz, gas y agua |
| 🏗️ Mi Obra | `obra.html` | Gestión de tareas y gastos de reforma |
| 🚗 Coches | `coches.html` | Mantenimiento, servicios y repostajes |
| 🐾 Mascotas | `mascotas.html` | Salud y seguimiento de mascotas |
| 👶 Niños | `ninos.html` | Registro de hitos y crecimiento |
| 🎸 Instrumentos | `instrumentos.html` | Inventario de equipo musical |
| 🎵 Setlist | `setlist.html` | Listas de canciones para actuaciones |
| ❤️ Deseados | `deseados.html` | Lista de deseos y seguimiento de precios |
| 📅 Semana | `semana.html` | Planificador semanal |
| 🎲 Decisor | `decisor.html` | Herramienta de toma de decisiones |
| 💾 Backup | `backup.html` | Copia de seguridad y sincronización Firebase |

---

## Arquitectura

```
localStorage (siempre)
    └── WStore.get / WStore.set
            └── WSync (cola offline)
                    └── Firebase Firestore (cuando hay sesión y red)
                            └── onSnapshot (tiempo real → WStore.watchRealtime)
```

- **Sin conexión**: todo funciona con `localStorage`. Los cambios se marcan como pendientes en `wapps.pending` (persiste entre sesiones).
- **Con conexión y sesión**: los datos se suben a Firestore automáticamente. Gana siempre el más reciente por `_updatedAt`. Al cerrar la pestaña, `WSync` hace un flush de pendientes vía `visibilitychange`/`pagehide`.
- **Tiempo real**: `WStore.watchRealtime` mantiene un listener `onSnapshot` activo con merge campo a campo. Los listeners se limpian solos en `pagehide`. Un toast sutil confirma cada actualización remota.
- **Service Worker** (`sw.js` v8.7): precaché reducido al núcleo; el resto se cachea al visitar (lazy). Estrategia stale-while-revalidate para HTML con banner de actualización no intrusivo.
- **Seguridad**: sesión expira tras 8 h de inactividad (configurable). Credenciales placeholder en `wapps-config.js` se detectan al arrancar.
- **Resiliencia**: `QuotaExceededError` de localStorage muestra banner de alerta en lugar de fallar silenciosamente.

---

## Módulos compartidos

| Archivo | Descripción |
|---|---|
| `wapps-store.js` | Bus de datos (`WStore`), notificaciones (`WNotify`), cola offline, banner de actualización (`WUpdate`) |
| `wapps-firebase.js` | Auth con Google y sincronización Firestore (`WFirebase`, `WSync`) |
| `wapps-onboarding.js` | Sistema de onboarding para nuevos usuarios |
| `sw.js` | Service Worker — offline, caché, detección de actualizaciones |
| `manifest.json` | Manifiesto PWA — iconos, shortcuts, colores |
| `offline.html` | Página de fallback cuando no hay red ni caché |

---

## Instalación

### Como PWA (recomendado)
1. Sube todos los archivos a tu servidor o GitHub Pages
2. Abre la URL en Chrome o Safari
3. Instala con "Añadir a pantalla de inicio"

### Como APK (Android)
Generada con [PWABuilder](https://pwabuilder.com) — Trusted Web Activity (TWA). Las notificaciones y el Service Worker funcionan exactamente igual que en el navegador.

---

## Firebase (opcional)

La sincronización en la nube es completamente opcional. Sin cuenta de Firebase, la app funciona al 100% en local.

Para activarla:
1. Crea un proyecto en [console.firebase.google.com](https://console.firebase.google.com)
2. Activa **Authentication → Google**
3. Activa **Firestore Database**
4. Sustituye la configuración en `wapps-firebase.js`

### Estructura de datos en Firestore

```
users/
  {uid}/
    data/
      despensa_items
      compra_data
      suministros_data
      finanzas_data
      gastos_data
      semana_data
      deseados_data
      obra_data
      instrumentos_data
      setlist_data
      mascotas_data
```

### Reglas de seguridad recomendadas

**Configuración:**
1. Copia `wapps-config.example.js` → `wapps-config.js`
2. Rellena tus credenciales Firebase
3. `wapps-config.js` está en `.gitignore` — nunca se sube al repo

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/data/{document} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Sincronización en tiempo real

`WStore.watchRealtime` abre un listener `onSnapshot` sobre un documento Firestore. Cuando otro dispositivo guarda un cambio, llega automáticamente sin recargar la página.

```js
// Activar sync en tiempo real para una app concreta
const unsubscribe = WStore.watchRealtime('despensa', 'items', data => {
  render(data); // se llama cada vez que cambia en cualquier dispositivo
});

// Detener el listener (p.ej. al salir de la página)
unsubscribe();
```

El listener compara `_updatedAt`: si el dato local ya es igual o más reciente, ignora la actualización remota. Esto evita bucles y conflictos con ediciones simultáneas.

---

## Banner de actualización

Cuando se despliega una nueva versión, el Service Worker detecta el cambio y muestra automáticamente un banner en la parte inferior de la pantalla:

> ⚡ Hay una actualización disponible — **[Recargar]** ✕

El usuario decide cuándo recargar. La app nunca se recarga sola. El banner aparece tanto si el SW detecta cambios por ETag/Last-Modified como si queda en estado `waiting`.

---

## Notificaciones

`WNotify` gestiona alertas automáticas. Para activarlas en cualquier página:

```js
WNotify.renderConfigPanel('id-del-contenedor'); // muestra los toggles de config
WNotify.check();                                 // lanza el check inmediato
```

Tipos de alerta disponibles: caducidades en despensa, stock mínimo, facturas sin registrar, presupuesto al límite, tareas del día, días sin registrar gastos.

---

## Changelog

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
