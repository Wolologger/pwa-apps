# W//APPS — Personal PWA Suite

> Panel de herramientas personales desplegado en GitHub Pages.
> HTML puro · sin frameworks · sin servidor · sin cuenta · todo en el navegador.

**URL:** https://wolologger.github.io/pwa-apps/
**Repo:** https://github.com/Wolologger/pwa-apps
**Versión actual:** 2.2.0

> Las versiones están anotadas **dentro de cada archivo HTML** como comentario `<!-- version: X.Y.Z -->`.
> No se usan sufijos en los nombres de archivo (sin `-v2`, sin `_new`, etc).

---

## Apps disponibles (14)

| App | Archivo | Descripción |
|-----|---------|-------------|
| 🏗️ Mi Obra | `obra.html` | Gestión de reforma, presupuesto, tareas y fases |
| 💸 Gastos Diarios | `gastos-diarios.html` | Control de gastos cotidianos con presupuesto mensual |
| 💡 Suministros | `suministros.html` | Facturas de luz, gas y agua con gráficas y alertas |
| 💰 Finanzas | `finanzas.html` | Ingresos vs gastos fijos, conectado con otras apps |
| 🥫 Despensa | `despensa.html` | Inventario de alimentos y caducidades |
| 🛒 Lista Compra | `compra.html` | Listas reutilizables, categorías custom, establecimientos |
| 🎸 Setlist | `setlist.html` | Canciones por grupo, drag & drop, modo actuación |
| 🎛️ Instrumentos | `instrumentos.html` | Inventario de guitarras, bajos, amplis y pedales |
| 📅 Semana | `semana.html` | Tareas semanales, calendario, vacaciones y eventos |
| ❤️ Deseados | `deseados.html` | Lista de deseos con prioridad y seguimiento |
| 🎲 Decisor | `decisor.html` | Elige por ti con presets editables e historial |
| 🐾 Mascotas | `mascotas.html` | Perfil, medicación, veterinario y peso |
| 💾 Backup | `backup.html` | Backup y restauración completa de todos los datos |
| ⚡ Factura Luz | `guia_factura_luz.html` | Guía interactiva para entender tu factura |

---

## Bus de datos compartido

Todas las apps usan `wapps-store.js`:

```js
WStore.get('gastos', 'data')         // leer
WStore.set('gastos', 'data', state)  // escribir
WStore.bridge.gastosEsteMes()        // accesos tipados
WNotify.check()                      // revisar alertas push
```

**Interconexiones activas:**
- Suministros + Gastos Diarios + Obra → **Finanzas**
- Mascotas → Gastos Diarios (coste vet) · Lista Compra (meds) · Semana (citas)

---

## Backup & Restore

La app `backup.html` permite:
- Backup completo (todas las apps) o selectivo en un `.json`
- Historial local de los últimos 5 backups
- Restauración total o por app individual
- Borrado seguro por app o total

---

## Changelog

### v2.2.0
- ✅ Nueva app **Backup** — sistema completo de backup/restore
- ✅ Nueva app **Mascotas** — conectada con Gastos, Compra y Calendario
- ✅ Versiones internas en todos los archivos HTML

### v2.1.0
- ✅ Finanzas v2 — interconexión vía wapps-store con Suministros, Gastos y Obra
- ✅ Deseados v2 — campo prioridad, agrupado, export/import JSON

### v2.0.0
- ✅ `wapps-store.js` — bus compartido con notificaciones push
- ✅ Semana v2, Decisor v2, Lista Compra v2, Instrumentos v2
- ✅ Export/import JSON en todas las apps, diseño responsive

### v1.0.0
- ✅ Suite inicial: 11 apps, PWA, Service Worker, APK con PWABuilder

---

*HTML puro · localStorage · GitHub Pages · PWABuilder*
