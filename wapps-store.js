/**
 * W//APPS — Shared Data Bus v1.1
 * ─────────────────────────────────────────────────────────────────
 * Módulo central de datos y notificaciones para todas las apps.
 * Cárgalo con <script src="wapps-store.js"> antes de tu código.
 * Requiere wapps-firebase.js cargado previamente para sync.
 *
 * APIs disponibles:
 *   WStore.get(app, key)           → valor o null
 *   WStore.set(app, key, value)    → void (guarda, marca pending, emite evento)
 *   WStore.on(app, key, callback)  → unsubscribe fn
 *   WStore.bridge.despensa()       → datos de despensa
 *   WStore.bridge.finanzas()       → datos de finanzas
 *   WStore.bridge.suministros()    → datos de suministros
 *   WStore.bridge.gastosDiarios()  → datos de gastos diarios
 *   WStore.bridge.compra()         → datos de lista de compra
 *   WStore.bridge.semana()         → datos de semana
 *   WStore.bridge.deseados()       → datos de deseados
 *
 *   WNotify.request()              → pide permiso al usuario
 *   WNotify.send(title, body, opts)→ lanza notificación
 *   WNotify.check()                → revisa todas las alertas ahora
 * ─────────────────────────────────────────────────────────────────
 */

// ═══════════════════════════════════════════════════════════════
// STORE — bus de datos con eventos
// ═══════════════════════════════════════════════════════════════
const WStore = (() => {
  const PREFIX = 'wapps.';

  // Claves legacy que ya existían antes del bus
  const LEGACY_KEYS = {
    'despensa.items':      'despensa_v1',
    'finanzas.data':       'finanzas_v1',
    'suministros.data':    'suministros_v1',
    'gastos.data':         'gastos_v1',
    'compra.data':         'compra_v1',
    'semana.data':         'semana_v1',
    'deseados.data':       'deseados_v1',
    'obra.data':           'miobra_v2',
    'instrumentos.data':   'instrumentos_v1',
    'setlist.data':        'setlist_v1',
  };

  function storageKey(app, key) {
    return `${PREFIX}${app}.${key}`;
  }

  function get(app, key) {
    const sk = storageKey(app, key);
    // Intenta clave nueva primero, luego legacy
    try {
      const v = localStorage.getItem(sk);
      if (v !== null) return JSON.parse(v);
      // fallback a clave legacy
      const lk = LEGACY_KEYS[`${app}.${key}`];
      if (lk) {
        const lv = localStorage.getItem(lk);
        return lv ? JSON.parse(lv) : null;
      }
    } catch(e) {}
    return null;
  }

  function set(app, key, value) {
    const sk = storageKey(app, key);
    try {
      // Añadir timestamp para merge offline/online
      const payload = (value && typeof value === 'object' && !Array.isArray(value))
        ? { ...value, _updatedAt: new Date().toISOString() }
        : value;

      localStorage.setItem(sk, JSON.stringify(payload));

      // Mantener clave legacy en sync para compatibilidad hacia atrás
      const lk = LEGACY_KEYS[`${app}.${key}`];
      if (lk) localStorage.setItem(lk, JSON.stringify(payload));

      // Emitir evento personalizado para listeners en la misma pestaña
      window.dispatchEvent(new CustomEvent('wapps:change', {
        detail: { app, key, value: payload }
      }));

      // ── Firebase sync ─────────────────────────────────────────
      const storeKey = `${app}.${key}`;

      // Marcar como pendiente siempre (por si no hay red o usuario)
      if (typeof WSync !== 'undefined') {
        WSync.markPending(storeKey);

        // Si hay usuario y red, intentar subir inmediatamente
        if (typeof WFirebase !== 'undefined') {
          const user = WFirebase.getUser();
          if (user && WFirebase.isOnline()) {
            const fsKey = storeKey.replace('.', '_');
            WFirebase.pushToFirestore(user.uid, fsKey, payload)
              .then(ok => { if (ok) WSync.clearPending(storeKey); })
              .catch(() => {}); // silencioso, queda en pending
          }
        }
      }

    } catch(e) { console.warn('WStore.set error:', e); }
  }

  function on(app, key, callback) {
    const handler = (e) => {
      if (e.detail.app === app && e.detail.key === key) {
        callback(e.detail.value);
      }
    };
    // Eventos en misma pestaña
    window.addEventListener('wapps:change', handler);
    // Eventos cross-tab via StorageEvent nativo
    const storageHandler = (e) => {
      const sk = storageKey(app, key);
      if (e.key === sk) {
        try { callback(JSON.parse(e.newValue)); } catch(_) {}
      }
    };
    window.addEventListener('storage', storageHandler);
    // Devuelve función de cleanup
    return () => {
      window.removeEventListener('wapps:change', handler);
      window.removeEventListener('storage', storageHandler);
    };
  }

  // ── Bridges — accesos tipados a cada app ──
  const bridge = {
    despensa() {
      const d = get('despensa', 'items');
      return d?.alimentos || [];
    },
    finanzas() {
      return get('finanzas', 'data') || { ingresos: [], gastos: [] };
    },
    suministros() {
      const d = get('suministros', 'data');
      return d?.facturas || [];
    },
    gastosDiarios() {
      const d = get('gastos', 'data');
      return d?.gastos || [];
    },
    compra() {
      const d = get('compra', 'data');
      return d || null;
    },
    semana() {
      return get('semana', 'data') || null;
    },
    deseados() {
      const d = get('deseados', 'data');
      return d?.items || [];
    },
    // Utilitario: media mensual de suministros por tipo
    suministrosMediaMensual(tipo) {
      const facturas = bridge.suministros()
        .filter(f => f.tipo === tipo)
        .sort((a, b) => b.inicio?.localeCompare(a.inicio) || 0)
        .slice(0, 3);
      if (!facturas.length) return null;
      const medias = facturas.map(f => {
        if (f.inicio && f.fin) {
          const dias = Math.max(1, Math.round(
            (new Date(f.fin) - new Date(f.inicio)) / (1000 * 60 * 60 * 24)
          ));
          return f.importe / (dias / 30);
        }
        return f.importe;
      });
      return medias.reduce((s, v) => s + v, 0) / medias.length;
    },
    // Gastos del mes actual en gastos-diarios
    gastosEsteMes() {
      const now = new Date();
      const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return bridge.gastosDiarios()
        .filter(g => g.fecha?.startsWith(prefix))
        .reduce((s, g) => s + (g.importe || 0), 0);
    },
    // Items de despensa que caducan en N días
    caducidadesProximas(dias = 3) {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      return bridge.despensa().filter(item => {
        if (!item.fecha) return false;
        const cad = new Date(item.fecha);
        const diff = Math.ceil((cad - hoy) / (1000 * 60 * 60 * 24));
        return diff <= dias;
      });
    }
  };

  // ── syncOnLoad: pull puntual de un dato desde Firestore ──────────
  // Llámalo al inicio de cada app para aplicar datos remotos si son más recientes.
  // No bloquea el render: la app ya carga con localStorage, esto actualiza en background.
  //
  // Uso:  WStore.syncOnLoad('despensa', 'items', data => render(data));
  //
  async function syncOnLoad(app, key, onUpdate) {
    try {
      // Necesita WFirebase disponible y usuario autenticado
      if (typeof WFirebase === 'undefined') return;
      const user = WFirebase.getUser();
      if (!user || !WFirebase.isOnline()) return;

      const fsKey  = `${app}_${key}`;
      const remote = await WFirebase.pullFromFirestore(user.uid, fsKey);
      if (!remote) return;

      // Comparar timestamps
      const localRaw  = localStorage.getItem(storageKey(app, key));
      const local     = localRaw ? JSON.parse(localRaw) : null;
      const remoteTs  = new Date(remote._updatedAt || 0).getTime();
      const localTs   = new Date(local?._updatedAt  || 0).getTime();

      if (remoteTs > localTs) {
        // Firestore es más reciente — aplicar y notificar
        const clean = { ...remote };
        delete clean._updatedAt;

        const sk = storageKey(app, key);
        localStorage.setItem(sk, JSON.stringify(clean));

        // Sync clave legacy si existe
        const lk = LEGACY_KEYS[`${app}.${key}`];
        if (lk) localStorage.setItem(lk, JSON.stringify(clean));

        // Notificar a la app
        if (typeof onUpdate === 'function') onUpdate(clean);

        // Emitir evento global
        window.dispatchEvent(new CustomEvent('wapps:change', {
          detail: { app, key, value: clean }
        }));
      }
    } catch(e) {
      console.warn(`[WStore.syncOnLoad] ${app}.${key}:`, e);
    }
  }

  // ── syncAllOnLoad: pull de todas las claves del usuario ─────────
  // Útil en index.html al hacer login para traer todo de golpe.
  async function syncAllOnLoad() {
    try {
      if (typeof WSync === 'undefined' || typeof WFirebase === 'undefined') return;
      const user = WFirebase.getUser();
      if (!user || !WFirebase.isOnline()) return;
      await WSync.pullAll(user.uid);
    } catch(e) {
      console.warn('[WStore.syncAllOnLoad]', e);
    }
  }

  return { get, set, on, bridge, syncOnLoad, syncAllOnLoad };
})();


// ═══════════════════════════════════════════════════════════════
// NOTIFY — sistema de notificaciones
// ═══════════════════════════════════════════════════════════════
const WNotify = (() => {
  const STORE_KEY_PERM   = 'notify.permission';
  const STORE_KEY_LAST   = 'notify.lastCheck';
  const STORE_KEY_CONFIG = 'notify.config';

  const DEFAULT_CONFIG = {
    caducidades:    true,   // Despensa: caducidades próximas
    stockMinimo:    true,   // Despensa: stock bajo
    facturas:       true,   // Suministros: factura sin registrar
    presupuesto:    true,   // Finanzas: presupuesto al límite
    semana:         true,   // Semana: tareas del día
    diasSinGasto:   false,  // Gastos: recordatorio de registro
  };

  function getConfig() {
    try {
      const s = localStorage.getItem(STORE_KEY_CONFIG);
      return s ? { ...DEFAULT_CONFIG, ...JSON.parse(s) } : { ...DEFAULT_CONFIG };
    } catch(e) { return { ...DEFAULT_CONFIG }; }
  }

  function setConfig(cfg) {
    try { localStorage.setItem(STORE_KEY_CONFIG, JSON.stringify(cfg)); } catch(e) {}
  }

  async function request() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    try { localStorage.setItem(STORE_KEY_PERM, result); } catch(e) {}
    return result;
  }

  function send(title, body, opts = {}) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const n = new Notification(title, {
      body,
      icon:  opts.icon  || '/pwa-apps/icons/icon-192.png',
      badge: opts.badge || '/pwa-apps/icons/icon-192.png',
      tag:   opts.tag   || 'wapps-generic',
      requireInteraction: opts.persist || false,
      ...opts
    });
    if (opts.url) n.onclick = () => { window.focus(); window.location.href = opts.url; n.close(); };
    return n;
  }

  // ── Checks individuales ──

  function checkCaducidades(config) {
    if (!config.caducidades) return [];
    const items = WStore.bridge.caducidadesProximas(3);
    if (!items.length) return [];
    const hoy   = items.filter(i => { const d = new Date(i.fecha) - new Date(); return Math.ceil(d / 864e5) <= 0; });
    const pronto = items.filter(i => { const d = new Date(i.fecha) - new Date(); const dd = Math.ceil(d / 864e5); return dd > 0 && dd <= 3; });
    const alerts = [];
    if (hoy.length) alerts.push({
      title: '🔴 Caducados hoy',
      body:  hoy.map(i => i.nombre).join(', '),
      tag:   'despensa-hoy',
      url:   'despensa.html'
    });
    if (pronto.length) alerts.push({
      title: '🟠 Caducan pronto',
      body:  pronto.map(i => `${i.nombre} (${i.fecha})`).join(', '),
      tag:   'despensa-pronto',
      url:   'despensa.html'
    });
    return alerts;
  }

  function checkFacturasSinRegistrar(config) {
    if (!config.facturas) return [];
    const facturas = WStore.bridge.suministros();
    const alerts = [];
    ['luz', 'gas', 'agua'].forEach(tipo => {
      const tf = facturas.filter(f => f.tipo === tipo).sort((a, b) => b.inicio?.localeCompare(a.inicio) || 0);
      if (!tf.length) return;
      const ultima = new Date(tf[0].inicio);
      const hoy    = new Date();
      const dias   = Math.floor((hoy - ultima) / 864e5);
      if (dias > 35) {
        alerts.push({
          title: `💡 Suministros — ${tipo}`,
          body:  `Llevas ${dias} días sin registrar una factura de ${tipo}. ¿La has recibido?`,
          tag:   `suministros-${tipo}`,
          url:   'suministros.html'
        });
      }
    });
    return alerts;
  }

  function checkPresupuesto(config) {
    if (!config.presupuesto) return [];
    const fin     = WStore.bridge.finanzas();
    const FREQ_M  = { mensual:1, bimestral:2, trimestral:3, semestral:6, anual:12 };
    const ingresos = (fin.ingresos || []).reduce((s, i) => s + (i.importe / (FREQ_M[i.freq] || 1)), 0);
    if (!ingresos) return [];
    const gastosMes = WStore.bridge.gastosEsteMes();
    const pct = gastosMes / ingresos;
    if (pct >= 0.8) {
      return [{
        title: '💰 Presupuesto al límite',
        body:  `Llevas ${Math.round(pct * 100)}% de tus ingresos gastados este mes (${gastosMes.toFixed(0)} €).`,
        tag:   'finanzas-presupuesto',
        url:   'finanzas.html'
      }];
    }
    return [];
  }

  function checkDiasSinGasto(config) {
    if (!config.diasSinGasto) return [];
    const gastos = WStore.bridge.gastosDiarios();
    if (!gastos.length) return [];
    const ultimo = gastos.map(g => new Date(g.fecha)).sort((a, b) => b - a)[0];
    const dias   = Math.floor((new Date() - ultimo) / 864e5);
    if (dias >= 2) {
      return [{
        title: '📝 Gastos sin registrar',
        body:  `Llevas ${dias} días sin apuntar ningún gasto. ¿Lo tienes al día?`,
        tag:   'gastos-recordatorio',
        url:   'gastos-diarios.html'
      }];
    }
    return [];
  }

  function checkSemana(config) {
    if (!config.semana) return [];
    const data = WStore.bridge.semana();
    if (!data?.tareas?.length) return [];
    const hoy = new Date().toISOString().slice(0, 10);
    const hoyTareas = data.tareas.filter(t => t.fecha === hoy && !t.done);
    if (hoyTareas.length) {
      return [{
        title: '📅 Tareas de hoy',
        body:  `Tienes ${hoyTareas.length} tarea${hoyTareas.length !== 1 ? 's' : ''} pendiente${hoyTareas.length !== 1 ? 's' : ''} para hoy.`,
        tag:   'semana-hoy',
        url:   'semana.html'
      }];
    }
    return [];
  }

  // ── Check maestro ──
  function check() {
    const config  = getConfig();
    const alerts  = [
      ...checkCaducidades(config),
      ...checkFacturasSinRegistrar(config),
      ...checkPresupuesto(config),
      ...checkDiasSinGasto(config),
      ...checkSemana(config),
    ];
    alerts.forEach(a => send(a.title, a.body, { tag: a.tag, url: a.url }));
    try { localStorage.setItem(STORE_KEY_LAST, new Date().toISOString()); } catch(e) {}
    return alerts;
  }

  // ── UI helper: renderiza panel de config de notificaciones ──
  function renderConfigPanel(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const config = getConfig();
    const perm   = ('Notification' in window) ? Notification.permission : 'unsupported';

    const labels = {
      caducidades:  '🥛 Caducidades en despensa',
      stockMinimo:  '📦 Stock mínimo agotado',
      facturas:     '💡 Facturas sin registrar',
      presupuesto:  '💰 Presupuesto mensual al límite',
      semana:       '📅 Tareas del día',
      diasSinGasto: '📝 Recordatorio de registro de gastos',
    };

    const permBadge = perm === 'granted'
      ? `<span style="color:var(--g);font-size:10px;font-family:var(--fm)">● Notificaciones activadas</span>`
      : perm === 'denied'
      ? `<span style="color:var(--r);font-size:10px;font-family:var(--fm)">● Notificaciones bloqueadas — actívalas en ajustes del navegador</span>`
      : `<button onclick="WNotify.request().then(()=>WNotify.renderConfigPanel('${containerId}'))" style="background:var(--y);color:#0a0a09;border:none;border-radius:6px;padding:7px 14px;font-family:var(--fm);font-size:11px;cursor:pointer;">Activar notificaciones</button>`;

    el.innerHTML = `
      <div style="margin-bottom:12px;">${permBadge}</div>
      ${Object.entries(labels).map(([k, label]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:0.5px solid var(--border,rgba(255,255,255,0.07));">
          <span style="font-size:12px;color:var(--text,#f0ebe0);">${label}</span>
          <label style="position:relative;display:inline-block;width:36px;height:20px;cursor:pointer;">
            <input type="checkbox" ${config[k] ? 'checked' : ''} onchange="WNotify._toggleConfig('${k}',this.checked,'${containerId}')"
              style="opacity:0;width:0;height:0;position:absolute;">
            <span style="position:absolute;inset:0;background:${config[k] ? 'var(--y,#e8f040)' : 'var(--dim,#2a2a26)'};border-radius:20px;transition:0.2s;"></span>
            <span style="position:absolute;top:3px;left:${config[k] ? '19px' : '3px'};width:14px;height:14px;background:${config[k] ? '#0a0a09' : '#5a5850'};border-radius:50%;transition:0.2s;"></span>
          </label>
        </div>
      `).join('')}
      ${perm === 'granted' ? `<button onclick="WNotify.check()" style="margin-top:12px;width:100%;padding:9px;background:transparent;border:0.5px solid var(--line2,rgba(255,255,255,0.11));border-radius:8px;color:var(--muted,#5a5850);font-family:var(--fm);font-size:11px;cursor:pointer;">Probar notificaciones ahora</button>` : ''}
    `;
  }

  function _toggleConfig(key, val, containerId) {
    const cfg = getConfig();
    cfg[key] = val;
    setConfig(cfg);
    if (containerId) renderConfigPanel(containerId);
  }

  return { request, send, check, getConfig, setConfig, renderConfigPanel, _toggleConfig };
})();


// ═══════════════════════════════════════════════════════════════
// AUTO-CHECK al cargar cualquier página
// ═══════════════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Solo revisar 1 vez cada 2 horas para no saturar
  try {
    const last = localStorage.getItem('notify.lastCheck');
    if (last) {
      const mins = (Date.now() - new Date(last)) / 60000;
      if (mins < 120) return;
    }
  } catch(e) {}

  // Pequeño delay para no bloquear el render inicial
  setTimeout(() => WNotify.check(), 2000);
});
