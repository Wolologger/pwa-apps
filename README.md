# W//APPS · Personal PWA Suite

**Versión:** `v2.0.0` · Build `2026.03`
**Autor:** [@Wolologger](https://github.com/Wolologger)
**URL:** `https://wolologger.github.io/pwa-apps/`
**Stack:** HTML · CSS · Vanilla JS · localStorage · Firebase · Chart.js · Spoonacular API

---

## 📁 Estructura

```
pwa-apps/
├── index.html                # Panel principal · login Google · sync status · ajustes
├── editor-categorias.html    # Panel de ajustes · visibilidad · reset por app
├── wapps-store.js            # Bus de datos (WStore) · notificaciones (WNotify) · sync Firebase
├── wapps-firebase.js         # Auth Google · Firestore sync (WFirebase + WSync)
├── wapps-onboarding.js       # Onboarding por app (muestra una vez)
├── manifest.json / sw.js     # PWA · network-first para HTML · wapps-v2
├── icons/
│
├── — HOGAR —
├── despensa.html             # Inventario · stock · alertas · recetas IA · → Compra
├── compra.html               # Listas · historial · reutilizar · WStore
├── suministros.html          # Facturas luz/gas/agua · guías · alertas
├── mascotas.html             # Perfil · medicación · vet · peso · → Calendario y Compra
│
├── — DINERO —
├── obra.html                 # Múltiples proyectos · archivar · resumen global
├── finanzas.html             # Hub central (lee Suministros, Gastos, Obra)
├── gastos-diarios.html       # Gastos cotidianos
├── deseados.html             # Lista deseos · historial de precios
│
├── — MÚSICA —
├── setlist.html              # Setlists por grupo · drag & drop · modo actuación
├── instrumentos.html         # Inventario instrumentos
│
├── — PRODUCTIVIDAD —
├── semana.html               # Planificador · tareas editables · recurrentes
│
├── — UTILIDAD —
├── decisor.html              # Decisor aleatorio · presets editables
└── backup.html               # Backup/restauración · reset por app · Firestore delete
```

---

## 📱 Apps — estado actual

### 🏠 Hogar

| App | Descripción | Novedades |
|-----|-------------|-----------|
| **Despensa** | Inventario de alimentos y caducidades | ★ Stock +/− · stockMin · recetas con Spoonacular · ingredientes faltantes → Compra |
| **Lista Compra** | Listas de la compra reutilizables | Historial · reutilizar lista · WStore |
| **Suministros** | Facturas de luz, gas y agua | Guías Luz/Gas/Agua con test · alertas subida >20% |
| **Mascotas** | Gestión de mascotas | Perfil · medicación · visitas vet · registro de peso |

### 💰 Dinero

| App | Descripción | Novedades |
|-----|-------------|-----------|
| **Mi Obra** | Gestión de obras y reformas | Múltiples proyectos · archivar · vista global · migración legacy |
| **Finanzas** | Hub financiero central | Lee Suministros, Gastos y Obra automáticamente |
| **Gastos Diarios** | Control de gastos cotidianos | — |
| **Deseados** | Lista de deseos con seguimiento | Historial de precios · mín/máx/tendencia |

### 🎸 Música

| App | Descripción |
|-----|-------------|
| **Setlist** | Canciones por grupo · drag & drop · modo actuación · exportar |
| **Instrumentos** | Inventario de guitarras, bajos, amplis y pedales |

### 📅 Productividad

| App | Descripción |
|-----|-------------|
| **Semana** | Tareas editables inline · recurrentes (diaria/L–V/finde/semanal) |

### ⚙️ Utilidad

| App | Descripción |
|-----|-------------|
| **Decisor** | Elige por ti · presets editables · historial |
| **Backup** | Export/import JSON · reset por app (localStorage + Firestore) |

---

## ★ Funcionalidades detalladas

### despensa.html — Recetas con Spoonacular
- Pestaña **🍳 Recetas** con chips de ingredientes seleccionables
- Llama a `findByIngredients` de Spoonacular con los ingredientes de la despensa
- Cada receta muestra % de match, ingredientes que tienes (verde) y que te faltan (naranja)
- Botón **🛒 Añadir ingredientes que faltan a la compra** → escribe directamente en `compra.html` con nota de la receta
- API key: Spoonacular · 150 llamadas/día en plan gratuito

### despensa.html — Stock counter
- Botones **+/−** junto a cada alimento
- Campo `stockMin` → alerta automática al bajar del umbral
- `stock = 0` → confirm para mover a Lista Compra

### compra.html — Historial
- Al limpiar hechos → archiva en `state.history[]`
- Pestaña **Historial** con las últimas 20 compras
- Botón **↺ Reutilizar** → recupera ítems de una sesión anterior

### obra.html — Múltiples proyectos
```js
state = {
  proyectos: [{
    id, name, desc, color, presupuesto,
    tasks: [{id, cat, text, done, prio}],
    gastos: [{id, concepto, importe, cat}],
    archived: false,
    createdAt: '2026-03-18'
  }],
  nextId: 200
}
```
- Selector de proyectos con % de progreso · Vista global agregada
- Modal crear/editar · Archivar/eliminar con confirmación
- Migración automática desde `miobra_v2`

### semana.html — Recurrentes y edición
- Doble tap o ✎ → edición inline
- Frecuencias: Diaria · L–V · Fin de semana · Semanal

### deseados.html — Historial de precios
- `historialPrecios: [{fecha, precio}]` por ítem
- Panel con últimas 5 entradas + mín/máx/tendencia

### backup.html — Reset por app
- Botón **Borrar** por app en zona de peligro → borra localStorage **y** el documento de Firestore
- Botón **Borrar TODOS** → batch delete completo en Firestore
- Requiere sesión activa para borrar en Firestore; si no hay sesión, solo borra local

---

## 🔐 Firebase — Auth y Sync

**Proyecto:** `pwa-apps-b3857` · Región: `europe-west3`

### Autenticación
- Login obligatorio con Google para acceder a la app
- Sin sesión → pantalla de login a pantalla completa
- Token persistente → al reabrir la app no pide login de nuevo

### Sincronización (WFirebase + WSync)
- **Offline-first**: localStorage es siempre la fuente de datos principal
- Cada `WStore.set()` marca el dato como `pending` y sube a Firestore si hay red
- Sin red → queda en cola `wapps.pending`, se sube al recuperar conexión
- Al hacer login → pull de Firestore primero (gana el timestamp más reciente), luego push pendientes
- Sync manual con botón `↑ SYNC` en el topbar del index

### Estructura Firestore
```
users/
  {uid}/
    data/
      despensa_items   → { alimentos: [...], _updatedAt }
      compra_data      → { lists: [...], items: [...], _updatedAt }
      semana_data      → { tareas: [...], _updatedAt }
      ...
```

### Reglas Firestore
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### Indicador de estado (topbar index)
| Estado | Color | Significado |
|--------|-------|-------------|
| `● ONLINE` | Verde | Conectado, todo sincronizado |
| `● OFFLINE` | Rojo | Sin red, trabajando en local |
| `● SINCRONIZANDO...` | Amarillo parpadeante | Subiendo datos |
| `· N PENDIENTES` | Amarillo | Hay datos sin subir |

---

## 🍳 Integración Spoonacular

- **API:** `findByIngredients` — recetas por ingredientes disponibles
- **Plan:** Gratuito · 150 llamadas/día
- **Ranking 2:** maximiza el uso de ingredientes disponibles
- Los ingredientes faltantes se añaden a `compra.html` con `WStore.set('compra','data',...)`

---

## 🔔 Sistema de notificaciones (WNotify)

Panel 🔔 en index · configuración por toggle · throttle 2h

| Alerta | Condición |
|--------|-----------|
| 🔴 Caducados hoy | Items despensa fecha ≤ hoy |
| 🟠 Caducan pronto | Caducidad en ≤ 3 días |
| 💡 Factura sin registrar | >35 días sin nueva factura |
| 💰 Presupuesto al límite | Gastos mes ≥ 80% ingresos |
| 📝 Sin registrar gastos | ≥ 2 días sin anotar gasto |
| 📅 Tareas de hoy | Tareas pendientes con fecha = hoy |

---

## 🎓 Onboarding (WOnboarding)

- Se muestra una vez por app al primer uso
- `WOnboarding.reset('app')` → fuerza a mostrar de nuevo
- `WOnboarding.resetAll()` → resetea todas las apps

---

## ⚙️ Panel de ajustes (`editor-categorias.html`)

Acceso desde botón ⚙ en el topbar del index.

- Toggle on/off por herramienta → oculta o muestra en el panel principal
- Botón **↺ RESET** por herramienta → borra datos de localStorage y Firestore
- Config de visibilidad en `pwa_hidden`

---

## 💾 Claves localStorage

| App | Clave legacy | Bus WStore |
|-----|-------------|------------|
| Despensa | `despensa_v1` | `wapps.despensa.items` |
| Compra | `compra_v2` | `wapps.compra.data` |
| Suministros | `suministros_v1` | `wapps.suministros.data` |
| Finanzas | `finanzas_v1` | `wapps.finanzas.data` |
| Gastos Diarios | `gastos_v1` | `wapps.gastos.data` |
| Semana | `semana_v1` / `semana_v2` | `wapps.semana.data` |
| Deseados | `deseados_v2` | `wapps.deseados.data` |
| Obra | `obra_multiproj_v1` | `wapps.obra.data` |
| Mascotas | `mascotas_v1` | — |
| Backup | — | `wapps.backup.history` |
| Config notificaciones | — | `notify.config` |
| Onboarding | — | `wapps.onboarding.<app>` |
| Herramientas ocultas | — | `pwa_hidden` |
| Sync pendientes | — | `wapps.pending` |

---

## 🔧 Service Worker

- Estrategia **network-first para HTML** → cambios visibles sin Ctrl+F5
- Cache-first para assets estáticos (manifest, iconos)
- Offline fallback → sirve desde caché si no hay red
- Versión de caché: `wapps-v2`
- Para forzar actualización en todos los dispositivos: subir versión en `sw.js`

---

## 🚀 Roadmap

| Prioridad | Mejora |
|-----------|--------|
| Alta | Compra → Gastos Diarios al completar (modal precios) |
| Alta | Compra: artículos con unidad (kg, L, uds) |
| Media | Semana: importar .ics (Google Calendar / Outlook) |
| Media | `WStore.syncOnLoad` en cada herramienta individual |
| Media | Gastos Diarios integración WStore completa |
| Baja | Modo oscuro/claro configurable |

---

## 📋 Changelog

### v2.0.0 (2026-03)
- `wapps-firebase.js` — nuevo módulo: auth Google + Firestore sync (WFirebase + WSync)
- `wapps-store.js` — `set()` marca pending y sube a Firestore si hay sesión · `_updatedAt` en todos los datos · `syncOnLoad()` y `syncAllOnLoad()`
- `index.html` — login obligatorio con Google · pantalla de bienvenida · indicador ONLINE/OFFLINE/SINCRONIZANDO · botón sync manual · Firebase SDK
- `backup.html` — reset por app borra localStorage **y** Firestore · Firebase SDK
- `editor-categorias.html` — botón ↺ RESET por herramienta · borra local y Firestore
- `despensa.html` — pestaña 🍳 Recetas con Spoonacular · ingredientes faltantes → Compra automático

### v1.5.0 (2026-03)
- `despensa.html` — contador stock +/−, stockMin, botón automático → Compra
- `compra.html` — historial de compras, reutilizar listas, WStore
- `semana.html` — tareas editables inline, tareas recurrentes
- `deseados.html` — historial de precios por fecha
- `backup.html` — nueva app: backup y restauración completa
- `mascotas.html` — nueva app: perfil, medicación, vet, peso
- `editor-categorias.html` — panel de ajustes con visibilidad on/off
- `index.html` — botón ⚙ ajustes en topbar · herramientas ocultas desde localStorage
- `sw.js` — network-first para HTML (wapps-v2)
- `wapps-onboarding.js` — sistema de onboarding por app

### v1.4.0
- `wapps-store.js` — WStore + WNotify
- `index.html` — panel notificaciones, botón limpiar caché

### v1.3.0
- `index.html` — categorías, búsqueda
- `suministros.html` — guías Luz/Gas/Agua

### v1.2.0
- `obra.html` — múltiples proyectos, migración legacy

### v1.0.0 — v1.1.0
- Diseño base, todas las apps iniciales, sistema de diseño unificado

---

_Proyecto personal · Uso doméstico_
