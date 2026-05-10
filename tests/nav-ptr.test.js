/**
 * Tests para wapps-nav.js — pull-to-refresh y navegación.
 * Verifica que PTR solo se activa en las condiciones correctas.
 */

const fs   = require('fs');
const path = require('path');

const navCode = fs.readFileSync(path.join(__dirname, '..', 'wapps-nav.js'), 'utf-8');

// ── Helpers para simular el entorno del navegador ───────────────

function makeEnv(opts = {}) {
  const {
    scrollY     = 0,
    contentScrollTop = 0,
    touchStartY = 50,
  } = opts;

  const handlers = {};
  const vibrateHistory = [];
  const navigations = [];

  // Elemento .content simulado
  const contentEl = { scrollTop: contentScrollTop };

  const win = {
    scrollY,
    addEventListener: (type, fn, opts) => {
      handlers[type] = handlers[type] || [];
      handlers[type].push(fn);
    },
    dispatchEvent: () => {},
  };

  const doc = {
    addEventListener: (type, fn, opts) => {
      handlers[type] = handlers[type] || [];
      handlers[type].push(fn);
    },
    querySelector: (sel) => {
      if (sel.includes('content')) return contentEl;
      return null;
    },
    createElement: (tag) => ({
      style: { cssText: '', opacity: '0' },
      textContent: '',
      remove: () => {},
    }),
    body: { appendChild: () => {} },
    startViewTransition: null,
    activeElement: { tagName: 'DIV' },
  };

  const nav = {
    vibrate: (pat) => { vibrateHistory.push(pat); },
  };

  const location = {
    pathname: '/test/despensa.html',
    href: '',
    set href(v) { navigations.push(v); },
  };

  // Ejecutar el código de wapps-nav en el contexto simulado
  const fn = new Function(
    'window', 'document', 'navigator', 'location',
    `(function(){ ${navCode} })()`
  );
  fn(win, doc, nav, location);

  // Helpers para disparar eventos
  function fire(type, data) {
    (handlers[type] || []).forEach(h => h(data));
  }

  function touch(startY, endY, startX = 50) {
    fire('touchstart', { touches: [{ clientX: startX, clientY: startY }] });
    fire('touchmove',  { touches: [{ clientX: startX, clientY: endY }] });
    fire('touchend',   { changedTouches: [{ clientX: startX, clientY: endY }] });
  }

  return { fire, touch, vibrateHistory, navigations, handlers };
}

// ─────────────────────────────────────────────────────────────────
// PTR — condiciones de activación
// ─────────────────────────────────────────────────────────────────
describe('Pull-to-refresh — condiciones de activación', () => {

  test('PTR NO se activa si window.scrollY > 0', () => {
    const env = makeEnv({ scrollY: 100, contentScrollTop: 0, touchStartY: 50 });
    env.touch(50, 200); // swipe hacia abajo de 150px
    expect(env.vibrateHistory).toHaveLength(0);
  });

  test('PTR NO se activa si .content está scrollado (scrollTop > 5)', () => {
    const env = makeEnv({ scrollY: 0, contentScrollTop: 50, touchStartY: 50 });
    env.touch(50, 200);
    expect(env.vibrateHistory).toHaveLength(0);
  });

  test('PTR NO se activa si el toque empieza fuera de la zona superior (>120px)', () => {
    const env = makeEnv({ scrollY: 0, contentScrollTop: 0, touchStartY: 150 });
    env.touch(150, 300); // empieza en y=150, swipe grande
    expect(env.vibrateHistory).toHaveLength(0);
  });

  test('PTR SÍ se activa cuando todo está al top y toque cerca del top', () => {
    const mockManualPull = jest.fn();
    global.manualPull = mockManualPull;
    const env = makeEnv({ scrollY: 0, contentScrollTop: 0, touchStartY: 50 });
    env.touch(50, 160); // swipe de 110px (> 80px threshold)
    expect(env.vibrateHistory.length).toBeGreaterThanOrEqual(1);
    global.manualPull = undefined;
  });

  test('PTR NO vibra con swipe insuficiente (<80px)', () => {
    const env = makeEnv({ scrollY: 0, contentScrollTop: 0, touchStartY: 50 });
    env.touch(50, 110); // solo 60px de swipe
    expect(env.vibrateHistory).toHaveLength(0);
  });

  test('PTR NO se activa en simple tap (dy ≈ 0)', () => {
    const env = makeEnv({ scrollY: 0, contentScrollTop: 0, touchStartY: 50 });
    env.touch(50, 52); // apenas 2px de movimiento
    expect(env.vibrateHistory).toHaveLength(0);
  });

  test('PTR usa vibrate([8,40,8]) cuando se activa', () => {
    const mockManualPull = jest.fn();
    global.manualPull = mockManualPull;
    const env = makeEnv({ scrollY: 0, contentScrollTop: 0, touchStartY: 50 });
    env.touch(50, 160);
    const ptrVibrate = env.vibrateHistory.find(v => Array.isArray(v));
    expect(ptrVibrate).toEqual([8, 40, 8]);
    global.manualPull = undefined;
  });

  test('PTR con .content scrollado a 3px (dentro de tolerancia) SÍ activa', () => {
    const mockManualPull = jest.fn();
    global.manualPull = mockManualPull;
    const env = makeEnv({ scrollY: 0, contentScrollTop: 3, touchStartY: 50 });
    env.touch(50, 160);
    // scrollTop <= 5 → PTR se activa
    expect(env.vibrateHistory.length).toBeGreaterThanOrEqual(1);
    global.manualPull = undefined;
  });

  test('El código tiene la función _contentAtTop que verifica scrollTop', () => {
    expect(navCode).toContain('_contentAtTop');
    expect(navCode).toContain('scrollTop');
  });

  test('PTR solo se activa con toque en zona superior (< 120px)', () => {
    expect(navCode).toContain('clientY > 120');
  });
});

// ─────────────────────────────────────────────────────────────────
// Swipe lateral — volver al home
// ─────────────────────────────────────────────────────────────────
describe('Swipe lateral — volver a index', () => {

  test('Swipe desde borde izquierdo (clientX < 30) registra sx', () => {
    const env = makeEnv({ touchStartY: 200 });
    // Swipe desde clientX=10 (borde izquierdo) con recorrido > 80px
    env.fire('touchstart', { touches: [{ clientX: 10, clientY: 200 }] });
    env.fire('touchend',   { changedTouches: [{ clientX: 100, clientY: 205 }] });
    // Debería navegar a index.html (dx=90 > 80, dy=5 < 60)
    expect(env.navigations).toContain('index.html');
  });

  test('Swipe desde borde NO izquierdo (clientX > 30) NO vuelve', () => {
    const env = makeEnv({ touchStartY: 200 });
    env.fire('touchstart', { touches: [{ clientX: 50, clientY: 200 }] });
    env.fire('touchend',   { changedTouches: [{ clientX: 200, clientY: 205 }] });
    expect(env.navigations).toHaveLength(0);
  });

  test('Swipe lateral vibra al volver', () => {
    const env = makeEnv({ touchStartY: 200 });
    env.fire('touchstart', { touches: [{ clientX: 10, clientY: 200 }] });
    env.fire('touchend',   { changedTouches: [{ clientX: 100, clientY: 205 }] });
    expect(env.vibrateHistory).toContain(8);
  });
});

// ─────────────────────────────────────────────────────────────────
// Análisis estático del código de wapps-nav.js
// ─────────────────────────────────────────────────────────────────
describe('wapps-nav.js — código correcto', () => {

  test('Verifica scrollTop de .content antes de activar PTR', () => {
    expect(navCode).toContain('scrollTop');
    expect(navCode).toContain('.content');
  });

  test('Threshold de PTR es 80px', () => {
    expect(navCode).toContain('_PTR_THRESHOLD = 80');
  });

  test('PTR prefiere manualPull() antes que location.reload()', () => {
    const pullIdx   = navCode.indexOf('manualPull');
    const reloadIdx = navCode.indexOf('location.reload');
    expect(pullIdx).toBeLessThan(reloadIdx);
  });

  test('El swipe lateral comprueba pathname antes de navegar', () => {
    expect(navCode).toContain('index.html');
    expect(navCode).toContain('pathname');
  });
});
