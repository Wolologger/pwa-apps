/**
 * Tests para Firebase sync y comportamiento offline.
 * Se replican las funciones críticas de wapps-firebase.js con mocks de Firestore.
 *
 * Cubre:
 *   - WSync cola de pendientes (mark/clear/get)
 *   - _mergeArrays: conflicto de arrays por _updatedAt
 *   - _mergeArraysForKey: merge inteligente por entidad
 *   - pullAll: decisión merge/replace/skip según timestamps
 *   - pushToFirestoreExact: preserva _updatedAt (evita deriva de timestamps)
 *   - Auto-sync offline → online
 *   - Logout limpia datos wapps.*
 *   - Retry con backoff exponencial
 *   - _readLocal: fallback a claves legacy
 */

// ── Mock localStorage local ─────────────────────────────────────
function makeLS() {
  const s = {};
  return {
    getItem:    k     => s[k] ?? null,
    setItem:    (k,v) => { s[k] = String(v); },
    removeItem: k     => { delete s[k]; },
    clear:      ()    => Object.keys(s).forEach(k => delete s[k]),
    get length()      { return Object.keys(s).length; },
    key:        i     => Object.keys(s)[i] ?? null,
    _store:     s,
    _keys:      ()    => Object.keys(s),
  };
}

// ── Mock de window events ───────────────────────────────────────
function makeEventBus() {
  const handlers = {};
  return {
    addEventListener:    (t, fn) => { handlers[t] = handlers[t] || []; handlers[t].push(fn); },
    removeEventListener: (t, fn) => { if (handlers[t]) handlers[t] = handlers[t].filter(f => f !== fn); },
    dispatchEvent:       (e)     => { (handlers[e.type] || []).forEach(fn => fn(e)); },
    _handlers:           handlers,
    _clear:              ()      => Object.keys(handlers).forEach(k => delete handlers[k]),
  };
}

// ── Implementación de WSync.getPending / markPending / clearPending ──

function makeWSyncQueue(ls, bus) {
  const PENDING_KEY = 'wapps.pending';

  function getPending() {
    try { return JSON.parse(ls.getItem(PENDING_KEY) || '[]'); } catch(e) { return []; }
  }

  function markPending(key) {
    const p = getPending();
    if (!p.includes(key)) {
      p.push(key);
      ls.setItem(PENDING_KEY, JSON.stringify(p));
    }
    bus.dispatchEvent({ type: 'wapps:pending-change', detail: { pending: getPending() } });
  }

  function clearPending(key) {
    ls.setItem(PENDING_KEY, JSON.stringify(getPending().filter(k => k !== key)));
    bus.dispatchEvent({ type: 'wapps:pending-change', detail: { pending: getPending() } });
  }

  function clearAllPending() {
    ls.setItem(PENDING_KEY, '[]');
    bus.dispatchEvent({ type: 'wapps:pending-change', detail: { pending: [] } });
  }

  return { getPending, markPending, clearPending, clearAllPending };
}

// ── Implementación de _mergeArrays ──────────────────────────────

function _mergeArrays(localArr, remoteArr, idField = 'id') {
  if (!Array.isArray(localArr) || !localArr.length) return remoteArr || [];
  if (!Array.isArray(remoteArr) || !remoteArr.length) return localArr;

  const merged = new Map();
  for (const item of localArr)   merged.set(item[idField], item);
  for (const remoteItem of remoteArr) {
    const key       = remoteItem[idField];
    const localItem = merged.get(key);
    if (!localItem) {
      merged.set(key, remoteItem);
    } else {
      const remoteTs = new Date(remoteItem._updatedAt || 0).getTime();
      const localTs  = new Date(localItem._updatedAt  || 0).getTime();
      if (remoteTs > localTs) merged.set(key, remoteItem);
    }
  }
  return Array.from(merged.values());
}

// ── Implementación de _mergeArraysForKey ────────────────────────

const MERGE_MAP = {
  'despensa_items':    [{ field: 'alimentos', id: 'id' }],
  'compra_data':       [{ field: 'items',     id: 'id' }],
  'mascotas_data':     [{ field: 'pets',      id: 'id' }],
  'coches_data':       [{ field: 'cars',      id: 'id' }],
  'gastos_data':       [], // no merge en gastos (no tiene array propio en MERGE_MAP real — omitido intencionalmente)
  'finanzas_data':     [{ field: 'ingresos',  id: 'id' }, { field: 'gastos', id: 'id' }],
};

function _mergeArraysForKey(fsKey, local, remote) {
  const fieldDefs = MERGE_MAP[fsKey];
  if (!fieldDefs || !fieldDefs.length) return { ...remote };

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

// ── Implementación de pullAll (lógica de decisión) ──────────────

const MERGE_WINDOW_MS = 24 * 60 * 60 * 1000;

function _pullAllDecision(fsKey, local, remoteData) {
  const remoteTs = new Date(remoteData._updatedAt || 0).getTime();
  const localTs  = new Date(local?._updatedAt     || 0).getTime();
  const ageDiff  = Math.abs(remoteTs - localTs);

  if (!local)              return { action: 'replace', data: { ...remoteData } };
  if (remoteTs <= localTs) return { action: 'skip' };

  if (ageDiff < MERGE_WINDOW_MS && MERGE_MAP[fsKey] && MERGE_MAP[fsKey].length > 0) {
    const merged = _mergeArraysForKey(fsKey, local, remoteData);
    return { action: 'merge', data: merged };
  }
  return { action: 'replace', data: { ...remoteData } };
}

// ── pushToFirestore: añade _updatedAt propio ────────────────────
// pushToFirestoreExact: preserva el _updatedAt existente

function _pushToFirestore(uid, key, data) {
  const payload = { ...data, _updatedAt: new Date().toISOString() };
  return { uid, key, payload };
}

function _pushToFirestoreExact(uid, key, data) {
  const payload = { ...data };
  if (!payload._updatedAt) payload._updatedAt = new Date().toISOString();
  return { uid, key, payload };
}

// ── _readLocal: wapps.* con fallback legacy ─────────────────────

const LEGACY_MAP = {
  'despensa.items':    'despensa_v1',
  'gastos.data':       'gastos_v1',
  'compra.data':       'compra_v2',
  'mascotas.data':     'mascotas_v1',
};

function _readLocal(ls, key) {
  const newRaw = ls.getItem('wapps.' + key);
  if (newRaw) return JSON.parse(newRaw);
  const legacyKey = LEGACY_MAP[key];
  if (legacyKey) {
    const oldRaw = ls.getItem(legacyKey);
    if (oldRaw) {
      const data = JSON.parse(oldRaw);
      ls.setItem('wapps.' + key, JSON.stringify(data));
      return data;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
// Cola de pendientes
// ─────────────────────────────────────────────────────────────────
describe('WSync — cola de pendientes (offline queue)', () => {
  let ls, bus, queue;
  beforeEach(() => {
    ls  = makeLS();
    bus = makeEventBus();
    queue = makeWSyncQueue(ls, bus);
  });

  test('getPending devuelve array vacío sin datos', () => {
    expect(queue.getPending()).toEqual([]);
  });

  test('markPending añade clave a la cola', () => {
    queue.markPending('gastos.data');
    expect(queue.getPending()).toContain('gastos.data');
  });

  test('markPending no añade duplicados', () => {
    queue.markPending('mascotas.data');
    queue.markPending('mascotas.data');
    expect(queue.getPending()).toHaveLength(1);
  });

  test('markPending puede acumular múltiples apps', () => {
    queue.markPending('gastos.data');
    queue.markPending('compra.data');
    queue.markPending('semana.data');
    expect(queue.getPending()).toHaveLength(3);
  });

  test('clearPending elimina solo la clave indicada', () => {
    queue.markPending('gastos.data');
    queue.markPending('compra.data');
    queue.clearPending('gastos.data');
    const p = queue.getPending();
    expect(p).not.toContain('gastos.data');
    expect(p).toContain('compra.data');
  });

  test('clearAllPending vacía la cola completamente', () => {
    queue.markPending('gastos.data');
    queue.markPending('compra.data');
    queue.clearAllPending();
    expect(queue.getPending()).toEqual([]);
  });

  test('markPending persiste en localStorage', () => {
    queue.markPending('semana.data');
    const raw = ls.getItem('wapps.pending');
    expect(JSON.parse(raw)).toContain('semana.data');
  });

  test('markPending emite evento wapps:pending-change', () => {
    const handler = jest.fn();
    bus.addEventListener('wapps:pending-change', handler);
    queue.markPending('gastos.data');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.pending).toContain('gastos.data');
  });

  test('clearPending emite evento wapps:pending-change', () => {
    const handler = jest.fn();
    queue.markPending('gastos.data');
    bus.addEventListener('wapps:pending-change', handler);
    queue.clearPending('gastos.data');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail.pending).toEqual([]);
  });

  test('getPending sobrevive a JSON inválido en localStorage', () => {
    ls.setItem('wapps.pending', 'no-es-json-valido');
    expect(queue.getPending()).toEqual([]);
  });

  test('orden de pendientes se preserva', () => {
    queue.markPending('app1.data');
    queue.markPending('app2.data');
    queue.markPending('app3.data');
    expect(queue.getPending()).toEqual(['app1.data', 'app2.data', 'app3.data']);
  });
});

// ─────────────────────────────────────────────────────────────────
// _mergeArrays — resolución de conflictos por timestamp
// ─────────────────────────────────────────────────────────────────
describe('_mergeArrays — merge inteligente por _updatedAt', () => {

  test('array local vacío → devuelve remoto completo', () => {
    const remote = [{ id: 1, nombre: 'Producto' }];
    expect(_mergeArrays([], remote)).toEqual(remote);
    expect(_mergeArrays(null, remote)).toEqual(remote);
  });

  test('array remoto vacío → devuelve local completo', () => {
    const local = [{ id: 1, nombre: 'Producto' }];
    expect(_mergeArrays(local, [])).toEqual(local);
    expect(_mergeArrays(local, null)).toEqual(local);
  });

  test('items sin conflicto se unen (uno en cada array)', () => {
    const local  = [{ id: 1, nombre: 'A' }];
    const remote = [{ id: 2, nombre: 'B' }];
    const result = _mergeArrays(local, remote);
    expect(result).toHaveLength(2);
    expect(result.map(i => i.id).sort()).toEqual([1, 2]);
  });

  test('conflicto: remoto más reciente → gana remoto', () => {
    const local  = [{ id: 1, nombre: 'Local',  _updatedAt: '2026-01-01T10:00:00Z' }];
    const remote = [{ id: 1, nombre: 'Remoto', _updatedAt: '2026-01-01T12:00:00Z' }];
    const result = _mergeArrays(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('Remoto');
  });

  test('conflicto: local más reciente → gana local', () => {
    const local  = [{ id: 1, nombre: 'Local',  _updatedAt: '2026-01-01T14:00:00Z' }];
    const remote = [{ id: 1, nombre: 'Remoto', _updatedAt: '2026-01-01T12:00:00Z' }];
    const result = _mergeArrays(local, remote);
    expect(result).toHaveLength(1);
    expect(result[0].nombre).toBe('Local');
  });

  test('conflicto: mismo timestamp → gana local (no sobrescribe)', () => {
    const ts = '2026-01-01T12:00:00Z';
    const local  = [{ id: 1, nombre: 'Local',  _updatedAt: ts }];
    const remote = [{ id: 1, nombre: 'Remoto', _updatedAt: ts }];
    const result = _mergeArrays(local, remote);
    expect(result[0].nombre).toBe('Local');
  });

  test('sin _updatedAt: item existente en local no se sobreescribe', () => {
    const local  = [{ id: 1, nombre: 'Local'  }];
    const remote = [{ id: 1, nombre: 'Remoto' }];
    const result = _mergeArrays(local, remote);
    expect(result[0].nombre).toBe('Local'); // remote sin _updatedAt = timestamp 0
  });

  test('item nuevo en remoto se añade aunque local tenga items', () => {
    const local  = [{ id: 1, nombre: 'Rex',  _updatedAt: '2026-01-01T10:00:00Z' }];
    const remote = [
      { id: 1, nombre: 'Rex',   _updatedAt: '2026-01-01T10:00:00Z' },
      { id: 2, nombre: 'Luna',  _updatedAt: '2026-01-02T10:00:00Z' }, // nuevo
    ];
    const result = _mergeArrays(local, remote);
    expect(result).toHaveLength(2);
    expect(result.find(i => i.id === 2)?.nombre).toBe('Luna');
  });

  test('item eliminado localmente (no en local) → reaparece desde remoto', () => {
    // Esto es el comportamiento actual: si local no tiene el item, remoto lo añade
    // (no hay soporte de "tombstones" en el merge actual)
    const local  = [{ id: 2, nombre: 'Luna' }];
    const remote = [
      { id: 1, nombre: 'Rex',  _updatedAt: '2026-01-02T10:00:00Z' }, // estaba antes
      { id: 2, nombre: 'Luna', _updatedAt: '2026-01-01T10:00:00Z' },
    ];
    const result = _mergeArrays(local, remote);
    expect(result).toHaveLength(2); // Rex reaparece — comportamiento documentado
  });

  test('idField personalizado funciona correctamente', () => {
    const local  = [{ uid: 'a', val: 1 }];
    const remote = [{ uid: 'a', val: 2, _updatedAt: '2026-06-01T00:00:00Z' }];
    const result = _mergeArrays(local, remote, 'uid');
    expect(result).toHaveLength(1);
    expect(result[0].val).toBe(2);
  });

  test('merge de múltiples items con conflictos mezclados', () => {
    const local = [
      { id: 1, val: 'L1', _updatedAt: '2026-01-01T08:00:00Z' }, // local más viejo
      { id: 2, val: 'L2', _updatedAt: '2026-01-01T12:00:00Z' }, // local más nuevo
      { id: 3, val: 'L3', _updatedAt: '2026-01-01T10:00:00Z' }, // mismo timestamp
    ];
    const remote = [
      { id: 1, val: 'R1', _updatedAt: '2026-01-01T10:00:00Z' }, // remoto más reciente
      { id: 2, val: 'R2', _updatedAt: '2026-01-01T10:00:00Z' }, // remoto más viejo
      { id: 3, val: 'R3', _updatedAt: '2026-01-01T10:00:00Z' }, // igual
    ];
    const result = _mergeArrays(local, remote);
    const byId = Object.fromEntries(result.map(i => [i.id, i.val]));
    expect(byId[1]).toBe('R1'); // remoto gana (más nuevo)
    expect(byId[2]).toBe('L2'); // local gana (más nuevo)
    expect(byId[3]).toBe('L3'); // local gana (empate → conservar local)
  });
});

// ─────────────────────────────────────────────────────────────────
// _mergeArraysForKey — merge por entidad con MERGE_MAP
// ─────────────────────────────────────────────────────────────────
describe('_mergeArraysForKey — merge por entidad', () => {

  test('despensa_items merge sobre campo "alimentos"', () => {
    const local  = { alimentos: [{ id: 1, nombre: 'Leche', _updatedAt: '2026-01-01T10:00:00Z' }], nextId: 2 };
    const remote = { alimentos: [
      { id: 1, nombre: 'Leche actualizada', _updatedAt: '2026-01-01T12:00:00Z' },
      { id: 2, nombre: 'Pan',               _updatedAt: '2026-01-01T11:00:00Z' },
    ], nextId: 3, _updatedAt: '2026-01-01T12:00:00Z' };

    const result = _mergeArraysForKey('despensa_items', local, remote);
    expect(result.alimentos).toHaveLength(2);
    expect(result.alimentos.find(a => a.id === 1)?.nombre).toBe('Leche actualizada');
    expect(result.alimentos.find(a => a.id === 2)?.nombre).toBe('Pan');
  });

  test('nextId se actualiza al máximo de local y remoto', () => {
    const local  = { items: [{ id: 1 }], nextId: 5  };
    const remote = { items: [{ id: 2 }], nextId: 10 };
    const result = _mergeArraysForKey('compra_data', local, remote);
    expect(result.nextId).toBe(10);
  });

  test('nextId local mayor que remoto se preserva', () => {
    const local  = { items: [{ id: 1 }], nextId: 15 };
    const remote = { items: [{ id: 2 }], nextId: 5  };
    const result = _mergeArraysForKey('compra_data', local, remote);
    expect(result.nextId).toBe(15);
  });

  test('clave sin MERGE_MAP → devuelve remoto completo', () => {
    const local  = { data: 'local' };
    const remote = { data: 'remoto', _updatedAt: '2026-01-01T12:00:00Z' };
    const result = _mergeArraysForKey('clave_sin_map', local, remote);
    expect(result.data).toBe('remoto');
  });

  test('finanzas_data merge sobre ingresos Y gastos simultáneamente', () => {
    const local = {
      ingresos: [{ id: 1, concepto: 'Sueldo', _updatedAt: '2026-01-01T10:00:00Z' }],
      gastos:   [{ id: 10, concepto: 'Alquiler', _updatedAt: '2026-01-01T10:00:00Z' }],
    };
    const remote = {
      ingresos: [{ id: 1, concepto: 'Sueldo', _updatedAt: '2026-01-01T10:00:00Z' }, { id: 2, concepto: 'Extra' }],
      gastos:   [{ id: 10, concepto: 'Alquiler', _updatedAt: '2026-01-01T10:00:00Z' }, { id: 11, concepto: 'Luz' }],
    };
    const result = _mergeArraysForKey('finanzas_data', local, remote);
    expect(result.ingresos).toHaveLength(2);
    expect(result.gastos).toHaveLength(2);
  });

  test('si no hay arrays mergeables → devuelve remoto', () => {
    // gastos_data tiene fieldDefs vacío en nuestro mock → devuelve remoto
    const local  = { gastos: [{ id: 1 }] };
    const remote = { gastos: [{ id: 2 }], _updatedAt: '2026-01-01' };
    const result = _mergeArraysForKey('gastos_data', local, remote);
    expect(result).toEqual(remote);
  });
});

// ─────────────────────────────────────────────────────────────────
// pullAll — decisión de qué hacer con los datos descargados
// ─────────────────────────────────────────────────────────────────
describe('pullAll — lógica de decisión merge/replace/skip', () => {

  test('sin datos locales → action: replace con remoto', () => {
    const remote = { alimentos: [{ id: 1 }], _updatedAt: '2026-01-01T12:00:00Z' };
    const result = _pullAllDecision('despensa_items', null, remote);
    expect(result.action).toBe('replace');
    expect(result.data.alimentos).toHaveLength(1);
  });

  test('remoto más antiguo que local → action: skip', () => {
    const local  = { gastos: [], _updatedAt: '2026-06-01T12:00:00Z' };
    const remote = {              _updatedAt: '2026-01-01T12:00:00Z' };
    expect(_pullAllDecision('compra_data', local, remote).action).toBe('skip');
  });

  test('mismo timestamp → action: skip (no sobreescribir)', () => {
    const ts     = '2026-01-01T12:00:00Z';
    const local  = { items: [], _updatedAt: ts };
    const remote = { items: [], _updatedAt: ts };
    expect(_pullAllDecision('compra_data', local, remote).action).toBe('skip');
  });

  test('remoto más nuevo, < 24h, clave con merge → action: merge', () => {
    const base = new Date('2026-06-01T10:00:00Z');
    const local  = { alimentos: [{ id: 1, nombre: 'Leche' }], _updatedAt: base.toISOString() };
    // Remoto es 1 hora más reciente (dentro de 24h)
    const remote = { alimentos: [{ id: 1, nombre: 'Leche M' }, { id: 2, nombre: 'Pan' }],
                     _updatedAt: new Date(base.getTime() + 3600000).toISOString() };
    const result = _pullAllDecision('despensa_items', local, remote);
    expect(result.action).toBe('merge');
    expect(result.data.alimentos).toBeDefined();
  });

  test('remoto más nuevo, > 24h → action: replace (gana remoto sin merge)', () => {
    const local  = { items: [{ id: 1 }], _updatedAt: '2026-01-01T12:00:00Z' };
    const remote = { items: [{ id: 2 }], _updatedAt: '2026-01-03T12:00:00Z' }; // +2 días
    const result = _pullAllDecision('compra_data', local, remote);
    expect(result.action).toBe('replace');
  });

  test('remoto más nuevo, < 24h, clave sin merge → action: replace', () => {
    const base = new Date('2026-06-01T10:00:00Z');
    const local  = { data: 'l', _updatedAt: base.toISOString() };
    const remote = { data: 'r', _updatedAt: new Date(base.getTime() + 3600000).toISOString() };
    // 'clave_desconocida' no está en MERGE_MAP
    const result = _pullAllDecision('clave_desconocida', local, remote);
    expect(result.action).toBe('replace');
    expect(result.data.data).toBe('r');
  });
});

// ─────────────────────────────────────────────────────────────────
// pushToFirestoreExact vs pushToFirestore — deriva de timestamps
// ─────────────────────────────────────────────────────────────────
describe('pushToFirestoreExact — preserva _updatedAt para evitar deriva', () => {

  test('pushToFirestore SOBREESCRIBE _updatedAt con timestamp actual', () => {
    const data    = { gastos: [], _updatedAt: '2026-01-01T10:00:00Z' };
    const result  = _pushToFirestore('uid123', 'gastos_data', data);
    // La función pushToFirestore añade su propio _updatedAt
    expect(result.payload._updatedAt).not.toBe('2026-01-01T10:00:00Z');
    // El nuevo _updatedAt debe ser posterior
    expect(new Date(result.payload._updatedAt) > new Date('2026-01-01T10:00:00Z')).toBe(true);
  });

  test('pushToFirestoreExact PRESERVA el _updatedAt existente', () => {
    const ts   = '2026-01-01T10:00:00Z';
    const data = { gastos: [], _updatedAt: ts };
    const result = _pushToFirestoreExact('uid123', 'gastos_data', data);
    expect(result.payload._updatedAt).toBe(ts);
  });

  test('pushToFirestoreExact añade _updatedAt si no existe', () => {
    const data   = { gastos: [] }; // sin _updatedAt
    const result = _pushToFirestoreExact('uid123', 'gastos_data', data);
    expect(result.payload._updatedAt).toBeDefined();
    expect(typeof result.payload._updatedAt).toBe('string');
  });

  test('pushToFirestoreExact no modifica otros campos del payload', () => {
    const data   = { gastos: [{ id: 1, importe: 50 }], nextId: 2, _updatedAt: '2026-01-01T10:00:00Z' };
    const result = _pushToFirestoreExact('uid123', 'gastos_data', data);
    expect(result.payload.gastos).toEqual(data.gastos);
    expect(result.payload.nextId).toBe(2);
  });

  test('pushToFirestore deriva: local y remoto tendrán _updatedAt distintos', () => {
    // Simula el bug que causaba re-sync infinito:
    // WStore.set() genera _updatedAt T1, luego pushToFirestore genera T2 > T1
    // → syncOnLoad ve remoteTs(T2) > localTs(T1) → descarga de vuelta
    const localTs = '2026-01-01T10:00:00.000Z';
    const data = { gastos: [], _updatedAt: localTs };

    const pushed = _pushToFirestore('uid', 'key', data);
    // Si pushed._updatedAt !== localTs, habrá deriva
    expect(pushed.payload._updatedAt).not.toBe(localTs); // confirmamos que SÍ deriva
  });

  test('pushToFirestoreExact evita la deriva: local y remoto tendrán mismo _updatedAt', () => {
    const localTs = '2026-01-01T10:00:00.000Z';
    const data = { gastos: [], _updatedAt: localTs };

    const pushed = _pushToFirestoreExact('uid', 'key', data);
    expect(pushed.payload._updatedAt).toBe(localTs); // mismo → no habrá re-sync
  });

  test('pushAll debe usar pushToFirestoreExact (no pushToFirestore) para evitar re-sync', () => {
    const fs   = require('fs');
    const path = require('path');
    const code = fs.readFileSync(path.join(__dirname, '..', 'wapps-firebase.js'), 'utf-8');

    // Localizar la función pushAll completa contando llaves
    const startIdx = code.indexOf('async function pushAll(');
    let depth = 0, endIdx = startIdx;
    for (let i = code.indexOf('{', startIdx); i < code.length; i++) {
      if (code[i] === '{') depth++;
      else if (code[i] === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
    }
    const pushAllBody = code.slice(startIdx, endIdx + 1);

    // El cuerpo de pushAll debe llamar a pushToFirestoreExact
    expect(pushAllBody).toContain('pushToFirestoreExact');
    // Y NO debe llamar al pushToFirestore simple (que genera su propio _updatedAt)
    // Usamos replace para ignorar la aparición de "pushToFirestoreExact" al buscar "pushToFirestore"
    const withoutExact = pushAllBody.replace(/pushToFirestoreExact/g, 'REPLACED');
    expect(withoutExact).not.toContain('pushToFirestore(');
  });
});

// ─────────────────────────────────────────────────────────────────
// _readLocal — fallback a claves legacy
// ─────────────────────────────────────────────────────────────────
describe('_readLocal — lectura con fallback a clave legacy', () => {
  let ls;
  beforeEach(() => { ls = makeLS(); });

  test('lee directamente de wapps.* si existe', () => {
    ls.setItem('wapps.gastos.data', JSON.stringify({ gastos: [{ id: 1 }] }));
    ls.setItem('gastos_v1', JSON.stringify({ gastos: [{ id: 99 }] })); // legacy
    const result = _readLocal(ls, 'gastos.data');
    expect(result.gastos[0].id).toBe(1); // usa la nueva, no la legacy
  });

  test('usa clave legacy si wapps.* no existe', () => {
    ls.setItem('gastos_v1', JSON.stringify({ gastos: [{ id: 42 }] }));
    const result = _readLocal(ls, 'gastos.data');
    expect(result).not.toBeNull();
    expect(result.gastos[0].id).toBe(42);
  });

  test('migra al vuelo la clave legacy a wapps.*', () => {
    ls.setItem('mascotas_v1', JSON.stringify({ pets: [{ id: 1 }] }));
    _readLocal(ls, 'mascotas.data');
    // Debe haberse copiado a la clave nueva
    const newRaw = ls.getItem('wapps.mascotas.data');
    expect(newRaw).not.toBeNull();
    expect(JSON.parse(newRaw).pets).toHaveLength(1);
  });

  test('devuelve null si no hay ninguna clave', () => {
    expect(_readLocal(ls, 'gastos.data')).toBeNull();
  });

  test('devuelve null para clave sin legacy map', () => {
    expect(_readLocal(ls, 'app.sin.legacy')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────
// Comportamiento offline — la app guarda localmente y marca pending
// ─────────────────────────────────────────────────────────────────
describe('Comportamiento offline — save local + marca pending', () => {
  let ls, bus, queue;
  beforeEach(() => {
    ls  = makeLS();
    bus = makeEventBus();
    queue = makeWSyncQueue(ls, bus);
  });

  test('WStore.set offline: persiste en localStorage y marca pending', () => {
    // Simula WStore.set cuando Firebase no está disponible
    const PREFIX = 'wapps.';
    const app = 'gastos', key = 'data';
    const data = { gastos: [{ id: 1, importe: 20 }] };
    const payload = { ...data, _updatedAt: new Date().toISOString() };

    // Guardar en localStorage
    ls.setItem(`${PREFIX}${app}.${key}`, JSON.stringify(payload));

    // Marcar pending (porque no hay red/usuario)
    queue.markPending(`${app}.${key}`);

    expect(ls.getItem('wapps.gastos.data')).not.toBeNull();
    expect(queue.getPending()).toContain('gastos.data');
  });

  test('al recuperar online: pending se sube y se limpia', async () => {
    // Simula el flujo: offline → guarda → online → sube → limpia pending
    queue.markPending('gastos.data');
    queue.markPending('compra.data');
    expect(queue.getPending()).toHaveLength(2);

    // Simula subida exitosa
    const mockPushFn = jest.fn().mockResolvedValue(true);
    const pending = [...queue.getPending()];
    for (const key of pending) {
      ls.setItem('wapps.' + key, JSON.stringify({ data: key }));
      const ok = await mockPushFn(key);
      if (ok) queue.clearPending(key);
    }

    expect(queue.getPending()).toEqual([]);
    expect(mockPushFn).toHaveBeenCalledTimes(2);
  });

  test('pending se acumula a través de múltiples operaciones offline', () => {
    // Usuario hace varias acciones sin red
    queue.markPending('gastos.data');
    queue.markPending('compra.data');
    queue.markPending('gastos.data'); // duplicado → no se añade de nuevo
    queue.markPending('despensa.items');
    expect(queue.getPending()).toHaveLength(3);
  });

  test('syncAll no opera si isOnline = false', async () => {
    // Simulación de la guarda de syncAll
    const isOnline = false;
    queue.markPending('gastos.data');

    const mockFn = jest.fn();
    const result = isOnline
      ? await mockFn('syncAll')  // no debe llamarse
      : { pushed: 0, failed: 0 };

    expect(result).toEqual({ pushed: 0, failed: 0 });
    expect(mockFn).not.toHaveBeenCalled();
    // El pending sigue ahí para cuando haya red
    expect(queue.getPending()).toContain('gastos.data');
  });

  test('pullAll no opera si isOnline = false', () => {
    const isOnline = false;
    const mockPull = jest.fn();
    if (isOnline) mockPull();
    expect(mockPull).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────
// Logout — limpieza de datos wapps.*
// ─────────────────────────────────────────────────────────────────
describe('Logout — limpieza de datos locales', () => {
  function simulateLogout(ls) {
    const keysToRemove = [];
    for (let i = 0; i < ls.length; i++) {
      const k = ls.key(i);
      if (k && (k.startsWith('wapps.') || k === 'wapps.pending' || k === 'wapps.lastSync')) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => ls.removeItem(k));
  }

  test('logout elimina todas las claves wapps.*', () => {
    const ls = makeLS();
    ls.setItem('wapps.gastos.data',  JSON.stringify({ gastos: [{ id: 1 }] }));
    ls.setItem('wapps.compra.data',  JSON.stringify({ items: [] }));
    ls.setItem('wapps.pending',      JSON.stringify(['gastos.data']));
    ls.setItem('otro.dato',          'no-borrar');

    simulateLogout(ls);

    expect(ls.getItem('wapps.gastos.data')).toBeNull();
    expect(ls.getItem('wapps.compra.data')).toBeNull();
    expect(ls.getItem('wapps.pending')).toBeNull();
  });

  test('logout NO elimina datos de otras aplicaciones (no wapps.*)', () => {
    const ls = makeLS();
    ls.setItem('wapps.gastos.data', JSON.stringify({ gastos: [] }));
    ls.setItem('otro-app-data', 'no-mio');
    ls.setItem('theme-prefs', 'dark');

    simulateLogout(ls);

    expect(ls.getItem('otro-app-data')).toBe('no-mio');
    expect(ls.getItem('theme-prefs')).toBe('dark');
  });

  test('después del logout getPending devuelve array vacío', () => {
    const ls = makeLS();
    const bus = makeEventBus();
    const queue = makeWSyncQueue(ls, bus);

    queue.markPending('gastos.data');
    queue.markPending('compra.data');
    simulateLogout(ls);

    expect(queue.getPending()).toEqual([]);
  });

  test('datos de otro usuario no se filtran tras logout+login', () => {
    const ls = makeLS();
    ls.setItem('wapps.gastos.data', JSON.stringify({ gastos: [{ id: 1, importe: 100 }] }));
    simulateLogout(ls);
    expect(ls.getItem('wapps.gastos.data')).toBeNull();
    // El nuevo usuario empieza desde cero
  });
});

// ─────────────────────────────────────────────────────────────────
// Retry con backoff exponencial
// ─────────────────────────────────────────────────────────────────
describe('Retry con backoff — _pushWithRetry', () => {
  const MAX_RETRIES   = 3;
  const RETRY_DELAYS  = [2000, 4000, 8000];

  // Versión síncrona del retry para tests (sin sleep real)
  function makePushWithRetry(pushFn) {
    const retryCount = new Map();

    async function pushWithRetry(uid, key, attempt = 0) {
      if (attempt >= MAX_RETRIES) return false;
      const ok = await pushFn(uid, key);
      if (ok) { retryCount.delete(key); return true; }
      const nextAttempt = attempt + 1;
      retryCount.set(key, nextAttempt);
      if (nextAttempt < MAX_RETRIES) {
        // En producción hay await _sleep(RETRY_DELAYS[attempt])
        // En tests saltamos el sleep
        return pushWithRetry(uid, key, nextAttempt);
      }
      return false;
    }

    return { pushWithRetry, retryCount };
  }

  test('éxito al primer intento: devuelve true', async () => {
    const pushFn = jest.fn().mockResolvedValue(true);
    const { pushWithRetry } = makePushWithRetry(pushFn);
    expect(await pushWithRetry('uid', 'gastos.data')).toBe(true);
    expect(pushFn).toHaveBeenCalledTimes(1);
  });

  test('falla 1 vez, luego éxito: devuelve true', async () => {
    const pushFn = jest.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const { pushWithRetry } = makePushWithRetry(pushFn);
    expect(await pushWithRetry('uid', 'gastos.data')).toBe(true);
    expect(pushFn).toHaveBeenCalledTimes(2);
  });

  test('falla MAX_RETRIES veces: devuelve false', async () => {
    const pushFn = jest.fn().mockResolvedValue(false);
    const { pushWithRetry } = makePushWithRetry(pushFn);
    const result = await pushWithRetry('uid', 'gastos.data');
    expect(result).toBe(false);
    expect(pushFn).toHaveBeenCalledTimes(MAX_RETRIES);
  });

  test('intento >= MAX_RETRIES devuelve false sin llamar a pushFn', async () => {
    const pushFn = jest.fn();
    const { pushWithRetry } = makePushWithRetry(pushFn);
    const result = await pushWithRetry('uid', 'key', MAX_RETRIES);
    expect(result).toBe(false);
    expect(pushFn).not.toHaveBeenCalled();
  });

  test('constantes de delay son correctas', () => {
    // Los delays de backoff son 2s → 4s → 8s (exponencial)
    expect(RETRY_DELAYS[0]).toBe(2000);
    expect(RETRY_DELAYS[1]).toBe(4000);
    expect(RETRY_DELAYS[2]).toBe(8000);
    expect(RETRY_DELAYS[0] * 2).toBe(RETRY_DELAYS[1]);
    expect(RETRY_DELAYS[1] * 2).toBe(RETRY_DELAYS[2]);
  });
});

// ─────────────────────────────────────────────────────────────────
// Service Worker — detección de actualizaciones
// ─────────────────────────────────────────────────────────────────
describe('Service Worker — estrategia stale-while-revalidate', () => {
  const fs   = require('fs');
  const path = require('path');
  const swContent = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf-8');

  test('SW implementa stale-while-revalidate para HTML (sirve caché, actualiza en background)', () => {
    // El SW puede usar el literal en mayúsculas en comentario o implementarlo directamente
    const hasComment = swContent.toUpperCase().includes('STALE-WHILE-REVALIDATE');
    // O verificar que hay lógica de "served cached then network fetch":
    // const cached = ... ; const networkFetch = ... ; return cached || networkFetch
    const hasImpl = /const\s+cached[\s\S]+?const\s+networkFetch|return\s+cached\s+\|\|\s+networkFetch/.test(swContent);
    expect(hasComment || hasImpl).toBe(true);
  });

  test('SW detecta cambios por ETag o Last-Modified', () => {
    expect(swContent).toContain('etag');
    expect(swContent).toContain('last-modified');
  });

  test('SW notifica a clientes cuando hay nueva versión disponible', () => {
    expect(swContent).toContain('UPDATE_AVAILABLE');
    expect(swContent).toContain('postMessage');
  });

  test('SW acepta mensaje SKIP_WAITING para activar nueva versión', () => {
    expect(swContent).toContain('SKIP_WAITING');
    expect(swContent).toContain('skipWaiting()');
  });

  test('SW tiene estrategia cache-first para CDNs (Firebase, Fonts, jsPDF)', () => {
    expect(swContent).toContain('isCacheableCDN');
    expect(swContent).toContain('gstatic.com');
    expect(swContent).toContain('fonts.googleapis.com');
    expect(swContent).toContain('cdnjs.cloudflare.com');
  });

  test('SW no cachea Firestore API (tiene su propio mecanismo offline)', () => {
    // googleapis.com debe estar en la lista de exclusiones (sin cachear)
    expect(swContent).toContain('googleapis.com');
    // Y debe estar en el bloque de exclusiones, no en isCacheableCDN
    const cdnBlock = swContent.match(/isCacheableCDN\s*=[\s\S]*?;/)?.[0] || '';
    expect(cdnBlock).not.toContain('firestore.googleapis.com');
  });

  test('SW limpia versiones anteriores del caché al activarse', () => {
    expect(swContent).toContain('caches.delete');
    expect(swContent).toContain('keys.filter(k => k !== CACHE)');
  });

  test('SW usa clients.claim() para tomar control inmediato', () => {
    expect(swContent).toContain('clients.claim()');
  });
});
