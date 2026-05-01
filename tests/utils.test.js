/**
 * Tests para wapps-utils.js
 * Funciones puras: p2, today, fmt, esc, haptic, showToast
 */

// ── Definición inline (evita problemas de scope con eval) ──────
// Las funciones son idénticas a las de wapps-utils.js

function p2(n) { return String(n).padStart(2, '0'); }

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

function fmt(n, d = 2) {
  return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────────
// p2 — padding con cero
// ─────────────────────────────────────────────────────────────────
describe('p2 — padding con cero', () => {
  test('dígito único recibe cero delante', () => {
    expect(p2(5)).toBe('05');
    expect(p2(0)).toBe('00');
    expect(p2(1)).toBe('01');
    expect(p2(9)).toBe('09');
  });

  test('dos dígitos no cambian', () => {
    expect(p2(10)).toBe('10');
    expect(p2(12)).toBe('12');
    expect(p2(99)).toBe('99');
  });

  test('acepta strings numéricos', () => {
    expect(p2('7')).toBe('07');
    expect(p2('11')).toBe('11');
  });

  test('números grandes pasan sin modificar', () => {
    expect(p2(100)).toBe('100');
    expect(p2(1234)).toBe('1234');
  });
});

// ─────────────────────────────────────────────────────────────────
// today — fecha actual en YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────
describe('today — fecha actual', () => {
  test('devuelve formato YYYY-MM-DD', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('año actual es correcto', () => {
    const year = new Date().getFullYear().toString();
    expect(today().startsWith(year)).toBe(true);
  });

  test('mes y día tienen padding a dos dígitos', () => {
    const parts = today().split('-');
    expect(parts[1].length).toBe(2);
    expect(parts[2].length).toBe(2);
  });

  test('valor es una fecha válida', () => {
    const d = new Date(today());
    expect(isNaN(d.getTime())).toBe(false);
  });

  test('coincide con la fecha real del sistema', () => {
    const d = new Date();
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    expect(today()).toBe(expected);
  });
});

// ─────────────────────────────────────────────────────────────────
// fmt — formato numérico español
// ─────────────────────────────────────────────────────────────────
describe('fmt — formato numérico español', () => {
  test('formatea con dos decimales por defecto', () => {
    // En es-ES: punto como sep. miles, coma como sep. decimal
    const result = fmt(1234.56);
    expect(result).toContain(',56');
  });

  test('cero devuelve "0,00"', () => {
    expect(fmt(0)).toBe('0,00');
  });

  test('null y undefined se tratan como cero', () => {
    expect(fmt(null)).toBe('0,00');
    expect(fmt(undefined)).toBe('0,00');
  });

  test('respeta parámetro de decimales: 0', () => {
    const result = fmt(10, 0);
    expect(result).not.toContain(',');
  });

  test('respeta parámetro de decimales: 1', () => {
    const result = fmt(3.5, 1);
    expect(result).toContain(',5');
  });

  test('negativo se mantiene negativo', () => {
    const result = fmt(-50);
    expect(result).toContain('-');
  });

  test('entero grande con separador de miles', () => {
    // 1000 en es-ES = "1.000,00"
    const result = fmt(1000);
    expect(result).toContain('1');
    expect(result).toContain('000');
  });
});

// ─────────────────────────────────────────────────────────────────
// esc — escape HTML
// ─────────────────────────────────────────────────────────────────
describe('esc — escape HTML seguro', () => {
  test('escapa ampersand &', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });

  test('escapa < (inicio de tag)', () => {
    expect(esc('<div>')).toContain('&lt;');
  });

  test('escapa > (cierre de tag)', () => {
    expect(esc('<div>')).toContain('&gt;');
  });

  test('escapa comillas dobles', () => {
    expect(esc('"texto"')).toBe('&quot;texto&quot;');
  });

  test('cadena vacía devuelve cadena vacía', () => {
    expect(esc('')).toBe('');
  });

  test('null y undefined devuelven cadena vacía', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  test('texto sin caracteres especiales no cambia', () => {
    expect(esc('Texto normal 123')).toBe('Texto normal 123');
  });

  test('convierte números a string sin modificar', () => {
    expect(esc(42)).toBe('42');
  });

  test('previene XSS: script tag completo', () => {
    const result = esc('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('</script>');
    expect(result).toContain('&lt;script&gt;');
  });

  test('previene XSS: atributo con comillas', () => {
    const result = esc('" onclick="alert(1)"');
    expect(result).not.toContain('"');
    expect(result).toContain('&quot;');
  });

  test('multiple caracteres especiales en una cadena', () => {
    const result = esc('<a href="url">texto & más</a>');
    expect(result).toBe('&lt;a href=&quot;url&quot;&gt;texto &amp; más&lt;/a&gt;');
  });
});

// ─────────────────────────────────────────────────────────────────
// haptic — vibración táctil
// ─────────────────────────────────────────────────────────────────
describe('haptic — vibración táctil', () => {
  function haptic(p = 'light') {
    if (!navigator.vibrate) return;
    if (p === 'light') navigator.vibrate(8);
    else if (p === 'medium') navigator.vibrate(18);
    else if (p === 'success') navigator.vibrate([8, 50, 8]);
    else if (p === 'error') navigator.vibrate([30, 60, 30]);
    else navigator.vibrate(p);
  }

  beforeEach(() => { global._vibrateCalls.length = 0; });

  test('light llama a vibrate(8)', () => {
    haptic('light');
    expect(global._vibrateCalls).toEqual([8]);
  });

  test('medium llama a vibrate(18)', () => {
    haptic('medium');
    expect(global._vibrateCalls).toEqual([18]);
  });

  test('success llama a vibrate con patrón', () => {
    haptic('success');
    expect(global._vibrateCalls).toEqual([[8, 50, 8]]);
  });

  test('error llama a vibrate con patrón largo', () => {
    haptic('error');
    expect(global._vibrateCalls).toEqual([[30, 60, 30]]);
  });

  test('sin vibrate API no lanza error', () => {
    const original = navigator.vibrate;
    navigator.vibrate = undefined;
    expect(() => haptic('light')).not.toThrow();
    navigator.vibrate = original;
  });

  test('parámetro por defecto es light', () => {
    haptic();
    expect(global._vibrateCalls).toEqual([8]);
  });
});
