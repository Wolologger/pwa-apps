# W // APPS

Panel personal de herramientas PWA. Accesible desde el navegador e instalable como app en móvil y escritorio.

**URL:** `https://wolologger.github.io/pwa-apps/`

---

## Herramientas

| Archivo | Nombre | Categorías |
|---|---|---|
| `obra.html` | Mi Obra | obra, finanzas |
| `gastos-diarios.html` | Gastos Diarios | dinero, diario |
| `suministros.html` | Suministros | hogar, dinero |
| `finanzas.html` | Finanzas | dinero |
| `despensa.html` | Despensa | hogar, cocina |
| `compra.html` | Lista Compra | hogar, cocina |
| `setlist.html` | Setlist | música |
| `instrumentos.html` | Instrumentos | música |
| `semana.html` | Semana | productividad |
| `deseados.html` | Deseados | dinero |
| `decisor.html` | Decisor | utilidad |
| `guia_factura_luz.html` | Factura Luz | hogar |

---

## Estructura

```
pwa-apps/
├── index.html              # Panel principal con listado y filtros por categoría
├── editor-categorias.html  # Editor visual de categorías (admin)
├── sw.js                   # Service Worker (PWA, offline)
├── manifest.json           # Manifest de la app
├── icons/                  # Iconos de la PWA
└── *.html                  # Herramientas individuales
```

---

## Editor de categorías

Abre `editor-categorias.html` para gestionar las categorías de cada herramienta sin tocar código:

1. Añade o elimina categorías globales
2. Abre cada herramienta y marca/desmarca sus categorías
3. Copia el bloque `const META` generado
4. Pégalo en `index.html` sustituyendo el bloque existente

Los cambios se guardan en `localStorage` mientras trabajas.

---

## Añadir una nueva herramienta

1. Crea el archivo `nueva-herramienta.html` en la raíz del repo
2. Abre `editor-categorias.html` y asígnale categorías
3. Copia el `const META` generado y actualiza `index.html`

La herramienta aparecerá automáticamente en el panel (se carga desde la API de GitHub).

---

## Service Worker y caché

El SW usa estrategia **network-first para HTML** y **cache-first para assets estáticos**:

- Las páginas `.html` siempre se sirven desde la red si hay conexión → los cambios se ven de inmediato sin Ctrl+F5
- Si no hay red, se sirve desde caché (modo offline)
- El manifest y los iconos se cachean tras la primera visita

Para forzar que todos los usuarios reciban una versión nueva, sube la constante `CACHE` en `sw.js` (ej: `wapps-v2` → `wapps-v3`).

---

## Changelog

### v1.5.0 — 2026-03
- **Nuevo:** Visibilidad por herramienta — activa o desactiva cada app desde el editor de ajustes. Config guardada en `localStorage`
- **Nuevo:** `editor-categorias.html` reescrito como panel de ajustes: toggle on/off por herramienta, sin secciones de categorías globales ni output de código
- **Nuevo:** Botón ⚙ en el topbar del index para acceder al editor. Ya no aparece como herramienta en el listado
- **Fix:** Service Worker cambiado a network-first para HTML (`wapps-v2`). Los cambios se ven sin Ctrl+F5
- **Fix:** Limpieza automática de caché antigua al actualizar el SW
- **Pendiente v2.0:** Sincronización de visibilidad y categorías con Firebase Firestore

### v1.0.0 — inicial
- Panel principal con listado de herramientas y filtros por categoría
- PWA instalable con soporte offline
- 12 herramientas: obra, gastos, despensa, finanzas, compra, setlist, instrumentos, semana, deseados, decisor, suministros, factura luz
