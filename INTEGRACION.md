# Integración wapps-store.js — Guía de cambios por app

> Estos son los cambios exactos a aplicar en cada archivo HTML para conectarlos al bus compartido.
> En todos los casos el patrón es el mismo: **3 cambios** por app.

---

## Patrón general (aplica a todas)

### Cambio 1 — Cargar el bus (en `<head>`)
```html
<!-- Añadir ANTES del primer <style> -->
<script src="wapps-store.js"></script>
```

### Cambio 2 — Reemplazar `loadState()` / `load()`
```js
// ANTES (ejemplo gastos):
function load(){
  try{const r=localStorage.getItem('gastos_v1');if(r)return JSON.parse(r);}catch(e){}
  return{gastos:[],budgets:{},nextId:1};
}

// DESPUÉS:
function load(){
  const d = WStore.get('gastos','data');         // ← nuevo
  if(d) return d;
  try{const r=localStorage.getItem('gastos_v1');if(r)return JSON.parse(r);}catch(e){}
  return{gastos:[],budgets:{},nextId:1};
}
```

### Cambio 3 — Reemplazar `save()`
```js
// ANTES:
function save(){
  state.nextId=nid;
  try{localStorage.setItem('gastos_v1',JSON.stringify(state));}catch(e){}
}

// DESPUÉS:
function save(){
  state.nextId=nid;
  WStore.set('gastos','data',state);  // ← sustituye localStorage directo
}
```

### Cambio 4 — Auto-check notificaciones (al final del script)
```js
// Añadir justo antes del cierre </script>
if(typeof WNotify!=='undefined') WNotify.check();
```

---

## 🔥 gastos-diarios.html

**Clave WStore:** `gastos` / `data`  
**Clave legacy:** `gastos_v1`

Cambios 1–4 del patrón general.

**Adicional** — en `renderAjustes()`, añadir panel de notificaciones:
```js
// Al final de renderAjustes(), añadir:
const nc = document.createElement('div');
nc.innerHTML = '<div style="margin-top:14px;"><div style="font-size:9px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Notificaciones</div><div id="notif-gastos"></div></div>';
document.getElementById('panel-ajustes').appendChild(nc);
WNotify.renderConfigPanel('notif-gastos');
```

---

## 📅 semana.html

**Clave WStore:** `semana` / `data`  
**Clave legacy:** `semana_v1`

Buscar en semana.html:
```js
// ANTES (loadState):
try{const r=localStorage.getItem('semana_v1');...}

// DESPUÉS:
function loadState(){
  const d = WStore.get('semana','data');
  if(d) return d;
  try{const r=localStorage.getItem('semana_v1');if(r)return JSON.parse(r);}catch(e){}
  return{ tareas:[], nextId:1 };
}
```

```js
// ANTES (save):
localStorage.setItem('semana_v1', JSON.stringify(state));

// DESPUÉS:
WStore.set('semana','data', state);
```

Cambios 1 y 4 del patrón general.

---

## 💡 suministros.html

**Clave WStore:** `suministros` / `data`  
**Clave legacy:** `suministros_v1`

```js
// ANTES (loadState):
try { const r = localStorage.getItem('suministros_v1'); if (r) return JSON.parse(r); } catch(e) {}

// DESPUÉS:
function loadState() {
  const d = WStore.get('suministros','data');
  if(d) return d;
  try { const r = localStorage.getItem('suministros_v1'); if (r) return JSON.parse(r); } catch(e) {}
  return { facturas: [], nextId: 1 };
}
```

```js
// ANTES (save):
try { localStorage.setItem('suministros_v1', JSON.stringify(state)); } catch(e) {}

// DESPUÉS:
WStore.set('suministros','data', state);
```

Cambios 1 y 4 del patrón general.

**Nueva pestaña "Conexiones"** en la tab de Datos:
```html
<!-- Añadir en la sección de datos -->
<div style="margin-top:14px;">
  <div style="font-size:9px;color:var(--muted);letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Apps conectadas</div>
  <div id="sumin-conexiones" style="font-size:11px;color:var(--muted);font-family:var(--fm);line-height:1.8;"></div>
</div>
```
```js
// En renderDatos() al final:
const fin = WStore.bridge.finanzas();
const gastos = WStore.bridge.gastosEsteMes();
document.getElementById('sumin-conexiones').innerHTML =
  `Finanzas: <span style="color:${fin.ingresos?.length?'var(--g)':'var(--muted)'}">${fin.ingresos?.length?'✓ conectado':'sin datos'}</span><br>` +
  `Gastos este mes: <span style="color:var(--text)">${gastos.toFixed(2)} €</span>`;
```

---

## 💰 finanzas.html

**Clave WStore:** `finanzas` / `data`  
**Clave legacy:** `finanzas_v1`

```js
// ANTES (loadState):
try{const r=localStorage.getItem('finanzas_v1');if(r)return JSON.parse(r);}catch(e){}

// DESPUÉS:
function loadState(){
  const d = WStore.get('finanzas','data');
  if(d) return d;
  try{const r=localStorage.getItem('finanzas_v1');if(r)return JSON.parse(r);}catch(e){}
  return{ingresos:[...],gastos:[...],nextId:10};
}
```

```js
// ANTES (save):
try{localStorage.setItem('finanzas_v1',JSON.stringify(state));}catch(e){}

// DESPUÉS:
WStore.set('finanzas','data',state);
```

**Reemplazar bridges manuales** — finanzas.html tiene `readSuministros()`, `readGastosDiarios()`, `readObra()` escritas a mano accediendo a claves crudas. Reemplazar por:

```js
// ANTES:
function readSuministros(){
  try{ const raw=localStorage.getItem('suministros_v1'); ... }
}
function readGastosDiarios(){
  try{ const raw=localStorage.getItem('gastos_v1'); ... }
}
function readObra(){
  try{ const raw=localStorage.getItem('miobra_v2'); ... }
}

// DESPUÉS (una sola línea cada una):
function readSuministros(){
  const tipos=['luz','gas','agua'];
  const result={};
  tipos.forEach(t=>{
    const m = WStore.bridge.suministrosMediaMensual(t);
    if(m!==null) result[t]=m;
  });
  return Object.keys(result).length ? result : null;
}
function readGastosDiarios(){
  const total = WStore.bridge.gastosEsteMes();
  return total > 0 ? total : null;
}
function readObra(){
  try{
    const d = WStore.get('obra','data');
    const raw = d || JSON.parse(localStorage.getItem('miobra_v2')||'null');
    return raw?.gastos?.reduce((s,g)=>s+g.importe,0) || null;
  }catch(e){ return null; }
}
```

Cambios 1 y 4 del patrón general.

---

## Resumen de archivos a modificar

| App | Archivo | Cambios |
|-----|---------|---------|
| ✅ Despensa | `despensa.html` | **Completado** — archivo nuevo generado |
| 🔧 Gastos Diarios | `gastos-diarios.html` | Patrón 1-4 + panel notif en ajustes |
| 🔧 Semana | `semana.html` | Patrón 1-4 |
| 🔧 Suministros | `suministros.html` | Patrón 1-4 + panel conexiones |
| 🔧 Finanzas | `finanzas.html` | Patrón 1-4 + reemplazar bridges manuales |

Los archivos marcados como 🔧 son cambios quirúrgicos de ~5 líneas en el código existente.
El archivo ✅ ya está generado completo y listo para subir.
