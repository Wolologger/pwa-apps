// setupFiles — se ejecuta ANTES del framework de tests.
// Solo puede usar APIs de Node.js y jsdom, no globales de Jest.

// ── localStorage mock ──────────────────────────────────────────
const _ls = {};
global._ls = _ls;
global.localStorage = {
  getItem:    (k)    => _ls[k] ?? null,
  setItem:    (k, v) => { _ls[k] = String(v); },
  removeItem: (k)    => { delete _ls[k]; },
  clear:      ()     => { Object.keys(_ls).forEach(k => delete _ls[k]); },
  get length()       { return Object.keys(_ls).length; },
  key:        (i)    => Object.keys(_ls)[i] ?? null,
};

// ── navigator.vibrate mock (función stub simple) ───────────────
const _vibrateCalls = [];
global._vibrateCalls = _vibrateCalls;
Object.defineProperty(global.navigator, 'vibrate', {
  value: (pattern) => { _vibrateCalls.push(pattern); return true; },
  writable: true,
  configurable: true,
});

// ── Notification API mock ─────────────────────────────────────
global.Notification = {
  permission: 'default',
  requestPermission: async () => 'granted',
};

// ── Silenciar console.warn (WStore los emite en condiciones normales) ──
global.console.warn = () => {};
