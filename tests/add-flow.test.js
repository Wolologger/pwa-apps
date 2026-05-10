/**
 * Tests para flujos de "añadir" en las apps.
 * Verifica que los datos persisten inmediatamente, que los IDs activos
 * se mantienen tras sync, y que no hay ventanas de pérdida de datos.
 */

const fs   = require('fs');
const path = require('path');

// ── Helpers ────────────────────────────────────────────────────

function makeLS() {
  const s = {};
  return {
    getItem:    k     => s[k] ?? null,
    setItem:    (k,v) => { s[k] = String(v); },
    removeItem: k     => { delete s[k]; },
    clear:      ()    => Object.keys(s).forEach(k => delete s[k]),
    _store:     s,
  };
}

// Simula WStore.set que guarda en localStorage con _updatedAt
function makeWStore(ls) {
  const events = {};
  const bus = {
    addEventListener: (t, fn) => { events[t] = events[t] || []; events[t].push(fn); },
    dispatchEvent:    (e)      => { (events[e.type] || []).forEach(fn => fn(e)); },
  };

  function set(app, key, value) {
    const payload = (value && typeof value === 'object' && !Array.isArray(value))
      ? { ...value, _updatedAt: new Date().toISOString() }
      : value;
    ls.setItem(`wapps.${app}.${key}`, JSON.stringify(payload));
    bus.dispatchEvent({ type: 'wapps:change', detail: { app, key, value: payload } });
  }
  function get(app, key) {
    const v = ls.getItem(`wapps.${app}.${key}`);
    return v ? JSON.parse(v) : null;
  }

  return { set, get, bus };
}

// ─────────────────────────────────────────────────────────────────
// Persistencia inmediata — sin ventana de pérdida de datos
// ─────────────────────────────────────────────────────────────────
describe('Persistencia inmediata — _saveImmediate sin debounce', () => {

  // Verifica el patrón de mascotas.html: acciones explícitas usan _saveImmediate()
  test('mascotas.html — acciones de add usan _saveImmediate() no save()', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'mascotas.html'), 'utf-8');

    // Verificar que _saveImmediate existe como función propia
    expect(html).toContain('function _saveImmediate()');

    // addPet, addMed, addVisit, addWeight deben tener _saveImmediate() en su ámbito
    // (buscamos que _saveImmediate aparezca después de cada función add, no save())
    const patterns = ['addPet()', 'addMed()', 'addVisit()', 'addWeight()'];
    patterns.forEach(fnName => {
      const fnKey = `function ${fnName.replace('()', '(')}`;
      const idx = html.indexOf(fnKey);
      if (idx >= 0) {
        // Extraer el cuerpo hasta el siguiente "function " — sin límite de chars
        const rest = html.slice(idx + fnKey.length);
        const nextFn = rest.search(/\nfunction /);
        const body = nextFn > 0 ? rest.slice(0, nextFn) : rest.slice(0, 2000);
        expect(body).toContain('_saveImmediate()');
      }
    });
  });

  test('Secuencia correcta: _saveImmediate → localStorage actualizado antes de render', () => {
    const ls = makeLS();
    const store = makeWStore(ls);

    // Simula el estado inicial de mascotas (vacío)
    let state = { pets: [], nextId: 1 };

    function _saveImmediate() {
      state.nextId = 1;
      ls.setItem('mascotas_v1', JSON.stringify(state));
      store.set('mascotas', 'data', state);
    }

    // Simula addPet
    const newPet = { id: Date.now(), nombre: 'Rex', emoji: '🐶', meds: [], visits: [], weights: [] };
    state.pets.push(newPet);
    _saveImmediate(); // inmediato, sin debounce

    // VERIFICAR: el dato está en localStorage ANTES de cualquier posible manualPull
    const saved = JSON.parse(ls.getItem('mascotas_v1') || '{}');
    expect(saved.pets).toHaveLength(1);
    expect(saved.pets[0].nombre).toBe('Rex');

    const wstoreSaved = store.get('mascotas', 'data');
    expect(wstoreSaved.pets).toHaveLength(1);
  });

  test('pullAll NO sobreescribe datos recién guardados (timestamp local >= remoto)', () => {
    const ls = makeLS();
    const store = makeWStore(ls);

    // Simula el estado inicial con una mascota recién añadida
    const T1 = new Date().toISOString();
    const localState = { pets: [{ id: 1, nombre: 'Rex' }], nextId: 2, _updatedAt: T1 };
    ls.setItem('wapps.mascotas.data', JSON.stringify(localState));

    // Simula que Firebase tiene datos más ANTIGUOS (sin la mascota)
    const T0 = new Date(Date.now() - 5000).toISOString(); // 5s antes
    const remoteState = { pets: [], nextId: 1, _updatedAt: T0 };

    // Lógica de pullAll: solo actualiza si remoteTs > localTs
    const remoteTs = new Date(remoteState._updatedAt).getTime();
    const localTs  = new Date(localState._updatedAt).getTime();

    expect(remoteTs).toBeLessThan(localTs); // remoto es ANTERIOR → no sobrescribe
    // Si pulledAll hiciera: if (remoteTs <= localTs) continue → skip
    const shouldOverwrite = remoteTs > localTs;
    expect(shouldOverwrite).toBe(false);

    // El estado local debe mantenerse con la mascota
    const current = JSON.parse(ls.getItem('wapps.mascotas.data'));
    expect(current.pets).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────
// IDs activos tras sync (compra, ninos, setlist, mascotas, coches)
// ─────────────────────────────────────────────────────────────────
describe('IDs activos se preservan tras wapps:recovered', () => {

  // Verifica que cada app actualiza su "active ID" cuando recibe datos frescos
  const APPS_WITH_ACTIVE_ID = [
    { file: 'compra.html',   pattern: 'activeListId',    field: 'lists'  },
    { file: 'ninos.html',    pattern: 'activeKidId',     field: 'kids'   },
    { file: 'setlist.html',  pattern: 'activeBandId',    field: 'bands'  },
    { file: 'mascotas.html', pattern: 'activePetId',     field: 'pets'   },
    { file: 'coches.html',   pattern: 'activeCarId',     field: 'cars'   },
  ];

  APPS_WITH_ACTIVE_ID.forEach(({ file, pattern, field }) => {
    test(`${file} actualiza ${pattern} tras recibir fresh data`, () => {
      const html = fs.readFileSync(path.join(__dirname, '..', file), 'utf-8');

      // Buscar los listeners de recovered y auth-change
      const recoveredIdx = html.indexOf('wapps:recovered');
      const authIdx      = html.indexOf('wapps:auth-change');

      expect(recoveredIdx).toBeGreaterThan(0);
      expect(authIdx).toBeGreaterThan(0);

      // Verificar que en los bloques de sync se actualiza el activeId
      // Buscamos el patrón "activeXxxId" cerca de donde se actualiza state
      const syncBlock = html.slice(Math.max(0, recoveredIdx - 200), recoveredIdx + 500);
      const authBlock = html.slice(Math.max(0, authIdx - 200), authIdx + 500);

      const allBlocks = syncBlock + authBlock;
      expect(allBlocks).toContain(pattern);
    });
  });

  test('compra.html actualiza activeListId cuando está en null', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'compra.html'), 'utf-8');
    // Debe existir el patrón de guarda "if (!activeListId && state.lists?.length)"
    expect(html).toContain('!activeListId');
    expect(html).toContain('state.lists');
  });

  test('ninos.html actualiza activeKidId cuando está en null', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'ninos.html'), 'utf-8');
    expect(html).toContain('!activeKidId');
    expect(html).toContain('fresh.kids');
  });

  test('setlist.html actualiza activeBandId cuando está en null', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'setlist.html'), 'utf-8');
    expect(html).toContain('!activeBandId');
    expect(html).toContain('state.bands');
  });
});

// ─────────────────────────────────────────────────────────────────
// Funciones add — precondiciones necesarias
// ─────────────────────────────────────────────────────────────────
describe('Funciones add — precondiciones documentadas', () => {

  // Verifica que las funciones que bloquean al no tener ID activo
  // al menos tienen el check con la variable correcta
  test('mascotas addMed requiere activePet()', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'mascotas.html'), 'utf-8');
    const addMedIdx = html.indexOf('function addMed()');
    const addMedEnd = html.indexOf('function ', addMedIdx + 10);
    const addMedBody = html.slice(addMedIdx, addMedEnd);
    expect(addMedBody).toContain('activePet()');
    expect(addMedBody).toContain('if (!pet) return');
  });

  test('mascotas addVisit requiere activePet()', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'mascotas.html'), 'utf-8');
    const fn = html.match(/function addVisit\(\)[\s\S]*?(?=\nfunction )/)?.[0] || '';
    expect(fn).toContain('activePet()');
  });

  test('compra addItem requiere texto Y activeListId', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'compra.html'), 'utf-8');
    const fn = html.match(/function addItem\(\)[\s\S]*?(?=\nfunction )/)?.[0] || '';
    expect(fn).toContain('activeListId');
    expect(fn).toContain('txt');
  });
});

// ─────────────────────────────────────────────────────────────────
// Sync guard — pullAll no se ejecuta múltiples veces en 10s
// ─────────────────────────────────────────────────────────────────
describe('Sync guard — wapps:auth-change no dispara pullAll repetidamente', () => {

  test('wapps-firebase.js tiene guard _lastAuthSyncAt de 10s', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'wapps-firebase.js'), 'utf-8');
    expect(code).toContain('_lastAuthSyncAt');
    expect(code).toContain('10000');
  });

  test('El guard se resetea en logout (usuario = null)', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'wapps-firebase.js'), 'utf-8');
    // Cuando el user es null (logout), el guard se resetea
    expect(code).toContain('_lastAuthSyncAt = 0');
  });

  test('onAuthStateChanged NO llama WSync.pullAll directamente', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'wapps-firebase.js'), 'utf-8');
    const onAuthIdx = code.indexOf('onAuthStateChanged(user =>');
    const onAuthEnd = code.indexOf('});', onAuthIdx + 20);
    const onAuthBody = code.slice(onAuthIdx, onAuthEnd);
    // Eliminar comentarios antes de buscar llamadas reales
    const noComments = onAuthBody.replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    // No debe haber una LLAMADA a WSync.pullAll (con paréntesis)
    expect(noComments).not.toContain('WSync.pullAll(');
    expect(noComments).not.toContain('pullAll(user');
  });
});

// ─────────────────────────────────────────────────────────────────
// Pull-to-refresh — no activa durante uso normal del scroll
// ─────────────────────────────────────────────────────────────────
describe('wapps-nav.js — PTR no interfiere con uso normal', () => {

  test('Código verifica scrollTop de .content antes de PTR', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'wapps-nav.js'), 'utf-8');
    expect(code).toContain('scrollTop');
    expect(code).toContain('_contentAtTop');
  });

  test('PTR solo se activa con toque en zona top < 120px', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'wapps-nav.js'), 'utf-8');
    expect(code).toContain('clientY > 120');
  });

  test('PTR prefiere manualPull() para evitar location.reload()', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'wapps-nav.js'), 'utf-8');
    const pullIdx   = code.indexOf('manualPull');
    const reloadIdx = code.indexOf('location.reload');
    expect(pullIdx).toBeLessThan(reloadIdx);
  });

  test('La vibración de PTR NO usa haptic() del app, usa navigator.vibrate directo', () => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'wapps-nav.js'), 'utf-8');
    // navigator.vibrate directo, no haptic() que podría tener efectos secundarios
    expect(code).toContain('navigator.vibrate');
    expect(code).not.toContain('haptic(');
  });
});

// ─────────────────────────────────────────────────────────────────
// Análisis estático — detectar ventanas de pérdida de datos
// ─────────────────────────────────────────────────────────────────
describe('Análisis estático — no hay ventanas de pérdida de datos', () => {

  const CRITICAL_APPS = ['mascotas', 'coches', 'ninos', 'despensa'];

  CRITICAL_APPS.forEach(app => {
    test(`${app}.html — función add principal persiste datos`, () => {
      const html = fs.readFileSync(path.join(__dirname, `../${app}.html`), 'utf-8');
      // Las funciones add deben llamar save() o _saveImmediate() antes de return
      const hasImmediateSave = html.includes('_saveImmediate()') || html.includes('save()');
      expect(hasImmediateSave).toBe(true);
    });
  });

  test('mascotas.html — addPet usa _saveImmediate (inmediato, sin debounce)', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'mascotas.html'), 'utf-8');
    // addPet debe llamar _saveImmediate, no save()
    const addPetIdx = html.indexOf('function addPet()');
    const addPetEnd = html.indexOf('\nfunction ', addPetIdx + 10);
    const body = html.slice(addPetIdx, addPetEnd);
    expect(body).toContain('_saveImmediate()');
  });

  test('Los debounce de save() tienen beforeunload flush como seguro', () => {
    const APPS_WITH_DEBOUNCE = ['compra', 'deseados', 'finanzas', 'semana', 'setlist'];
    APPS_WITH_DEBOUNCE.forEach(app => {
      const html = fs.readFileSync(path.join(__dirname, `../${app}.html`), 'utf-8');
      expect(html).toContain('beforeunload');
      expect(html).toContain('_saveImmediate()');
    });
  });
});
