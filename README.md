# W//APPS · Personal PWA Suite

> Colección de mini-apps web progresivas (PWA) para uso personal. Sin backend, sin dependencias externas, todo en HTML + localStorage.

**Versión actual:** `v1.3.0` · Build `2026.03`  
**Autor:** [@Wolologger](https://github.com/Wolologger)  
**Tecnología:** HTML · CSS · Vanilla JS · localStorage · Chart.js  
**Instalable como:** PWA (iOS Safari, Android Chrome, escritorio)

---

## 📱 Apps disponibles

### 🏠 Hogar

| App | Archivo | Descripción |
|-----|---------|-------------|
| **Suministros** | `suministros.html` | Registro de facturas de luz, gas y agua. Gráficas de evolución, alertas de subidas, resumen anual/trimestral y **Guías interactivas** para entender cada factura. |
| **Despensa** | `despensa.html` | Inventario de alimentos con caducidades y stock mínimo. |
| **Lista Compra** | `compra.html` | Listas reutilizables, categorías custom y gestión por establecimientos. |
| **Mi Obra** | `obra.html` | Seguimiento de reforma o construcción: presupuesto, tareas por fases, progreso. |

### 💰 Dinero

| App | Archivo | Descripción |
|-----|---------|-------------|
| **Finanzas** | `finanzas.html` | Ingresos vs gastos, proyección anual, conectado con otras apps. |
| **Gastos Diarios** | `gastos-diarios.html` | Registro de gastos cotidianos con presupuesto mensual. |
| **Deseados** | `deseados.html` | Lista de deseos con prioridad, categorías y seguimiento de estado de compra. |

### 🎸 Música

| App | Archivo | Descripción |
|-----|---------|-------------|
| **Setlist** | `setlist.html` | Gestión de setlists por grupo o proyecto. Drag & drop, modo actuación, exportación. |
| **Instrumentos** | `instrumentos.html` | Inventario de guitarras, bajos, amplificadores, pedales y configuraciones. |

### 📅 Productividad

| App | Archivo | Descripción |
|-----|---------|-------------|
| **Semana** | `semana.html` | Planificador semanal con calendario, vacaciones y eventos recurrentes. |

### ⚙️ Utilidad

| App | Archivo | Descripción |
|-----|---------|-------------|
| **Decisor** | `decisor.html` | Elige por ti: presets editables e historial de decisiones. |

---

## 📖 Guías de facturas (dentro de Suministros)

La sección **Guías** en `suministros.html` incluye una biblioteca de guías interactivas para entender tus facturas de suministros:

### ⚡ Guía Factura de la Luz (disponible)
- **Resumen:** desglose completo con importes y gráficas de barras proporcionales
- **Conceptos:** término de potencia, energía consumida, IE, IVA, alquiler de contador
- **P1/P2/P3:** explicación de periodos horarios, lecturas del contador, estrategias de ahorro
- **Actores:** quién es la comercializadora, distribuidora, CNMC y cómo te afecta
- **Test interactivo:** 5 preguntas para comprobar que has entendido tu factura

### 🔥 Guía Factura del Gas _(próximamente)_
### 💧 Guía Factura del Agua _(próximamente)_

---

## 🏗️ Estructura del proyecto

```
pwa-apps/
├── index.html              # Panel principal — menú por categorías + búsqueda
├── manifest.json           # Manifest PWA (nombre, iconos, colores)
├── sw.js                   # Service Worker para uso offline
├── icons/                  # Iconos PWA (192x192, 512x512)
│
├── suministros.html        # 🏠 Suministros (luz, gas, agua) + guías de facturas
├── despensa.html           # 🏠 Inventario de despensa
├── compra.html             # 🏠 Lista de la compra
├── obra.html               # 🏠 Seguimiento de obra/reforma
│
├── finanzas.html           # 💰 Finanzas personales
├── gastos-diarios.html     # 💰 Gastos diarios
├── deseados.html           # 💰 Lista de deseos
│
├── setlist.html            # 🎸 Gestión de setlists
├── instrumentos.html       # 🎸 Inventario de instrumentos
│
├── semana.html             # 📅 Planificador semanal
│
├── decisor.html            # ⚙️ Decisor aleatorio
│
└── guia_factura_luz.html   # (archivo legacy — contenido integrado en suministros)
```

---

## ✨ Mejoras realizadas (v1.3.0)

### index.html
- ✅ Menú agrupado por categorías (Hogar / Dinero / Música / Productividad / Utilidad)
- ✅ Categorías colapsables con contador de apps
- ✅ Barra de búsqueda en tiempo real
- ✅ Código de color por categoría (acento lateral en cada card)
- ✅ Versión visible en header y footer (`v1.3.0 · build 2026.03`)
- ✅ Versión elimina la guia_factura_luz del listado principal (ahora vive en Suministros)

### suministros.html
- ✅ Nueva pestaña **📖 Guías** integrada
- ✅ Guía completa de factura de luz: Resumen, Conceptos, P1/P2/P3, Actores, Test
- ✅ Placeholders para guías de Gas y Agua (próximamente)
- ✅ Version badge `v1.2` visible en la nav
- ✅ La barra de tipo se oculta automáticamente al entrar en Guías

---

## 🚀 Ideas de mejora y APIs a integrar

### Unificación de apps

Las apps actualmente viven en silos independientes. Se pueden conectar:

- **Finanzas ↔ Gastos Diarios** — sincronizar gastos diarios como líneas en Finanzas
- **Finanzas ↔ Suministros** — importar total de facturas del mes automáticamente
- **Finanzas ↔ Obra** — importar gastos de obra como categoría en Finanzas
- **Finanzas ↔ Deseados** — cuando se marca un deseo como "comprado", añadir a Finanzas
- **Compra ↔ Despensa** — al marcar un artículo en compra como comprado, se añade a despensa
- Compartir `localStorage` mediante un módulo de **bus de eventos** centralizado

### APIs útiles a integrar

#### 💡 Energía y suministros
| API | Uso | Enlace |
|-----|-----|--------|
| **OMIE** (Operador del Mercado Ibérico de Energía) | Precio horario del mercado eléctrico en tiempo real (PVPC) | [omie.es](https://www.omie.es/es/file-access-list) |
| **REE (Red Eléctrica)** | Datos de la red: producción, mix energético, emisiones CO2 en tiempo real | [api.esios.ree.es](https://api.esios.ree.es) |
| **CNMC Comparador** | Consulta tarifas reguladas y datos de comercializadoras | [cnmc.gob.es](https://comparador.cnmc.gob.es) |

**Caso de uso:** en Suministros, mostrar el precio actual del kWh y compararlo con lo que paga el usuario → "Hoy es día barato, pon la lavadora".

#### 🛒 Lista de compra / despensa
| API | Uso |
|-----|-----|
| **Open Food Facts** | Escáner de código de barras → nombre, calorías, alérgenos del producto. Gratis. |
| **Mercadona / Lidl scraping o APIs no oficiales** | Precio actual del producto para estimar el gasto de la compra antes de ir. |

#### 💰 Finanzas y gastos
| API | Uso |
|-----|-----|
| **Fixer.io / ExchangeRate-API** | Cambio de divisas en tiempo real para gastos en otros países. |
| **Banco de España** | IPC e inflación → ajustar el presupuesto mensual a la inflación real. |

#### 🎸 Música
| API | Uso |
|-----|-----|
| **Spotify Web API** | Buscar canciones para el setlist, previsualizar audio, obtener BPM y duración. |
| **MusicBrainz** | Base de datos abierta de artistas, álbumes y canciones. |
| **Chordify / Ultimate Guitar** | Integración de acordes y tonalidades por canción. |

#### 🌦️ Contexto / Utilidad
| API | Uso |
|-----|-----|
| **Open-Meteo** | Previsión meteorológica gratuita y sin API key → útil en Semana para planificar la semana |
| **Feriados (Nager.Date)** | Festivos nacionales y autonómicos para la app Semana |
| **Geolocation API (browser)** | Detectar ubicación para servicios contextuales sin backend |

---

## 💾 Persistencia de datos

Todas las apps usan `localStorage` con claves prefijadas:

```
suministros_v1    → facturas de luz/gas/agua
gastos_v1         → gastos diarios
finanzas_v1       → registros de finanzas
despensa_v1       → inventario de despensa
compra_v1         → listas de compra
obra_v1           → fases y tareas de obra
deseados_v1       → lista de deseos
setlist_v1        → setlists por grupo
instrumentos_v1   → inventario de instrumentos
semana_v1         → tareas semanales
```

Cada app expone **Exportar / Importar JSON** para backup manual o migración entre dispositivos.

---

## 🎨 Sistema de diseño

Paleta y tipografía compartida en todas las apps:

```css
--bg: #0a0a09          /* fondo principal */
--bg2: #141412         /* cards */
--bg3: #1e1e1b         /* elevación 3 */
--text: #f0ebe0        /* texto principal */
--muted: #5a5850       /* texto secundario */
--y: #e8f040           /* amarillo — acento principal */
--r: #f04030           /* rojo — alertas */
--g: #30d880           /* verde — positivo */
--b: #30a8f0           /* azul — info */
--o: #f09030           /* naranja — aviso */

/* Tipografía */
--fh: 'Bebas Neue'     /* headings display */
--fm: 'DM Mono'        /* monospace, UI */
--fs: 'DM Sans'        /* texto corrido */
```

---

## 📦 PWA — instalación

El proyecto incluye `manifest.json` y `sw.js` para instalación como PWA:

- **iOS:** Safari → Compartir → "Añadir a pantalla de inicio"
- **Android:** Chrome → menú ⋮ → "Instalar app" / "Añadir a inicio"
- **Escritorio:** Chrome/Edge → icono de instalación en la barra de dirección

---

## 📋 Changelog

### v1.3.0 (2026-03)
- `index.html` — menú por categorías, búsqueda, versioning
- `suministros.html` — integración guía factura luz en pestaña Guías

### v1.2.0
- `suministros.html` — añadidas gráficas Chart.js, resumen anual/trimestral, alertas de subida

### v1.1.0
- `guia_factura_luz.html` — guía interactiva con test (ahora integrada en suministros)
- Rediseño general con sistema de diseño unificado

### v1.0.0
- Primera versión con todas las apps básicas

---

_Proyecto personal · No destinado a producción comercial_
