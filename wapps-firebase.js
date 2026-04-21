/**
 * W//APPS — Firebase Module v1.0
 * ─────────────────────────────────────────────────────────────────
 * Gestiona autenticación con Google y sincronización con Firestore.
 * Cárgalo DESPUÉS de los scripts de Firebase SDK v10 compat por CDN.
 *
 * APIs disponibles:
 *   WFirebase.login()                         → abre popup login Google
 *   WFirebase.logout()                        → cierra sesión
 *   WFirebase.onAuthChange(callback)          → observer auth → callback(user|null)
 *   WFirebase.getUser()                       → usuario actual o null
 *   WFirebase.pushToFirestore(uid, key, data) → guarda en users/{uid}/data/{key}
 *   WFirebase.pullFromFirestore(uid, key)     → lee users/{uid}/data/{key}
 *   WFirebase.pullAll(uid)                    → lee todos los docs de users/{uid}/data
 *   WFirebase.isOnline()                      → boolean
 *
 * Eventos emitidos en window:
 *   wapps:auth-change    → detail: { user }
 *   wapps:online         → conexión recuperada
 *   wapps:offline        → conexión perdida
 *   wapps:sync-start     → detail: { total }
 *   wapps:sync-done      → detail: { pushed, failed }
 *   wapps:pending-change → detail: { pending: [] }
 * ─────────────────────────────────────────────────────────────────
 */

const WFirebase = (() => {

  // Config cargada desde wapps-config.js (excluido del repo via .gitignore)
  // Si no existe, muestra un aviso claro en consola.
  const FIREBASE_CONFIG = (() => {
    if (window.WAPPS_CONFIG) return window.WAPPS_CONFIG;
    console.error(
      '[WFirebase] No se encontró wapps-config.js.\n' +
      'Copia wapps-config.example.js → wapps-config.js y añade tus credenciales Firebase.'
    );
    return null;
  })();

  let _auth  = null;
  let _db    = null;
  let _user  = null;
  let _ready = false;
  let _online = navigator.onLine;

  // ── Init ─────────────────────────────────────────────────────────
  function _init() {
    try {
      if (!FIREBASE_CONFIG) return;
      firebase.initializeApp(FIREBASE_CONFIG);
      _auth  = firebase.auth();
      _db    = firebase.firestore();
      _ready = true;

      // Observer de auth persistente
      _auth.onAuthStateChanged(user => {
        _user = user;
        // Al autenticarse: bajar siempre datos de Firestore, sin importar localStorage
        if (user && _online) {
          WSync.pullAll(user.uid).catch(() => {});
        }
        window.dispatchEvent(new CustomEvent('wapps:auth-change', { detail: { user } }));
      });
    } catch(e) {
      console.error('[WFirebase] Error init:', e);
    }
  }

  function _waitForSDK(retries = 30) {
    if (typeof firebase !== 'undefined' && firebase.app) {
      _init();
    } else if (retries > 0) {
      setTimeout(() => _waitForSDK(retries - 1), 200);
    } else {
      console.error('[WFirebase] Firebase SDK no disponible.');
    }
  }

  // Online/Offline
  window.addEventListener('online',  () => { _online = true;  window.dispatchEvent(new CustomEvent('wapps:online')); });
  window.addEventListener('offline', () => { _online = false; window.dispatchEvent(new CustomEvent('wapps:offline')); });

  // ── Auth ─────────────────────────────────────────────────────────
  async function login() {
    if (!_ready) return null;
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result   = await _auth.signInWithPopup(provider);
      return result.user;
    } catch(e) {
      console.error('[WFirebase] login error:', e);
      return null;
    }
  }

  async function logout() {
    if (!_ready) return;
    try { await _auth.signOut(); } catch(e) { console.error('[WFirebase] logout error:', e); }
  }

  function onAuthChange(cb) {
    if (!_ready) {
      // Si todavía no está listo, escucha el evento global
      const handler = e => cb(e.detail.user);
      window.addEventListener('wapps:auth-change', handler);
      return () => window.removeEventListener('wapps:auth-change', handler);
    }
    return _auth.onAuthStateChanged(cb);
  }

  function getUser()   { return _user; }
  function isOnline()  { return _online; }
  function isReady()   { return _ready; }

  // ── Firestore push ────────────────────────────────────────────────
  async function pushToFirestore(uid, key, data) {
    if (!_ready || !uid) return false;
    try {
      const payload = { ...data, _updatedAt: new Date().toISOString() };
      await _db.collection('users').doc(uid).collection('data').doc(key).set(payload);
      return true;
    } catch(e) {
      console.error(`[WFirebase] push error ${key}:`, e);
      return false;
    }
  }

  // ── Firestore pull ────────────────────────────────────────────────
  async function pullFromFirestore(uid, key) {
    if (!_ready || !uid) return null;
    try {
      const snap = await _db.collection('users').doc(uid).collection('data').doc(key).get();
      if (!snap.exists) return null;
      const data = snap.data();
      delete data._updatedAt;
      return data;
    } catch(e) {
      console.error(`[WFirebase] pull error ${key}:`, e);
      return null;
    }
  }

  // ── Firestore pull ALL ────────────────────────────────────────────
  async function pullAll(uid) {
    if (!_ready || !uid) return {};
    try {
      const snap   = await _db.collection('users').doc(uid).collection('data').get();
      const result = {};
      snap.forEach(doc => {
        const data = doc.data();
        // Guardamos _updatedAt para comparar timestamps en WSync
        result[doc.id] = data;
      });
      return result;
    } catch(e) {
      console.error('[WFirebase] pullAll error:', e);
      return {};
    }
  }

  // Init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => _waitForSDK());
  } else {
    _waitForSDK();
  }

  return { login, logout, onAuthChange, getUser, isOnline, isReady, pushToFirestore, pullFromFirestore, pullAll };

})();


// ═══════════════════════════════════════════════════════════════
// WSYNC — cola de pendientes + sync manual y automático
// ═══════════════════════════════════════════════════════════════
const WSync = (() => {

  const PENDING_KEY = 'wapps.pending';

  // Todas las claves que WStore gestiona
  const WSTORE_KEYS = [
    'despensa.items',
    'compra.data',
    'suministros.data',
    'finanzas.data',
    'gastos.data',
    'semana.data',
    'deseados.data',
    'obra.data',
    'instrumentos.data',
    'setlist.data',
    'mascotas.data',
    'coches.data',
    'ninos.data',
  ];

  // ── Pendientes ────────────────────────────────────────────────────
  function getPending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch(e) { return []; }
  }

  function markPending(key) {
    const p = getPending();
    if (!p.includes(key)) {
      p.push(key);
      localStorage.setItem(PENDING_KEY, JSON.stringify(p));
    }
    _emit();
  }

  function clearPending(key) {
    localStorage.setItem(PENDING_KEY, JSON.stringify(getPending().filter(k => k !== key)));
    _emit();
  }

  function clearAllPending() {
    localStorage.setItem(PENDING_KEY, '[]');
    _emit();
  }

  function _emit() {
    window.dispatchEvent(new CustomEvent('wapps:pending-change', { detail: { pending: getPending() } }));
  }

  // ── Push: sube pendientes a Firestore ────────────────────────────
  // Retry state en memoria — no persiste en localStorage
  // Evita reintentar errores permanentes (ej. reglas de seguridad de Firestore)
  const _retryCount = new Map();
  const _MAX_RETRIES = 3;
  const _RETRY_DELAYS = [2000, 4000, 8000]; // backoff exponencial: 2s → 4s → 8s

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function _pushWithRetry(uid, key, attempt) {
    attempt = attempt || 0;
    if (attempt >= _MAX_RETRIES) {
      console.warn('[WSync] max retries reached for', key, '— skipping this session');
      return false;
    }
    const raw = localStorage.getItem('wapps.' + key);
    if (!raw) { clearPending(key); return true; }
    const data = JSON.parse(raw);
    const fsKey = key.replace('.', '_');
    try {
      const ok = await WFirebase.pushToFirestore(uid, fsKey, data);
      if (ok) { _retryCount.delete(key); return true; }
    } catch(e) {
      console.warn('[WSync] push error', key, e.message);
    }
    // Falló: esperar con backoff y reintentar
    const nextAttempt = attempt + 1;
    _retryCount.set(key, nextAttempt);
    if (nextAttempt < _MAX_RETRIES) {
      const delay = _RETRY_DELAYS[attempt] || 8000;
      console.warn('[WSync] retry', nextAttempt, 'for', key, 'in', delay + 'ms');
      await _sleep(delay);
      return _pushWithRetry(uid, key, nextAttempt);
    }
    return false;
  }

  async function syncAll(uid) {
    if (!uid || !WFirebase.isOnline()) return { pushed: 0, failed: 0 };
    const pending = getPending();
    if (!pending.length) return { pushed: 0, failed: 0 };

    window.dispatchEvent(new CustomEvent('wapps:sync-start', { detail: { total: pending.length } }));

    let pushed = 0, failed = 0;

    for (const key of [...pending]) {
      // Saltar claves que ya fallaron MAX_RETRIES veces en esta sesión
      if ((_retryCount.get(key) || 0) >= _MAX_RETRIES) { failed++; continue; }
      try {
        const ok = await _pushWithRetry(uid, key, 0);
        if (ok) { pushed++; clearPending(key); }
        else    { failed++; }
      } catch(e) {
        console.error('[WSync] syncAll error', key, ':', e);
        failed++;
      }
    }

    window.dispatchEvent(new CustomEvent('wapps:sync-done', { detail: { pushed, failed } }));
    return { pushed, failed };
  }

  // ── Merge inteligente de arrays por id ───────────────────────────
  // Evita machacar ediciones offline en dos dispositivos distintos.
  // Une los arrays local y remoto por `idField`, priorizando el item
  // con _updatedAt más reciente cuando hay conflicto en el mismo id.
  // Solo se activa si ambas versiones tienen menos de 24h de diferencia
  // (si la diferencia es mayor, gana el más reciente sin merge).
  //
  // Claves y campos de array que se pueden mergear:
  const MERGE_MAP = {
    'despensa_items':    [{ field: 'alimentos', id: 'id' }],
    'compra_data':       [{ field: 'items',     id: 'id' }],
    'deseados_data':     [{ field: 'items',     id: 'id' }],
    'setlist_data':      [{ field: 'canciones', id: 'id' }, { field: 'bandas', id: 'id' }],
    'mascotas_data':     [{ field: 'pets',      id: 'id' }],
    'coches_data':       [{ field: 'cars',      id: 'id' }],
    'ninos_data':        [{ field: 'kids',      id: 'id' }],
    'suministros_data':  [{ field: 'facturas',  id: 'id' }],
    'finanzas_data':     [{ field: 'ingresos',  id: 'id' }, { field: 'gastos', id: 'id' }],
    'instrumentos_data': [{ field: 'items',     id: 'id' }],
    'obra_data':         [{ field: 'proyectos', id: 'id' }],
  };

  const MERGE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 horas

  function _mergeArrays(localArr, remoteArr, idField = 'id') {
    if (!Array.isArray(localArr) || !localArr.length) return remoteArr || [];
    if (!Array.isArray(remoteArr) || !remoteArr.length) return localArr;

    const merged = new Map();

    // Insertar todos los items locales primero
    for (const item of localArr) {
      merged.set(item[idField], item);
    }

    // Mezclar con remotos: si hay conflicto, gana el más reciente por _updatedAt
    for (const remoteItem of remoteArr) {
      const key = remoteItem[idField];
      const localItem = merged.get(key);
      if (!localItem) {
        // Item nuevo en remoto — añadir
        merged.set(key, remoteItem);
      } else {
        // Conflicto: comparar timestamps
        const remoteTs = new Date(remoteItem._updatedAt || 0).getTime();
        const localTs  = new Date(localItem._updatedAt  || 0).getTime();
        if (remoteTs > localTs) {
          merged.set(key, remoteItem);
        }
        // Si local es más reciente o igual, conservar local (ya está en el Map)
      }
    }

    return Array.from(merged.values());
  }

  // ── Pull: baja todo desde Firestore y mezcla con local ───────────
  async function pullAll(uid) {
    if (!uid || !WFirebase.isOnline()) return false;
    try {
      const remote = await WFirebase.pullAll(uid);
      for (const [fsKey, data] of Object.entries(remote)) {
        const storeKey = fsKey.replace('_', '.');
        const localKey = 'wapps.' + storeKey;
        const localRaw = localStorage.getItem(localKey);
        const local    = localRaw ? JSON.parse(localRaw) : null;

        const remoteTs = new Date(data._updatedAt || 0).getTime();
        const localTs  = new Date(local?._updatedAt || 0).getTime();
        const ageDiff  = Math.abs(remoteTs - localTs);

        let merged = null;

        if (!local) {
          // Sin datos locales — usar remoto directamente
          merged = { ...data };
        } else if (remoteTs <= localTs) {
          // Local más reciente o igual — no tocar
          continue;
        } else if (ageDiff < MERGE_WINDOW_MS && MERGE_MAP[fsKey]) {
          // Diferencia menor a 24h y clave con arrays mergeables:
          // intentar merge inteligente en lugar de reemplazar
          merged = { ...local };
          let didMerge = false;
          for (const { field, id } of MERGE_MAP[fsKey]) {
            const localArr  = local[field];
            const remoteArr = data[field];
            if (Array.isArray(localArr) && Array.isArray(remoteArr)) {
              merged[field] = _mergeArrays(localArr, remoteArr, id);
              didMerge = true;
            }
          }
          if (!didMerge) {
            // Sin arrays mergeables — comportamiento original (gana remoto)
            merged = { ...data };
          }
          // Actualizar nextId al máximo de ambos para evitar colisiones
          if (local.nextId || data.nextId) {
            merged.nextId = Math.max(local.nextId || 0, data.nextId || 0);
          }
          console.info(`[WSync] merge inteligente aplicado: ${fsKey}`);
        } else {
          // Diferencia > 24h o clave sin merge map — gana el más reciente
          merged = { ...data };
        }

        // Guardar CON _updatedAt en localStorage para que la próxima comparación
        // sepa cuándo fue la última actualización y no sobreescriba datos más nuevos
        localStorage.setItem(localKey, JSON.stringify(merged));
        // Pasar a la app sin _updatedAt (campo interno, no de negocio)
        const clean = { ...merged };
        delete clean._updatedAt;
        const [app, key] = storeKey.split('.');
        if (app && key) {
          window.dispatchEvent(new CustomEvent('wapps:change', { detail: { app, key, value: clean } }));
        }
      }
      // Notificar a todas las apps para que se re-rendericen con los datos nuevos
      window.dispatchEvent(new CustomEvent('wapps:recovered', { detail: { source: 'firestore' } }));
      return true;
    } catch(e) {
      console.error('[WSync] pullAll error:', e);
      return false;
    }
  }

  // ── Auto-sync al recuperar conexión ─────────────────────────────
  window.addEventListener('wapps:online', async () => {
    const user = WFirebase.getUser();
    if (user && getPending().length > 0) {
      await syncAll(user.uid);
    }
  });

  // ── Pull al autenticarse — baja datos aunque localStorage tenga algo ─
  // Esto es el fix principal para sync entre dispositivos: sin esto,
  // el segundo dispositivo nunca recibe los datos del primero si su
  // localStorage no está vacío.
  window.addEventListener('wapps:auth-change', async (e) => {
    const user = e.detail?.user;
    if (!user || !WFirebase.isOnline()) return;
    try {
      // Primero subir pendientes locales (por si el dispositivo tenía cambios offline)
      if (getPending().length > 0) await syncAll(user.uid);
      // Luego bajar todo de Firestore para recibir cambios de otros dispositivos
      await pullAll(user.uid);
    } catch(err) {
      console.warn('[WSync] auth-change sync error:', err);
    }
  });

  // Mapa de claves legacy → clave wapps.* (mismo que MIGRATE_MAP en wapps-store.js)
  const LEGACY_MAP = {
    'despensa.items':    'despensa_v1',
    'compra.data':       'compra_v1',
    'finanzas.data':     'finanzas_v1',
    'suministros.data':  'suministros_v1',
    'gastos.data':       'gastos_v1',
    'semana.data':       'semana_v2',
    'deseados.data':     'deseados_v1',
    'obra.data':         'miobra_v2',
    'instrumentos.data': 'instrumentos_v2',
    'setlist.data':      'setlist_v1',
    'coches.data':       'coches_v1',
    'ninos.data':        'ninos_v1',
  };

  // Lee un dato intentando primero la clave wapps.* y luego la clave legacy
  function _readLocal(key) {
    const newRaw = localStorage.getItem('wapps.' + key);
    if (newRaw) return JSON.parse(newRaw);
    const legacyKey = LEGACY_MAP[key];
    if (legacyKey) {
      const oldRaw = localStorage.getItem(legacyKey);
      if (oldRaw) {
        const data = JSON.parse(oldRaw);
        // Migrar al vuelo: copiar a clave nueva para que futuras lecturas sean directas
        localStorage.setItem('wapps.' + key, JSON.stringify(data));
        console.info(`[WSync] migración al vuelo: ${legacyKey} → wapps.${key}`);
        return data;
      }
    }
    return null;
  }

  // ── pushAll: fuerza subida de TODAS las claves, sin importar pendientes ──
  // Lee claves wapps.* con fallback a claves legacy — sube todo lo que haya en local.
  async function pushAll(uid, filterKey) {
    if (!uid || !WFirebase.isOnline()) return { pushed: 0, failed: 0 };
    const keys = filterKey ? [filterKey] : WSTORE_KEYS;

    window.dispatchEvent(new CustomEvent('wapps:sync-start', { detail: { total: keys.length } }));

    let pushed = 0, failed = 0, skipped = 0;
    for (const key of keys) {
      try {
        const data = _readLocal(key);
        if (!data) { skipped++; continue; }
        const fsKey = key.replace('.', '_');
        const ok = await WFirebase.pushToFirestore(uid, fsKey, data);
        if (ok) { pushed++; clearPending(key); }
        else    { failed++; }
      } catch(e) {
        console.error(`[WSync] pushAll error ${key}:`, e);
        failed++;
      }
    }

    console.info(`[WSync] pushAll: ${pushed} subidas, ${failed} fallidas, ${skipped} sin datos`);
    window.dispatchEvent(new CustomEvent('wapps:sync-done', { detail: { pushed, failed } }));
    return { pushed, failed };
  }

  // ── _mergeArraysForKey: helper público para wapps-store.syncOnLoad ──
  function _mergeArraysForKey(fsKey, local, remote) {
    const fieldDefs = MERGE_MAP[fsKey];
    if (!fieldDefs) return { ...remote };

    const merged = { ...local };
    let didMerge = false;
    for (const { field, id } of fieldDefs) {
      const localArr  = local[field];
      const remoteArr = remote[field];
      if (Array.isArray(localArr) && Array.isArray(remoteArr)) {
        merged[field] = _mergeArrays(localArr, remoteArr, id);
        didMerge = true;
      }
    }
    if (!didMerge) return { ...remote };
    if (local.nextId || remote.nextId) {
      merged.nextId = Math.max(local.nextId || 0, remote.nextId || 0);
    }
    return merged;
  }

  return { markPending, clearPending, clearAllPending, getPending, syncAll, pullAll, pushAll, _mergeArraysForKey, WSTORE_KEYS };

})();
