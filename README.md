# W//APPS · Personal PWA Suite

**Versión:** `v2.1.0` · Build `2026.03`
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
├── manifest.json / sw.js     # PWA · network-first para HTML · wapps-v3
├── icons/
│
├── — HOGAR —
├── despensa.html             # Inventario · stock · alertas · recetas IA · → Compra
├── compra.html               # Listas · historial · reutilizar · WStore
├── suministros.html          # Facturas luz/gas/agua · guías · alertas
├── mascotas.html             # Perfil · medicación · vet · peso · → Calendario y Compra
├── ninos.html                # Perfil · medicación · médico · exámenes · crecimiento · gastos · → Calendario y Compra
│
├── — DINERO —
├── obra.html                 # Múltiples proyectos · archivar · resumen global
├── finanzas.html             # Hub central (lee Suministros, Gastos, Obra)
├── gastos-diarios.html       # Gastos cotidianos
├── deseados.html             # Lista deseos · historial de precios
│
├── — MÚSICA —
├── setlist.html              # Setlists por grupo · drag & drop · modo actuación
├── instrumentos.html         # Inventario de guitarras, bajos, amplis y pedales
│
├── — PRODUCTIVIDAD —
├── semana.html               # Planificador · tareas editables · recurrentes
│
├── — UTILIDAD —
├── decisor.html              # Decisor aleatorio · presets editables · historial
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
| **Mascotas** | Gestión de mascotas | Perfil · medicación · visitas vet · registro de peso · 🎂 cumpleaños → Calendario |
| **Niños** | Salud y seguimiento de hijos | Perfil · medicación · visitas médico · exámenes · crecimiento · gastos · 🎂 cumpleaños → Calendario |

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

### ninos.html — Seguimiento de hijos

App de salud y gestión integral para niños. Soporta múltiples perfiles (selector en barra superior, igual que mascotas).

**Pestañas:**

| Pestaña | Contenido |
|---------|-----------|
| **Perfil** | Nombre, emoji, sexo, nacimiento, colegio, curso, pediatra, tarjeta sanitaria, alergias. Alertas automáticas de medicaciones próximas, exámenes alterados y alergias. |
| **Medicación** | Frecuencias específicas (cada 8h, cada 12h, si fiebre). Stock, próxima dosis, marcar dosis administrada → stock bajo conecta con Lista Compra. |
| **Médico** | Visitas con tipo (revisión, enfermedad, vacuna, urgencias, especialista). Coste → Gastos Diarios. Próxima visita → Calendario. |
| **Exámenes** | Analíticas, radiografías, ecografías, test alergias, revisión visión/auditivo, test desarrollo. Resultado (normal / alterado / pendiente) con alertas destacadas. |
| **Crecimiento** | Talla, peso y perímetro cefálico. Historial con diferencias entre registros. |
| **Gastos** | Categorías propias (médico, farmacia, colegio, ropa, actividades extraesc., alimentación). Resumen mensual, desglose por categoría, sincronización opcional con Gastos Diarios. |

**Estructura de datos:**
```js
state = {
  kids: [{
    id, nombre, emoji, sexo, nacimiento,
    colegio, curso, pediatra, tarjeta, alergias,
    meds:    [{ id, nombre, dosis, freq, proxima, stock, notas }],
    visits:  [{ id, fecha, motivo, medico, tipo, coste, notas, proxima }],
    exams:   [{ id, fecha, tipo, centro, resultado, coste, notas, proximo }],
    growth:  [{ id, fecha, talla, peso, cabeza, notas }],
    gastos:  [{ id, concepto, importe, fecha, cat, notas }]
  }],
  nextId: 1
}
```

**Conexiones cross-app:**
- Coste de visita médica → `gastos_v1` (Gastos Diarios)
- Coste de examen → `gastos_v1` (Gastos Diarios)
- Gastos propios → `gastos_v1` (opcional)
- Medicamento con stock bajo → `compra_v2` (Lista Compra)
- Próxima visita / examen → `semana_v2` (Calendario)
- Fecha de nacimiento → `semana_v2` (Calendario, recurrente anual)

---

### mascotas.html y ninos.html — Cumpleaños recurrente

Al guardar (o editar) una mascota o niño con fecha de nacimiento, se crea automáticamente en `semana_v2`:

- Un evento normal para la ocurrencia del año en curso (`events[]`)
- Una entrada en `recurrentes[]` con `birthdayKey` único para evitar duplicados

```js
// Estructura en semana_v2
cal.recurrentes.push({
  id,
  birthdayKey: 'mascota_Rex_2019-05-10',  // o 'nino_Pablo_2018-03-22'
  titulo: '🎂 Cumpleaños de Rex 🐾',
  diaMes: '05-10',   // MM-DD — para renderizar cada año
  tipo: 'personal',
  color: '#c060f0',  // mascotas: morado · niños: teal
  notas: 'Nacido/a el 2019-05-10',
  recurrencia: 'anual'
});
```

> **Nota para semana.html:** el campo `recurrentes[]` ya se escribe desde mascotas y niños. Para que aparezca en semanas futuras, semana.html debe renderizar estos eventos por `diaMes` además de los `events[]` normales.

---

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
- `recurrentes[]` con `birthdayKey` para cumpleaños anuales de mascotas y niños

### deseados.html — Historial de precios
- `historialPrecios: [{fecha, precio}]` por ítem
- Panel con últimas 5 entradas + mín/máx/tendencia

### backup.html — Reset por app
- Botón **Borrar** por app en zona de peligro → borra localStorage **y** el documento de Firestore
- Botón **Borrar TODOS** → batch delete completo en Firestore
- Requiere sesión activa para borrar en Firestore; si no hay sesión, solo borra local
- Incluye `ninos_v1` en el listado de apps

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
| Niños | `ninos_v1` | — |
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
- Versión de caché: `wapps-v3`
- Para forzar actualización en todos los dispositivos: subir versión en `sw.js`

---

## 🚀 Roadmap

| Prioridad | Mejora |
|-----------|--------|
| Alta | Compra → Gastos Diarios al completar (modal precios) |
| Alta | Compra: artículos con unidad (kg, L, uds) |
| Media | semana.html: renderizar cumpleaños recurrentes (`recurrentes[]`) en todas las semanas del año |
| Media | semana.html: importar .ics (Google Calendar / Outlook) |
| Media | `WStore.syncOnLoad` en cada herramienta individual |
| Media | Gastos Diarios integración WStore completa |
| Baja | Modo oscuro/claro configurable |

---

## 📋 Changelog

### v2.1.0 (2026-03)
- `ninos.html` — nueva app: perfil · medicación · visitas médico · exámenes/análisis · crecimiento (talla/peso/per.cefálico) · gastos por categoría · conectada con Gastos Diarios, Compra y Calendario
- `mascotas.html` — fecha de nacimiento crea automáticamente evento de cumpleaños recurrente anual en `semana_v2` (campo `recurrentes[]` con `birthdayKey` para evitar duplicados)
- `ninos.html` — ídem para cumpleaños de niños
- `backup.html` — añadida app `ninos_v1` al listado de backup/restore
- `index.html` — nueva entrada `ninos.html` con tags `hogar` y `salud`
- `README.md` — documentación actualizada

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
