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
```

- **Sin conexión**: todo funciona con `localStorage`. Los cambios se marcan como pendientes.
- **Con conexión y sesión**: los datos se suben a Firestore automáticamente. Gana siempre el más reciente por `_updatedAt`.
- **Service Worker** (`sw.js`): estrategia cache-first para todas las páginas. La app carga instantáneamente aunque no haya red.

---

## Módulos compartidos

| Archivo | Descripción |
|---|---|
| `wapps-store.js` | Bus de datos (`WStore`), notificaciones (`WNotify`), cola offline |
| `wapps-firebase.js` | Auth con Google y sincronización Firestore (`WFirebase`, `WSync`) |
| `wapps-onboarding.js` | Sistema de onboarding para nuevos usuarios |
| `sw.js` | Service Worker — offline, caché y actualizaciones en background |
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

## Notificaciones

`WNotify` gestiona alertas automáticas. Para activarlas en cualquier página:

```js
WNotify.renderConfigPanel('id-del-contenedor'); // muestra los toggles de config
WNotify.check();                                 // lanza el check inmediato
```

Tipos de alerta disponibles: caducidades en despensa, stock mínimo, facturas sin registrar, presupuesto al límite, tareas del día, días sin registrar gastos.

---

## Changelog

### v2.5.0
- Firebase SDK actualizado de 9.23.0 a 11.6.0 en index, backup y editor-categorias
- `404.html` — página de error con accesos directos a las apps principales
- SW v6: 404.html en precaché, usado como fallback para URLs desconocidas
- Botones de acción primaria (btn-y) cambiados a fuente Bebas Neue para mayor visibilidad
- Flecha de volver con stroke explícito amarillo en todos los archivos

### v2.4.0
- Indicador de sync (ONLINE/OFFLINE/SINCRONIZANDO + pendientes) en despensa, compra, obra y backup
- `coches.html` y `ninos.html` conectados a WStore y Firebase — sus datos ya se sincronizan
- `coches_v1` y `ninos_v1` añadidos a LEGACY_KEYS y WSTORE_KEYS

### v2.3.0
- Offline completo: todas las páginas HTML en precaché del SW
- `offline.html` como fallback con redirección automática al recuperar red
- Estrategia cache-first para carga instantánea
- Flecha de volver y botones de acción con color de alto contraste
- `WNotify` activo en `compra.html` y `obra.html`

### v2.2.0
- `WStore` y `WNotify` — bus de datos y sistema de notificaciones
- `WSync` — cola de pendientes offline con merge por timestamp

### v2.1.0
- Service Worker con estrategia network-first para HTML
- Precaché de archivos JS compartidos

### v2.0.0
- Integración Firebase Auth + Firestore
- Sincronización multi-dispositivo
