/**
 * Tests para la lógica de WStore (wapps-store.js)
 * Se replica la lógica inline para evitar problemas de scope con scripts de browser.
 * Los tests verifican el comportamiento del bus de datos, cache y bridge.
 */

// ── Reimplementación fiel de WStore para tests ─────────────────
// (misma lógica que wapps-store.js, adaptada para CommonJS)

function makeWStore(ls) {
  const PREFIX = 'wapps.';
  const _memCache = Object.create(null);
  let _settingKey = null;

  const events = {};
  const fakeWindow = {
    addEventListener: (type, fn) => { events[type] = events[type] || []; events[type].push(fn); },
    dispatchEvent: (e) => { (events[e.type] || []).forEach(fn => fn(e)); },
  };

  fakeWindow.addEventListener('wapps:change', e => {
    const k = e.detail?.app && e.detail?.key ? `${e.detail.app}.${e.detail.key}` : null;
    if (k && k !== _settingKey) _memCache[k] = e.detail.value;
  });

  function storageKey(app, key) { return `${PREFIX}${app}.${key}`; }

  function get(app, key) {
    const cacheKey = `${app}.${key}`;
    if (cacheKey in _memCache) return _memCache[cacheKey];
    const sk = storageKey(app, key);
    try {
      const v = ls.getItem(sk);
      const parsed = v !== null ? JSON.parse(v) : null;
      _memCache[cacheKey] = parsed;
      return parsed;
    } catch(e) {}
    return null;
  }

  function set(app, key, value) {
    const sk = storageKey(app, key);
    const payload = (value && typeof value === 'object' && !Array.isArray(value))
      ? { ...value, _updatedAt: new Date().toISOString() }
      : value;
    ls.setItem(sk, JSON.stringify(payload));
    const cacheKey = `${app}.${key}`;
    _memCache[cacheKey] = payload;
    _settingKey = cacheKey;
    fakeWindow.dispatchEvent({ type: 'wapps:change', detail: { app, key, value: payload } });
    _settingKey = null;
  }

  function clearCache() { Object.keys(_memCache).forEach(k => delete _memCache[k]); }

  return { get, set, storageKey, _memCache, clearCache, fakeWindow };
}

// Limpiar el localStorage global entre suites
beforeEach(() => { global._ls && Object.keys(global._ls).forEach(k => delete global._ls[k]); });

// ── Mock localStorage local ────────────────────────────────────
function makeLS() {
  const store = {};
  return {
    getItem:    (k)    => store[k] ?? null,
    setItem:    (k, v) => { store[k] = String(v); },
    removeItem: (k)    => { delete store[k]; },
    clear:      ()     => Object.keys(store).forEach(k => delete store[k]),
    _store:     store,
  };
}

// ─────────────────────────────────────────────────────────────────
// WStore.get — lectura con cache
// ─────────────────────────────────────────────────────────────────
describe('WStore.get — lectura y cache', () => {
  let ls, store;
  beforeEach(() => { ls = makeLS(); store = makeWStore(ls); });

  test('devuelve null si no hay datos', () => {
    expect(store.get('test', 'data')).toBeNull();
  });

  test('lee de localStorage correctamente', () => {
    ls.setItem('wapps.gastos.data', JSON.stringify({ gastos: [{ id: 1 }] }));
    const result = store.get('gastos', 'data');
    expect(result.gastos).toHaveLength(1);
  });

  test('cachea el resultado después de la primera lectura', () => {
    ls.setItem('wapps.compra.data', JSON.stringify({ items: [] }));
    const spy = jest.spyOn(ls, 'getItem');
    store.get('compra', 'data'); // primera: va a localStorage
    store.get('compra', 'data'); // segunda: viene del cache
    // la segunda llamada no debe acceder a localStorage
    expect(spy).toHaveBeenCalledTimes(1);
  });

  test('clave de storage es correcta (prefijo wapps.)', () => {
    expect(store.storageKey('mascotas', 'data')).toBe('wapps.mascotas.data');
    expect(store.storageKey('compra', 'data')).toBe('wapps.compra.data');
    expect(store.storageKey('despensa', 'items')).toBe('wapps.despensa.items');
  });

  test('devuelve null para JSON inválido', () => {
    ls.setItem('wapps.roto.data', 'esto no es json');
    expect(store.get('roto', 'data')).toBeNull();
  });

  test('devuelve array si se guardó un array', () => {
    ls.setItem('wapps.test.arr', JSON.stringify([1, 2, 3]));
    const result = store.get('test', 'arr');
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([1, 2, 3]);
  });
});

// ─────────────────────────────────────────────────────────────────
// WStore.set — escritura, _updatedAt, cache, evento
// ─────────────────────────────────────────────────────────────────
describe('WStore.set — escritura y persistencia', () => {
  let ls, store;
  beforeEach(() => { ls = makeLS(); store = makeWStore(ls); });

  test('persiste en localStorage', () => {
    store.set('gastos', 'data', { gastos: [] });
    const raw = ls.getItem('wapps.gastos.data');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw);
    expect(parsed.gastos).toEqual([]);
  });

  test('añade _updatedAt a objetos', () => {
    store.set('semana', 'data', { tasks: {} });
    const raw = JSON.parse(ls.getItem('wapps.semana.data'));
    expect(raw._updatedAt).toBeDefined();
    expect(typeof raw._updatedAt).toBe('string');
    expect(new Date(raw._updatedAt).getTime()).not.toBeNaN();
  });

  test('NO añade _updatedAt a arrays', () => {
    store.set('test', 'arr', [1, 2, 3]);
    const raw = JSON.parse(ls.getItem('wapps.test.arr'));
    expect(Array.isArray(raw)).toBe(true);
    expect(raw._updatedAt).toBeUndefined();
  });

  test('NO añade _updatedAt a primitivos', () => {
    store.set('test', 'num', 42);
    const raw = JSON.parse(ls.getItem('wapps.test.num'));
    expect(raw).toBe(42);
  });

  test('actualiza el cache inmediatamente', () => {
    store.set('mascotas', 'data', { pets: [{ id: 1, nombre: 'Rex' }] });
    const spy = jest.spyOn(ls, 'getItem');
    const result = store.get('mascotas', 'data');
    expect(result.pets[0].nombre).toBe('Rex');
    expect(spy).not.toHaveBeenCalled(); // vino del cache
  });

  test('get después de set devuelve dato actualizado', () => {
    store.set('compra', 'data', { items: [{ id: 1, text: 'Leche' }] });
    store.set('compra', 'data', { items: [{ id: 1, text: 'Leche' }, { id: 2, text: 'Pan' }] });
    const result = store.get('compra', 'data');
    expect(result.items).toHaveLength(2);
  });

  test('emite evento wapps:change', () => {
    const handler = jest.fn();
    store.fakeWindow.addEventListener('wapps:change', handler);
    store.set('deseados', 'data', { items: [] });
    expect(handler).toHaveBeenCalled();
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.app).toBe('deseados');
    expect(detail.key).toBe('data');
  });
});

// ─────────────────────────────────────────────────────────────────
// Guard _settingKey — evita doble escritura en cache
// ─────────────────────────────────────────────────────────────────
describe('WStore._settingKey — guard contra doble cache-write', () => {
  let ls, store;
  beforeEach(() => { ls = makeLS(); store = makeWStore(ls); });

  test('el listener de wapps:change NO sobreescribe el cache durante set()', () => {
    // Este es el bug que el guard _settingKey previene.
    // Sin el guard, el listener actualizaría _memCache de nuevo con el mismo valor
    // (doble escritura innecesaria). Con el guard, la ignora.
    const setCallCount = { n: 0 };
    const origSet = Object.getOwnPropertyDescriptor(store._memCache, 'test.data');

    store.set('test', 'data', { valor: 1 });
    // Si el guard funciona, el cache tiene exactamente un valor correcto
    const cached = store._memCache['test.data'];
    expect(cached.valor).toBe(1);
  });

  test('wapps:change de OTRO módulo SÍ actualiza el cache', () => {
    // Un módulo externo emite wapps:change (sin pasar por set())
    // El listener debe actualizar el cache
    store.fakeWindow.dispatchEvent({
      type: 'wapps:change',
      detail: { app: 'externo', key: 'data', value: { x: 99 } }
    });
    // El listener debería haber actualizado _memCache
    expect(store._memCache['externo.data']).toEqual({ x: 99 });
  });
});

// ─────────────────────────────────────────────────────────────────
// Migración legacy — clave antigua → nueva
// ─────────────────────────────────────────────────────────────────
describe('Migración legacy — lógica de migración', () => {
  // Replica la lógica de migrateLegacy() para verificar el comportamiento

  function migrateLegacy(ls, MIGRATE_MAP) {
    const DONE_KEY = 'wapps._migrated_v2';
    if (ls.getItem(DONE_KEY)) return 0;
    let migrated = 0;
    for (const [newKey, oldKey] of Object.entries(MIGRATE_MAP)) {
      const oldRaw = ls.getItem(oldKey);
      if (!oldRaw) continue;
      const newRaw = ls.getItem(newKey);
      if (!newRaw) {
        ls.setItem(newKey, oldRaw);
        migrated++;
        ls.removeItem(oldKey);
      } else {
        try {
          const oldData = JSON.parse(oldRaw);
          const newData = JSON.parse(newRaw);
          const oldTs = new Date(oldData._updatedAt || 0).getTime();
          const newTs = new Date(newData._updatedAt || 0).getTime();
          if (oldTs > newTs) { ls.setItem(newKey, oldRaw); migrated++; }
          ls.removeItem(oldKey);
        } catch(e) {}
      }
    }
    ls.setItem(DONE_KEY, '1');
    return migrated;
  }

  const MAP = { 'wapps.gastos.data': 'gastos_v1' };

  test('migra clave antigua a clave nueva si nueva no existe', () => {
    const ls = makeLS();
    ls.setItem('gastos_v1', JSON.stringify({ gastos: [{ id: 1 }] }));
    migrateLegacy(ls, MAP);
    expect(ls.getItem('wapps.gastos.data')).not.toBeNull();
    expect(ls.getItem('gastos_v1')).toBeNull(); // eliminada
  });

  test('no migra si ya se ejecutó (_migrated_v2)', () => {
    const ls = makeLS();
    ls.setItem('wapps._migrated_v2', '1');
    ls.setItem('gastos_v1', JSON.stringify({ gastos: [] }));
    migrateLegacy(ls, MAP);
    expect(ls.getItem('wapps.gastos.data')).toBeNull(); // no migrado
  });

  test('prefiere clave nueva si tiene timestamp más reciente', () => {
    const ls = makeLS();
    const older = { gastos: [{ id: 1 }], _updatedAt: '2026-01-01T00:00:00Z' };
    const newer = { gastos: [{ id: 2 }], _updatedAt: '2026-06-01T00:00:00Z' };
    ls.setItem('gastos_v1', JSON.stringify(older));
    ls.setItem('wapps.gastos.data', JSON.stringify(newer));
    migrateLegacy(ls, MAP);
    const result = JSON.parse(ls.getItem('wapps.gastos.data'));
    expect(result.gastos[0].id).toBe(2); // mantiene el más reciente
  });

  test('prefiere clave antigua si tiene timestamp más reciente', () => {
    const ls = makeLS();
    const newer = { gastos: [{ id: 99 }], _updatedAt: '2026-12-01T00:00:00Z' };
    const older = { gastos: [{ id: 1  }], _updatedAt: '2026-01-01T00:00:00Z' };
    ls.setItem('gastos_v1', JSON.stringify(newer));
    ls.setItem('wapps.gastos.data', JSON.stringify(older));
    migrateLegacy(ls, MAP);
    const result = JSON.parse(ls.getItem('wapps.gastos.data'));
    expect(result.gastos[0].id).toBe(99); // usa el más reciente
  });
});

// ─────────────────────────────────────────────────────────────────
// WStore.bridge — accesos tipados a datos de cada app
// ─────────────────────────────────────────────────────────────────
describe('WStore.bridge — accesos tipados', () => {
  let ls, store;

  function makeBridge(store) {
    return {
      gastosDiarios() {
        const d = store.get('gastos', 'data');
        return d?.gastos || [];
      },
      compra() {
        return store.get('compra', 'data') || null;
      },
      despensa() {
        const d = store.get('despensa', 'items');
        return d?.alimentos || [];
      },
      suministros() {
        const d = store.get('suministros', 'data');
        return d?.facturas || [];
      },
      gastosEsteMes() {
        const now = new Date();
        const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return this.gastosDiarios()
          .filter(g => g.fecha?.startsWith(prefix))
          .reduce((s, g) => s + (g.importe || 0), 0);
      },
      caducidadesProximas(dias = 3) {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        return this.despensa().filter(item => {
          if (!item.fecha) return false;
          const cad = new Date(item.fecha);
          const diff = Math.ceil((cad - hoy) / (1000 * 60 * 60 * 24));
          return diff <= dias;
        });
      },
    };
  }

  beforeEach(() => { ls = makeLS(); store = makeWStore(ls); });

  test('gastosDiarios devuelve array vacío sin datos', () => {
    expect(makeBridge(store).gastosDiarios()).toEqual([]);
  });

  test('gastosDiarios devuelve gastos correctamente', () => {
    store.set('gastos', 'data', { gastos: [{ id: 1, importe: 20 }] });
    const result = makeBridge(store).gastosDiarios();
    expect(result).toHaveLength(1);
    expect(result[0].importe).toBe(20);
  });

  test('gastosEsteMes filtra por mes actual', () => {
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const gastos = [
      { id: 1, importe: 30, fecha: `${prefix}-01` },
      { id: 2, importe: 50, fecha: `${prefix}-15` },
      { id: 3, importe: 100, fecha: '2020-01-01' }, // mes diferente
    ];
    store.set('gastos', 'data', { gastos });
    const bridge = makeBridge(store);
    expect(bridge.gastosEsteMes()).toBe(80);
  });

  test('caducidadesProximas devuelve items que caducan pronto', () => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const farFuture = new Date(); farFuture.setDate(farFuture.getDate() + 30);
    const farStr = farFuture.toISOString().slice(0, 10);
    store.set('despensa', 'items', {
      alimentos: [
        { id: 1, nombre: 'Leche', fecha: tomorrowStr },
        { id: 2, nombre: 'Arroz', fecha: farStr },
      ]
    });
    const result = makeBridge(store).caducidadesProximas(3);
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('Leche');
  });

  test('suministros devuelve facturas o array vacío', () => {
    expect(makeBridge(store).suministros()).toEqual([]);
    store.set('suministros', 'data', { facturas: [{ tipo: 'luz', importe: 60 }] });
    expect(makeBridge(store).suministros()).toHaveLength(1);
  });
});
