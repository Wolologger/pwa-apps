# W//APPS · Personal PWA Suite

**Versión:** `v1.6.0` · Build `2026.03`
**Autor:** [@Wolologger](https://github.com/Wolologger)
**Stack:** HTML · CSS · Vanilla JS · localStorage · Chart.js · wapps-store.js

---

## 📁 Estructura

```
pwa-apps/
├── index.html              # Panel principal · categorías editables · búsqueda · notificaciones
├── wapps-store.js          # ★ Bus de datos compartido + WNotify
├── manifest.json / sw.js   # PWA
├── icons/
│
├── suministros.html        # Facturas luz/gas/agua + guías interactivas completas
├── despensa.html           # Inventario · contador stock · alertas · → Compra automático
├── compra.html             # Listas · historial · reutilizar · WStore
├── obra.html               # ★ Múltiples proyectos · archivar · resumen global
│
├── finanzas.html           # Hub central (lee Suministros, Gastos, Obra)
├── gastos-diarios.html     # Gastos cotidianos
├── deseados.html           # Lista deseos · historial de precios por fecha
│
├── setlist.html            # Setlists por grupo
├── instrumentos.html       # Inventario instrumentos
│
├── semana.html             # Planificador · tareas editables · tareas recurrentes
└── decisor.html            # Decisor aleatorio
```

---

## 📱 Apps — estado actual

### 🏠 Hogar

| App | Novedades v1.5–1.6 |
|-----|---------------------|
| **Suministros** | Guías Luz/Gas/Agua con test · alertas subida >20% |
| **Despensa** | ★ Contador +/− stock · alerta stock mínimo · botón → Lista Compra · WStore |
| **Lista Compra** | ★ Historial de compras anteriores · reutilizar lista · WStore |
| **Mi Obra** | ★★ **Múltiples proyectos** · crear/editar/archivar · vista resumen global · migración automática desde formato antiguo · WStore |

### 💰 Dinero

| App | Novedades |
|-----|-----------|
| **Finanzas** | Hub · lee Suministros, Gastos, Obra automáticamente |
| **Gastos Diarios** | Sin cambios esta iteración |
| **Deseados** | ★ Historial de precios por fecha · mín/máx/tendencia |

### 🎸 Música / 📅 Productividad / ⚙️ Utilidad

| App | Novedades |
|-----|-----------|
| **Semana** | ★ Tareas editables (inline) · tareas recurrentes (diaria/L–V/finde/semanal) |
| **Setlist / Instrumentos / Decisor** | Sin cambios esta iteración |

---

## ★ Nuevas funcionalidades detalladas

### obra.html — Múltiples proyectos (v1.6.0)

**Arquitectura del state:**
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

**Funcionalidades:**
- Selector de proyectos en barra superior (chips con % de progreso)
- Botón **Todas** → vista resumen global con totales agregados
- **＋** → modal para crear nueva obra (nombre, descripción, presupuesto, color)
- **✎ Editar** → modificar nombre/color/presupuesto del proyecto activo
- **📦 Archivar** → oculta el proyecto de la vista activa (recuperable)
- **Eliminar** → borrado definitivo con confirmación
- Migración automática desde formato legacy `miobra_v2`
- Sync con WStore + mantiene clave legacy para compatibilidad con Finanzas

### despensa.html — Stock counter (v1.5.0)
- Botones **+/−** junto a cada alimento
- Campo `stockMin` al añadir → alerta automática y oferta de añadir a Compra al bajar del umbral
- `stock=0` → confirm automático para mover a Lista Compra

### compra.html — Historial (v1.5.0)
- Al limpiar hechos → se archiva la lista en `state.history[]`
- Pestaña **Historial** con las últimas 20 compras completadas
- Botón **↺ Reutilizar** → añade todos los ítems de esa sesión a la lista activa

### semana.html — Recurrentes y edición (v1.5.0)
- Doble tap o botón ✎ → edición inline de cualquier tarea
- Sección **↻ Tareas recurrentes** en la pestaña Eventos
- Frecuencias: Diaria · L–V · Fin de semana · Semanal (lunes)
- Las recurrentes se aplican automáticamente cada semana · indicador ↻ visual

### deseados.html — Historial de precios (v1.5.0)
- Cada ítem tiene `historialPrecios: [{fecha, precio}]`
- Panel desplegable por ítem con últimas 5 entradas + mín/máx/tendencia
- Botón **+ Anotar** → registra el precio del día y actualiza el precio actual

---

## 🔔 Sistema de notificaciones (WNotify)

| Alerta | Condición |
|--------|-----------|
| 🔴 Caducados hoy | Items despensa fecha ≤ hoy |
| 🟠 Caducan pronto | Caducidad en ≤ 3 días |
| 💡 Factura sin registrar | >35 días sin nueva factura |
| 💰 Presupuesto al límite | Gastos mes ≥ 80% ingresos |
| 📝 Sin registrar gastos | ≥ 2 días sin anotar gasto |
| 📅 Tareas de hoy | Tareas pendientes con fecha = hoy |

Panel 🔔 en index · configuración por toggle · throttle 2h

---

## 💾 Claves localStorage

| App | Legacy | Bus WStore |
|-----|--------|------------|
| Despensa | `despensa_v1` | `wapps.despensa.items` |
| Finanzas | `finanzas_v1` | `wapps.finanzas.data` |
| Suministros | `suministros_v1` | `wapps.suministros.data` |
| Gastos Diarios | `gastos_v1` | `wapps.gastos.data` |
| Compra | `compra_v2` | `wapps.compra.data` |
| Semana | `semana_v1` | `wapps.semana.data` |
| Deseados | `deseados_v2` | `wapps.deseados.data` |
| **Obra (nuevo)** | `obra_multiproj_v1` | `wapps.obra.data` |
| Categorías index | — | `wapps_cats_v1` |
| Config notificaciones | — | `notify.config` |

---

## 🚀 Roadmap (próximas sesiones)

| Prioridad | Mejora |
|-----------|--------|
| Alta | Compra → Gastos Diarios al completar (modal precios) |
| Alta | Compra: artículos con unidad (kg, L, uds) |
| Media | Semana: importar .ics (Google Calendar / Outlook) |
| Media | Guías de uso con popups de onboarding |
| Media | Gastos Diarios integración WStore completa |

---

## 📋 Changelog

### v1.6.0 (2026-03)
- `obra.html` — múltiples proyectos con selector, archivar, vista global, modal crear/editar, migración automática legacy, WStore

### v1.5.0 (2026-03)
- `despensa.html` — contador stock +/−, stockMin, botón automático → Compra
- `compra.html` — historial de compras, reutilizar listas, WStore
- `semana.html` — tareas editables inline, tareas recurrentes
- `deseados.html` — historial de precios por fecha
- `index.html` — categorías con glow/sombra/hover, spinner
- Todas las apps — spinners de carga

### v1.4.0
- `wapps-store.js` — bus datos + WNotify
- `index.html` — categorías editables, panel notificaciones, botón limpiar caché

### v1.3.0
- `index.html` — menú por categorías, búsqueda
- `suministros.html` — guías Luz/Gas/Agua

### v1.2.0 — v1.0.0
- Diseño base, todas las apps, sistema de diseño unificado

---

_Proyecto personal · Uso doméstico_
