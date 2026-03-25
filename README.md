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

- **Sin conexión**: todo funciona con `localStorage`. Los cambios se marcan como pendientes.
- **Con conexión y sesión**: los datos se suben a Firestore automáticamente. Gana siempre el más reciente por `_updatedAt`.
- **Tiempo real**: `WStore.watchRealtime` mantiene un listener `onSnapshot` activo. Cualquier cambio en otro dispositivo llega en segundos, sin necesidad de recargar.
- **Service Worker** (`sw.js`): estrategia stale-while-revalidate para HTML. La app carga instantáneamente aunque no haya red. Si se despliega una versión nueva, aparece un banner para recargar.

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
