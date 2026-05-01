/**
 * Tests de regresión — análisis estático de los archivos HTML
 * Previenen la reaparición de bugs críticos detectados y corregidos.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const ALL_APPS = [
  'compra', 'coches', 'decisor', 'deseados', 'despensa',
  'finanzas', 'gastos-diarios', 'instrumentos', 'mascotas',
  'ninos', 'obra', 'semana', 'setlist', 'suministros',
  'ajustes', 'backup',
];

// Apps que usan el patrón save() + _saveImmediate
const APPS_WITH_SAVE = [
  'compra', 'coches', 'decisor', 'deseados', 'finanzas',
  'gastos-diarios', 'mascotas', 'ninos', 'obra', 'semana',
  'setlist', 'suministros',
];

// Apps con estructura de tabs + showTab()
const APPS_WITH_TABS = ['mascotas', 'coches', 'ninos'];

// Extrae el contenido de todos los <script> inline de un HTML
function getInlineScripts(html) {
  const inline = [];
  const re = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) inline.push(m[1]);
  return inline.join('\n');
}

// Lee un archivo HTML
function readApp(name) {
  return fs.readFileSync(path.join(ROOT, `${name}.html`), 'utf-8');
}

// ─────────────────────────────────────────────────────────────────
// BUG #1: Doble function save() — hoisting de _saveImmediate
// const _saveImmediate = save  →  apunta a la versión debounce → bucle infinito
// ─────────────────────────────────────────────────────────────────
describe('Regresión — bug hoisting save() (CRÍTICO)', () => {

  ALL_APPS.forEach(app => {
    test(`${app}.html no tiene const _saveImmediate = save`, () => {
      const html = readApp(app);
      const script = getInlineScripts(html);
      expect(script).not.toMatch(/const\s+_saveImmediate\s*=\s*save\s*;/);
    });
  });

  APPS_WITH_SAVE.forEach(app => {
    test(`${app}.html tiene function _saveImmediate() como función propia`, () => {
      const html = readApp(app);
      expect(html).toMatch(/function\s+_saveImmediate\s*\(/);
    });
  });

  test('NO hay ningún HTML con el patrón roto (todas corregidas)', () => {
    const broken = ALL_APPS.filter(app => {
      const html = readApp(app);
      return /const\s+_saveImmediate\s*=\s*save\s*;/.test(getInlineScripts(html));
    });
    expect(broken).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────
// BUG #2: syncOnLoad dentro de showTab() → listeners duplicados
// ─────────────────────────────────────────────────────────────────
describe('Regresión — syncOnLoad fuera de showTab()', () => {

  APPS_WITH_TABS.forEach(app => {
    test(`${app}.html: syncOnLoad no está dentro de showTab()`, () => {
      const html = readApp(app);
      const script = getInlineScripts(html);

      // Extraer solo las líneas de showTab usando un enfoque de conteo de llaves
      const startIdx = script.indexOf('function showTab(');
      if (startIdx === -1) return; // no hay showTab, test OK

      let depth = 0;
      let bodyStart = script.indexOf('{', startIdx);
      let endIdx = bodyStart;
      for (let i = bodyStart; i < script.length; i++) {
        if (script[i] === '{') depth++;
        else if (script[i] === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
      }

      const showTabBody = script.slice(bodyStart, endIdx);
      expect(showTabBody).not.toContain('syncOnLoad');
      expect(showTabBody).not.toContain("'wapps:auth-change'");
      expect(showTabBody).not.toContain('"wapps:auth-change"');
    });
  });

  test('mascotas.html tiene syncOnLoad en nivel superior del script', () => {
    const html = readApp('mascotas');
    expect(html).toContain("WStore.syncOnLoad('mascotas'");
    expect(html).toContain("wapps:auth-change");
    expect(html).toContain("wapps:recovered");
  });

  test('coches.html tiene syncOnLoad en nivel superior del script', () => {
    const html = readApp('coches');
    expect(html).toContain("WStore.syncOnLoad('coches'");
    expect(html).toContain("wapps:auth-change");
  });
});

// ─────────────────────────────────────────────────────────────────
// Estructura HTML — scripts requeridos en todas las apps
// ─────────────────────────────────────────────────────────────────
describe('Estructura — scripts requeridos', () => {
  // Firebase SDK viene de CDN, los demás son locales
  const LOCAL_SCRIPTS = ['wapps-utils.js', 'wapps-config.js', 'wapps-store.js', 'wapps-firebase.js', 'wapps-sync-ui.js'];
  const SYNC_APPS = ALL_APPS.filter(a => !['ajustes', 'backup'].includes(a));

  test('todas las apps incluyen Firebase SDK desde CDN', () => {
    SYNC_APPS.forEach(app => {
      const html = readApp(app);
      expect(html).toContain('firebase-app-compat.js');
    });
  });

  SYNC_APPS.forEach(app => {
    LOCAL_SCRIPTS.forEach(script => {
      test(`${app}.html incluye ${script}`, () => {
        const html = readApp(app);
        expect(html).toContain(`src="${script}"`);
      });
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Estructura HTML — sync-bar con botones correctos
// ─────────────────────────────────────────────────────────────────
describe('Estructura — sync-bar completa', () => {

  ALL_APPS.forEach(app => {
    if (app === 'ajustes') return; // ajustes tiene estructura diferente

    test(`${app}.html tiene sync-bar con botones`, () => {
      const html = readApp(app);
      expect(html).toContain('sync-bar');
      expect(html).toContain('manualSync()');
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Estructura HTML — no hay código duplicado de sync
// ─────────────────────────────────────────────────────────────────
describe('Regresión — sin duplicación de listeners sync', () => {

  ALL_APPS.forEach(app => {
    test(`${app}.html no tiene función updateSyncUI definida inline`, () => {
      const html = readApp(app);
      const script = getInlineScripts(html);
      // updateSyncUI solo debe venir de wapps-sync-ui.js, no definirse inline
      expect(script).not.toMatch(/function\s+updateSyncUI\s*\(/);
    });
  });

  ALL_APPS.forEach(app => {
    test(`${app}.html no tiene función manualPull definida inline`, () => {
      const html = readApp(app);
      const script = getInlineScripts(html);
      expect(script).not.toMatch(/function\s+manualPull\s*\(/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Versiones — badge de versión presente en todas las apps
// ─────────────────────────────────────────────────────────────────
describe('Versiones — badge presente', () => {
  const VERSIONED_APPS = ALL_APPS.filter(a => a !== 'backup');

  VERSIONED_APPS.forEach(app => {
    test(`${app}.html tiene badge de versión`, () => {
      const html = readApp(app);
      expect(html).toMatch(/wnav-version.*v\d+\.\d+/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// Service Worker — precache incluye los módulos compartidos
// ─────────────────────────────────────────────────────────────────
describe('Service Worker — precache completo', () => {
  let swContent;
  beforeAll(() => {
    swContent = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf-8');
  });

  const REQUIRED_PRECACHE = [
    'wapps-utils.js',
    'wapps-store.js',
    'wapps-firebase.js',
    'wapps-common.css',
    'index.html',
    'offline.html',
  ];

  REQUIRED_PRECACHE.forEach(file => {
    test(`sw.js incluye ${file} en precache`, () => {
      expect(swContent).toContain(file);
    });
  });

  test('sw.js tiene versión de cache definida', () => {
    expect(swContent).toMatch(/const\s+CACHE\s*=\s*'wapps-v\d+\.\d+'/);
  });

  test('sw.js tiene listener de SKIP_WAITING', () => {
    expect(swContent).toContain('SKIP_WAITING');
    expect(swContent).toContain('skipWaiting()');
  });
});

// ─────────────────────────────────────────────────────────────────
// esc() — garantía de seguridad XSS en HTML generado
// Verifica que las apps usan esc() en datos del usuario antes de inyectar en HTML
// ─────────────────────────────────────────────────────────────────
describe('Seguridad — uso de esc() en renderizado', () => {
  // Comprueba que las apps con render dinámico llaman a esc() en nombres/texto del usuario

  const RENDER_APPS = ['mascotas', 'coches', 'compra', 'deseados', 'gastos-diarios'];

  RENDER_APPS.forEach(app => {
    test(`${app}.html usa esc() en HTML generado dinámicamente`, () => {
      const html = readApp(app);
      // Verificar directamente en el HTML completo (esc() puede estar en template literals)
      expect(html).toContain('esc(');
    });
  });
});
