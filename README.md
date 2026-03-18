# W//APPS · Personal PWA Suite

> Colección de mini-apps web progresivas (PWA) para uso personal. Sin backend, sin dependencias externas críticas, todo en HTML + localStorage + módulo compartido.

**Versión:** `v1.4.0` · Build `2026.03`  
**Autor:** [@Wolologger](https://github.com/Wolologger)  
**Stack:** HTML · CSS · Vanilla JS · localStorage · Chart.js  
**Instalable como PWA** en iOS Safari, Android Chrome y escritorio

---

## 📁 Estructura del proyecto

```
pwa-apps/
├── index.html              # Panel principal — categorías editables, búsqueda, notificaciones
├── wapps-store.js          # ★ Bus de datos compartido + sistema de notificaciones
├── manifest.json           # Manifest PWA
├── sw.js                   # Service Worker (offline)
├── icons/                  # Iconos PWA
│
├── suministros.html        # 🏠 Facturas luz/gas/agua + guías interactivas
├── despensa.html           # 🏠 Inventario con caducidades
├── compra.html             # 🏠 Lista de la compra
├── obra.html               # 🏠 Seguimiento de reforma
│
├── finanzas.html           # 💰 Hub central (lee otras apps automáticamente)
├── gastos-diarios.html     # 💰 Gastos diarios
├── deseados.html           # 💰 Lista de deseos
│
├── setlist.html            # 🎸 Gestión de setlists
├── instrumentos.html       # 🎸 Inventario de instrumentos
│
├── semana.html             # 📅 Planificador semanal
│
└── decisor.html            # ⚙️ Decisor aleatorio
```

---

## 📱 Apps disponibles

### 🏠 Hogar

| App | Descripción |
|-----|-------------|
| **Suministros** | Facturas de luz/gas/agua · Gráficas · Alertas de subida · Guías interactivas completas (Luz, Gas/Propano, Agua) con test |
| **Despensa** | Inventario de alimentos · Caducidades por colores · Stock mínimo |
| **Lista Compra** | Listas reutilizables · Categorías custom · Establecimientos |
| **Mi Obra** | Reforma/construcción · Presupuesto · Tareas por fases |

### 💰 Dinero

| App | Descripción |
|-----|-------------|
| **Finanzas** | Hub central · Lee Suministros, Gastos Diarios y Obra automáticamente · Proyección anual · Regla 50/30/20 |
| **Gastos Diarios** | Registro cotidiano · Presupuesto mensual · Categorías |
| **Deseados** | Lista de deseos · Prioridad · Seguimiento |

### 🎸 Música

| App | Descripción |
|-----|-------------|
| **Setlist** | Canciones por grupo · Drag & drop · Modo actuación · Exportar |
| **Instrumentos** | Guitarras · Bajos · Amplis · Pedales · Setups |

### 📅 Productividad / ⚙️ Utilidad

| App | Descripción |
|-----|-------------|
| **Semana** | Tareas semanales · Calendario · Vacaciones |
| **Decisor** | Elige por ti · Presets editables · Historial |

---

## ★ wapps-store.js — Bus de datos compartido

Módulo JS central que unifica el acceso a datos entre todas las apps y gestiona las notificaciones. Cárgalo con `<script src="wapps-store.js">` antes de tu código.

### Store API

```js
// Leer datos de cualquier app
WStore.get('despensa', 'items')       // → objeto o null

// Escribir (guarda en localStorage y emite evento cross-tab)
WStore.set('despensa', 'items', state)

// Escuchar cambios en tiempo real
const unsub = WStore.on('despensa', 'items', (val) => render(val));
unsub(); // desuscribirse
```

### Bridges tipados

```js
WStore.bridge.despensa()                      // → array de alimentos
WStore.bridge.suministros()                   // → array de facturas
WStore.bridge.finanzas()                      // → { ingresos, gastos }
WStore.bridge.gastosDiarios()                 // → array de gastos
WStore.bridge.caducidadesProximas(3)          // → items que caducan en ≤3 días
WStore.bridge.suministrosMediaMensual('luz')  // → €/mes promedio últimas 3 facturas
WStore.bridge.gastosEsteMes()                 // → € gastados en el mes actual
```

El bus mantiene las claves `localStorage` originales en sync automático — las apps existentes no necesitan cambios.

---

## 🔔 Sistema de notificaciones (WNotify)

### Uso básico

```js
await WNotify.request();   // pide permiso (una sola vez)
WNotify.check();           // revisa y lanza todas las alertas pendientes
WNotify.send('Título', 'Cuerpo', { tag: 'mi-alerta', url: 'app.html' });
```

### Alertas automáticas incluidas

| Alerta | Condición | Destino |
|--------|-----------|---------|
| 🔴 Caducados hoy | Items despensa con fecha ≤ hoy | despensa.html |
| 🟠 Caducan pronto | Caducidad en ≤ 3 días | despensa.html |
| 💡 Factura sin registrar | >35 días sin nueva factura de luz/gas/agua | suministros.html |
| 💰 Presupuesto al límite | Gastos del mes ≥ 80% de ingresos | finanzas.html |
| 📝 Sin registrar gastos | ≥ 2 días sin apuntar gasto | gastos-diarios.html |
| 📅 Tareas de hoy | Tareas pendientes con fecha = hoy | semana.html |

Cada tipo se puede activar/desactivar individualmente desde el panel 🔔 del index.

### Cuándo se comprueban

Las alertas se revisan automáticamente al abrir cualquier página que cargue `wapps-store.js`, con un throttle de 2 horas para no saturar. El panel 🔔 también permite lanzarlas manualmente.

### Limitaciones sin servidor

| Escenario | Funciona |
|-----------|----------|
| Al abrir la app | ✅ Siempre |
| Background Android PWA instalada | ✅ Periodic Background Sync |
| Background iOS | ❌ No soportado por Safari |
| Sin abrir la app varios días | ❌ Requiere Firebase o backend |

---

## 🔗 Conexiones entre apps

```
Finanzas (hub)
  ← Suministros: media mensual por tipo (luz/gas/agua)
  ← Gastos Diarios: total del mes actual
  ← Obra: total gastado en reforma

Despensa → Lista Compra
  → botón "Mover a Compra" al agotar stock

Deseados → Gastos Diarios
  → al marcar como comprado registra el gasto automáticamente
```

---

## 📖 Guías de facturas (dentro de Suministros)

| Guía | Secciones |
|------|-----------|
| ⚡ Factura de la Luz | Resumen · Conceptos · P1/P2/P3 · Actores · Test 5 preguntas |
| 🔥 Factura del Gas/Propano | Resumen · Conceptos · Propano vs Red (€/kWh) · Actores · Test |
| 💧 Factura del Agua | Resumen · Conceptos · Bloques progresivos · Actores · Test |

---

## 🎨 Sistema de diseño compartido

```css
--bg:#0a0a09   --text:#f0ebe0   --muted:#5a5850
--y:#e8f040    --r:#f04030      --g:#30d880    --b:#30a8f0    --o:#f09030

--fh: 'Bebas Neue'   /* headings display */
--fm: 'DM Mono'      /* UI monospace */
--fs: 'DM Sans'      /* texto corrido */
```

---

## 💾 Claves localStorage

| App | Clave legacy | Clave bus |
|-----|-------------|-----------|
| Despensa | `despensa_v1` | `wapps.despensa.items` |
| Finanzas | `finanzas_v1` | `wapps.finanzas.data` |
| Suministros | `suministros_v1` | `wapps.suministros.data` |
| Gastos Diarios | `gastos_v1` | `wapps.gastos.data` |
| Compra | `compra_v1` | `wapps.compra.data` |
| Semana | `semana_v1` | `wapps.semana.data` |
| Deseados | `deseados_v1` | `wapps.deseados.data` |
| Obra | `miobra_v2` | `wapps.obra.data` |
| Categorías index | — | `wapps_cats_v1` |
| Config notificaciones | — | `notify.config` |

---

## 🚀 APIs a integrar (roadmap)

| API | App | Valor |
|-----|-----|-------|
| **OMIE / REE esios** | Suministros | Precio kWh en tiempo real |
| **Open Food Facts** | Despensa | Escáner código de barras |
| **Nager.Date** | Semana | Festivos nacionales automáticos |
| **Open-Meteo** | Semana | Tiempo por día de la semana |
| **Spotify Web API** | Setlist | BPM, duración, tonalidad |
| **INE / Banco de España** | Finanzas | IPC para ajustar presupuesto |
| **Firebase** | Todas | Sync dispositivos + push real sin app abierta |

---

## 📦 Instalación PWA

- **iOS:** Safari → Compartir → "Añadir a pantalla de inicio"
- **Android:** Chrome → ⋮ → "Instalar app"
- **Escritorio:** icono en barra de dirección de Chrome/Edge

---

## 📋 Changelog

### v1.4.0 (2026-03)
- `wapps-store.js` — bus de datos compartido con bridges tipados, compatibilidad legacy total
- `wapps-store.js` — `WNotify`: 6 tipos de alertas, panel de configuración por toggle, throttle de 2h
- `index.html` — iconos de categoría compactos (emoji pequeño + nombre en línea)
- `index.html` — panel 🔔 de notificaciones con configuración individual por tipo
- `index.html` — categorías 100% editables (nombre, emoji, color, descripción, borrar) persistidas

### v1.3.0
- `index.html` — menú por categorías colapsables, búsqueda en tiempo real
- Versión visible en header y footer

### v1.2.0
- `suministros.html` — 3 guías completas de facturas (Luz, Gas/Propano, Agua) con test
- `suministros.html` — Chart.js, resumen anual/trimestral, alertas de subida

### v1.1.0
- Rediseño general con sistema de diseño unificado
- Finanzas conectado a Suministros, Gastos Diarios y Obra

### v1.0.0
- Primera versión con las 11 apps básicas

---

_Proyecto personal · Uso doméstico_
