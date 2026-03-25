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
    if (!window.WAPPS_CONFIG) {
      console.error(
        '[WFirebase] No se encontró wapps-config.js.\n' +
        'Copia wapps-config.example.js → wapps-config.js y añade tus credenciales Firebase.'
      );
      return null;
    }
    // Detectar credenciales de ejemplo sin rellenar — evita inicializar Firebase con placeholders
    const cfg = window.WAPPS_CONFIG;
    const placeholders = ['TU_API_KEY', 'TU_PROYECTO', 'TU_SENDER_ID', 'TU_APP_ID'];
    const hasPlaceholder = Object.values(cfg).some(v =>
      placeholders.some(p => String(v).includes(p))
    );
    if (hasPlaceholder) {
      console.warn(
        '[WFirebase] wapps-config.js contiene valores de ejemplo sin rellenar.\n' +
        'Edita wapps-config.js con tus credenciales reales de Firebase.\n' +
        'La app funcionará en modo local (sin sync).'
      );
      return null;
    }
    return cfg;
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
        if (user) {
          _resetInactivityTimer();
        } else {
          _clearInactivityTimer();
        }
        window.dispatchEvent(new CustomEvent('wapps:auth-change', { detail: { user } }));
      });
    } catch(e) {
      console.error('[WFirebase] Error init:', e);
    }
  }

  // ── Expiración de sesión por inactividad ────────────────────────
  // Cierra sesión automáticamente si el usuario no interactúa durante
  // SESSION_TIMEOUT_MS. El timer se reinicia con cualquier interacción.
  // Por defecto: 8 horas. Configurable via window.WAPPS_CONFIG.sessionTimeoutHours.
  const SESSION_TIMEOUT_MS = (() => {
    const h = window.WAPPS_CONFIG?.sessionTimeoutHours;
    return (typeof h === 'number' && h > 0) ? h * 3600000 : 8 * 3600000;
  })();

  let _inactivityTimer = null;

  function _resetInactivityTimer() {
    _clearInactivityTimer();
    _inactivityTimer = setTimeout(async () => {
      if (_user) {
        console.info('[WFirebase] Sesión expirada por inactividad — cerrando sesión.');
        window.dispatchEvent(new CustomEvent('wapps:session-expired'));
        await logout();
      }
    }, SESSION_TIMEOUT_MS);
  }

  function _clearInactivityTimer() {
    if (_inactivityTimer) { clearTimeout(_inactivityTimer); _inactivityTimer = null; }
  }

  // Reiniciar el timer ante cualquier interacción del usuario
  ['click', 'keydown', 'touchstart', 'scroll', 'mousemove'].forEach(evt => {
    window.addEventListener(evt, () => { if (_user) _resetInactivityTimer(); }, { passive: true });
  });

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

  // ── watchDocument — listener en tiempo real de un documento Firestore ──
  // Devuelve una función unsubscribe. Llama a callback(data) cada vez que
  // el documento cambia en Firestore (desde cualquier dispositivo).
  //
  // Uso: const unsub = WFirebase.watchDocument(uid, 'despensa_items', data => render(data));
  //
  function watchDocument(uid, key, callback) {
    if (!_ready || !uid || !_db) return () => {};
    try {
      const ref = _db.collection('users').doc(uid).collection('data').doc(key);
      const unsub = ref.onSnapshot(snap => {
        if (!snap.exists) return;
        const data = snap.data();
        if (typeof callback === 'function') callback(data);
      }, err => {
        console.warn(`[WFirebase.watchDocument] ${key}:`, err.message);
      });
      return unsub;
    } catch(e) {
      console.warn('[WFirebase.watchDocument] error:', e);
      return () => {};
    }
  }

  return { login, logout, onAuthChange, getUser, isOnline, isReady, pushToFirestore, pullFromFirestore, pullAll, watchDocument };

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
  async function syncAll(uid) {
    if (!uid || !WFirebase.isOnline()) return { pushed: 0, failed: 0 };
    const pending = getPending();
    if (!pending.length) return { pushed: 0, failed: 0 };

    window.dispatchEvent(new CustomEvent('wapps:sync-start', { detail: { total: pending.length } }));

    let pushed = 0, failed = 0;

    for (const key of [...pending]) {
      try {
        const raw = localStorage.getItem('wapps.' + key);
        if (!raw) { clearPending(key); continue; }
        const data = JSON.parse(raw);
        // key para Firestore: reemplaza . por _ (Firestore no permite . en doc IDs)
        const fsKey = key.replace('.', '_');
        const ok = await WFirebase.pushToFirestore(uid, fsKey, data);
        if (ok) { pushed++; clearPending(key); }
        else    { failed++; }
      } catch(e) {
        console.error(`[WSync] error ${key}:`, e);
        failed++;
      }
    }

    window.dispatchEvent(new CustomEvent('wapps:sync-done', { detail: { pushed, failed } }));
    return { pushed, failed };
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

        // Gana el más reciente. En empate gana el local (evita machacar un restore reciente).
        const remoteTs = new Date(data._updatedAt || 0).getTime();
        const localTs  = new Date(local?._updatedAt || 0).getTime();

        if (!local || remoteTs > localTs) {
          const clean = { ...data };
          delete clean._updatedAt;
          localStorage.setItem(localKey, JSON.stringify(clean));
          const [app, key] = storeKey.split('.');
          if (app && key) {
            window.dispatchEvent(new CustomEvent('wapps:change', { detail: { app, key, value: clean } }));
          }
        }
      }
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

  // ── Auto-sync al autenticar (por si había pendientes antes del login) ──
  window.addEventListener('wapps:auth-change', async e => {
    const user = e.detail?.user;
    if (user && WFirebase.isOnline() && getPending().length > 0) {
      await syncAll(user.uid);
    }
  });

  // ── Flush de pendientes al abandonar la página (best-effort) ─────
  // visibilitychange + pagehide dan una última oportunidad de subir
  // cambios antes de que el navegador cierre la pestaña.
  // Se usa sendBeacon si está disponible para no bloquear el cierre.
  async function _flushOnExit() {
    const user = WFirebase.getUser();
    if (!user || !WFirebase.isOnline()) return;
    const pending = getPending();
    if (!pending.length) return;
    // Intento best-effort — no bloqueamos con await en pagehide
    syncAll(user.uid).catch(() => {});
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') _flushOnExit();
  });
  window.addEventListener('pagehide', _flushOnExit);

  return { markPending, clearPending, clearAllPending, getPending, syncAll, pullAll, WSTORE_KEYS };

})();
