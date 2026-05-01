/**
 * Tests para lógica de negocio pura extraída de las apps HTML.
 * Funciones: calcAge, daysUntil, daysSince, isBirthdayToday,
 *            catStats (detector 2σ), estimatedExpiry, calcPrediction.
 */

// ── Utilidades comunes ─────────────────────────────────────────
function p2(n) { return String(n).padStart(2, '0'); }

function dateStr(d) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n); return dateStr(d);
}

function daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n); return dateStr(d);
}

// ── Funciones de mascotas.html ─────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date(); now.setHours(12, 0, 0, 0);
  return Math.ceil((d - now) / (1000 * 60 * 60 * 24));
}

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00:00');
  const now = new Date(); now.setHours(12, 0, 0, 0);
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function calcAge(birthDate) {
  if (!birthDate) return null;
  const birth = new Date(birthDate + 'T12:00:00');
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (months < 0) { years--; months += 12; }
  if (years === 0) return `${months} mes${months !== 1 ? 'es' : ''}`;
  if (years < 2)   return `${years} año${years !== 1 ? 's' : ''} y ${months} mes${months !== 1 ? 'es' : ''}`;
  return `${years} año${years !== 1 ? 's' : ''}`;
}

function isBirthdayToday(birthDate) {
  if (!birthDate) return false;
  const b = new Date(birthDate + 'T12:00:00');
  const n = new Date();
  return b.getDate() === n.getDate() && b.getMonth() === n.getMonth();
}

// ── catStats de gastos-diarios.html ────────────────────────────

function catStats(gastos, cat) {
  const since = new Date(); since.setDate(since.getDate() - 90);
  const vals = gastos
    .filter(g => g.cat === cat && new Date(g.fecha) >= since)
    .map(g => g.importe);
  if (vals.length < 3) return null;
  const mean  = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sigma = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length);
  return { mean, sigma };
}

// ── estimatedExpiry de despensa.html ───────────────────────────

const SHELF_LIFE = {
  lacteos: 7, frutas: 5, verduras: 7, carnes: 3, pescados: 2,
  panaderia: 4, huevos: 21, precocinados: 3, bebidas: 180,
  conservas: 730, pasta: 365, legumbres: 365, cereales: 180,
  condimentos: 365, snacks: 90, dulces: 90, congelados: 90,
  otros: 30,
};

function estimatedExpiry(alimento) {
  if (alimento.fecha) return null;
  const shelfDays = SHELF_LIFE[alimento.cat] ?? SHELF_LIFE['otros'];
  const base = new Date(alimento.added || '2026-01-01');
  const exp  = new Date(base);
  exp.setDate(exp.getDate() + shelfDays);
  return exp.toISOString().slice(0, 10);
}

// ── Lógica de predicciones de suministros.html ─────────────────

function calcPrediction(facturas, tipo) {
  const tf = facturas
    .filter(f => f.tipo === tipo && f.inicio)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  if (tf.length < 2) return null;

  const gaps = [];
  for (let i = 1; i < tf.length; i++) {
    const diff = Math.round(
      (new Date(tf[i].inicio) - new Date(tf[i - 1].inicio)) / 86400000
    );
    if (diff > 5) gaps.push(diff);
  }
  if (!gaps.length) return null;

  const avgDays    = Math.round(gaps.reduce((s, v) => s + v, 0) / gaps.length);
  const lastDate   = new Date(tf[tf.length - 1].inicio);
  const nextDate   = new Date(lastDate.getTime() + avgDays * 86400000);
  const lastImportes = tf.slice(-3).map(f => f.importe);
  const avgImporte = lastImportes.reduce((s, v) => s + v, 0) / lastImportes.length;

  return { avgDays, nextDate: nextDate.toISOString().slice(0, 10), avgImporte };
}

// ─────────────────────────────────────────────────────────────────
// daysUntil
// ─────────────────────────────────────────────────────────────────
describe('daysUntil — días hasta una fecha', () => {
  test('devuelve null para fecha vacía o null', () => {
    expect(daysUntil('')).toBeNull();
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil(undefined)).toBeNull();
  });

  test('devuelve 0 para hoy', () => {
    expect(daysUntil(daysFromNow(0))).toBe(0);
  });

  test('7 para dentro de 7 días', () => {
    expect(daysUntil(daysFromNow(7))).toBe(7);
  });

  test('negativo para fecha pasada', () => {
    expect(daysUntil(daysAgo(3))).toBe(-3);
  });

  test('30 para fecha a 30 días', () => {
    expect(daysUntil(daysFromNow(30))).toBe(30);
  });
});

// ─────────────────────────────────────────────────────────────────
// daysSince
// ─────────────────────────────────────────────────────────────────
describe('daysSince — días desde una fecha', () => {
  test('devuelve null para fecha vacía o null', () => {
    expect(daysSince('')).toBeNull();
    expect(daysSince(null)).toBeNull();
  });

  test('0 para hoy', () => {
    expect(daysSince(daysAgo(0))).toBe(0);
  });

  test('positivo para fecha pasada', () => {
    expect(daysSince(daysAgo(5))).toBe(5);
  });

  test('negativo para fecha futura', () => {
    expect(daysSince(daysFromNow(2))).toBe(-2);
  });
});

// ─────────────────────────────────────────────────────────────────
// calcAge
// ─────────────────────────────────────────────────────────────────
describe('calcAge — cálculo de edad en texto', () => {
  test('devuelve null para fecha vacía o null', () => {
    expect(calcAge(null)).toBeNull();
    expect(calcAge('')).toBeNull();
  });

  test('meses para edad < 12 meses', () => {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const result = calcAge(dateStr(threeMonthsAgo));
    expect(result).toMatch(/mes/);
    expect(result).not.toMatch(/año/);
  });

  test('singular: "1 mes" (no "1 meses")', () => {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    // Ajustar día para evitar que cruce al mes siguiente
    oneMonthAgo.setDate(Math.min(oneMonthAgo.getDate(), 28));
    const result = calcAge(dateStr(oneMonthAgo));
    if (result.startsWith('1')) {
      expect(result).not.toMatch(/1 meses/);
    }
  });

  test('años y meses para edad entre 1 y 2 años', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    d.setMonth(d.getMonth() - 3);
    const result = calcAge(dateStr(d));
    expect(result).toMatch(/año/);
    expect(result).toMatch(/mes/);
  });

  test('solo años para edad >= 2 años', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 5);
    const result = calcAge(dateStr(d));
    expect(result).toBe('5 años');
    expect(result).not.toMatch(/mes/);
  });

  test('singular "1 año" para exactamente 1 año (sin meses)', () => {
    // Creamos una fecha de hace exactamente 1 año
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    const result = calcAge(dateStr(d));
    expect(result).toContain('1 año');
  });

  test('plural "2 años" para 2 años', () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 2);
    const result = calcAge(dateStr(d));
    expect(result).toBe('2 años');
  });
});

// ─────────────────────────────────────────────────────────────────
// isBirthdayToday
// ─────────────────────────────────────────────────────────────────
describe('isBirthdayToday — detección de cumpleaños', () => {
  test('false si no hay fecha', () => {
    expect(isBirthdayToday(null)).toBe(false);
    expect(isBirthdayToday('')).toBe(false);
  });

  test('true si hoy es el cumpleaños (ignorando año)', () => {
    const today = new Date();
    // Mismo día y mes, pero año diferente
    const bday = `1990-${p2(today.getMonth() + 1)}-${p2(today.getDate())}`;
    expect(isBirthdayToday(bday)).toBe(true);
  });

  test('false si el día es diferente', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const bday = `1990-${p2(yesterday.getMonth() + 1)}-${p2(yesterday.getDate())}`;
    expect(isBirthdayToday(bday)).toBe(false);
  });

  test('false si el mes es diferente', () => {
    const today = new Date();
    const otherMonth = (today.getMonth() + 2) % 12;
    const bday = `1990-${p2(otherMonth + 1)}-${p2(today.getDate())}`;
    expect(isBirthdayToday(bday)).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// catStats — estadísticas para detector de gasto anómalo (2σ)
// ─────────────────────────────────────────────────────────────────
describe('catStats — media y desviación estándar', () => {
  const today  = daysAgo(0);
  const ayer   = daysAgo(1);
  const hace2  = daysAgo(2);
  const hace3  = daysAgo(3);
  const hace91 = daysAgo(91);

  test('null si hay menos de 3 gastos en la categoría', () => {
    const gs = [
      { id: 1, cat: 'alimentacion', importe: 20, fecha: today },
      { id: 2, cat: 'alimentacion', importe: 25, fecha: ayer },
    ];
    expect(catStats(gs, 'alimentacion')).toBeNull();
  });

  test('null si < 3 gastos aun habiendo de otras categorías', () => {
    const gs = [
      { id: 1, cat: 'alimentacion', importe: 20, fecha: today },
      { id: 2, cat: 'alimentacion', importe: 25, fecha: ayer },
      { id: 3, cat: 'ocio',         importe: 50, fecha: hace2 }, // no cuenta
    ];
    expect(catStats(gs, 'alimentacion')).toBeNull();
  });

  test('media correcta para 3 gastos simétricos', () => {
    const gs = [
      { id: 1, cat: 'salud', importe: 10, fecha: today },
      { id: 2, cat: 'salud', importe: 20, fecha: ayer  },
      { id: 3, cat: 'salud', importe: 30, fecha: hace2 },
    ];
    const result = catStats(gs, 'salud');
    expect(result.mean).toBe(20);
  });

  test('sigma correcta para distribución conocida', () => {
    // vals = [10, 20, 30] → mean=20, var = ((10-20)²+(20-20)²+(30-20)²)/3 = 200/3
    const gs = [
      { id: 1, cat: 'salud', importe: 10, fecha: today },
      { id: 2, cat: 'salud', importe: 20, fecha: ayer  },
      { id: 3, cat: 'salud', importe: 30, fecha: hace2 },
    ];
    const result = catStats(gs, 'salud');
    expect(result.sigma).toBeCloseTo(Math.sqrt(200 / 3), 5);
  });

  test('sigma 0 cuando todos los valores son iguales', () => {
    const gs = [
      { id: 1, cat: 'transporte', importe: 15, fecha: today },
      { id: 2, cat: 'transporte', importe: 15, fecha: ayer  },
      { id: 3, cat: 'transporte', importe: 15, fecha: hace2 },
    ];
    const result = catStats(gs, 'transporte');
    expect(result.sigma).toBe(0);
  });

  test('ignora gastos de más de 90 días', () => {
    const gs = [
      { id: 1, cat: 'alimentacion', importe: 10,  fecha: today  },
      { id: 2, cat: 'alimentacion', importe: 10,  fecha: ayer   },
      { id: 3, cat: 'alimentacion', importe: 999, fecha: hace91 }, // fuera de ventana
    ];
    // Solo 2 gastos válidos → null
    expect(catStats(gs, 'alimentacion')).toBeNull();
  });

  test('detector 2σ: gasto sobre el umbral es anómalo', () => {
    // mean=10, sigma≈0 → cualquier cosa > 10 con sigma>0 es anómala
    // Con valores 10,10,12: mean=10.67, sigma≈0.94
    // umbral = 10.67 + 2*0.94 = 12.55
    const gs = [
      { id: 1, cat: 'salud', importe: 10, fecha: today },
      { id: 2, cat: 'salud', importe: 10, fecha: ayer  },
      { id: 3, cat: 'salud', importe: 12, fecha: hace2 },
    ];
    const stats = catStats(gs, 'salud');
    const gastoAnomalo = 15;
    expect(stats.sigma).toBeGreaterThan(0);
    expect(gastoAnomalo).toBeGreaterThan(stats.mean + 2 * stats.sigma);
  });

  test('gasto normal no supera el umbral 2σ', () => {
    const gs = [
      { id: 1, cat: 'salud', importe: 10, fecha: today },
      { id: 2, cat: 'salud', importe: 12, fecha: ayer  },
      { id: 3, cat: 'salud', importe: 11, fecha: hace2 },
    ];
    const stats = catStats(gs, 'salud');
    const gastoNormal = 12;
    // umbral ≈ 11 + 2*0.82 ≈ 12.64 → 12 < 12.64 ← no anómalo
    expect(gastoNormal).toBeLessThanOrEqual(stats.mean + 2 * stats.sigma);
  });

  test('con 4 gastos la media es correcta', () => {
    const gs = [
      { id: 1, cat: 'ocio', importe: 10, fecha: today },
      { id: 2, cat: 'ocio', importe: 20, fecha: ayer  },
      { id: 3, cat: 'ocio', importe: 30, fecha: hace2 },
      { id: 4, cat: 'ocio', importe: 40, fecha: hace3 },
    ];
    const result = catStats(gs, 'ocio');
    expect(result.mean).toBe(25);
  });
});

// ─────────────────────────────────────────────────────────────────
// estimatedExpiry — caducidad estimada por categoría
// ─────────────────────────────────────────────────────────────────
describe('estimatedExpiry — caducidad estimada por SHELF_LIFE', () => {
  test('null si el alimento ya tiene fecha real', () => {
    expect(estimatedExpiry({ fecha: '2026-06-01', cat: 'lacteos' })).toBeNull();
  });

  test('lácteos: 7 días desde added', () => {
    expect(estimatedExpiry({ cat: 'lacteos', added: '2026-01-01' })).toBe('2026-01-08');
  });

  test('carnes: 3 días desde added', () => {
    expect(estimatedExpiry({ cat: 'carnes', added: '2026-01-10' })).toBe('2026-01-13');
  });

  test('pescados: 2 días desde added', () => {
    expect(estimatedExpiry({ cat: 'pescados', added: '2026-01-01' })).toBe('2026-01-03');
  });

  test('conservas: 730 días (2 años) desde added', () => {
    // 2026-01-01 + 730 días: 2026(365d) + 2027(365d) = 2028-01-01
    expect(estimatedExpiry({ cat: 'conservas', added: '2026-01-01' })).toBe('2028-01-01');
  });

  test('pasta: 365 días desde added', () => {
    expect(estimatedExpiry({ cat: 'pasta', added: '2026-01-01' })).toBe('2027-01-01');
  });

  test('frutas: 5 días desde added', () => {
    expect(estimatedExpiry({ cat: 'frutas', added: '2026-03-01' })).toBe('2026-03-06');
  });

  test('categoría desconocida usa "otros" (30 días)', () => {
    expect(estimatedExpiry({ cat: 'desconocido', added: '2026-02-01' })).toBe('2026-03-03');
  });

  test('sin campo "added" usa fecha por defecto', () => {
    const result = estimatedExpiry({ cat: 'lacteos' });
    expect(result).not.toBeNull();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('resultado es siempre formato YYYY-MM-DD', () => {
    Object.keys(SHELF_LIFE).forEach(cat => {
      const result = estimatedExpiry({ cat, added: '2026-06-01' });
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

// ─────────────────────────────────────────────────────────────────
// calcPrediction — predicción de próxima factura
// ─────────────────────────────────────────────────────────────────
describe('calcPrediction — predicción de suministros', () => {
  test('null si hay 0 facturas del tipo', () => {
    expect(calcPrediction([], 'luz')).toBeNull();
  });

  test('null si solo hay 1 factura del tipo', () => {
    const fs = [{ tipo: 'luz', inicio: '2026-01-01', importe: 60 }];
    expect(calcPrediction(fs, 'luz')).toBeNull();
  });

  test('null si todos los gaps son ≤ 5 días', () => {
    const fs = [
      { tipo: 'luz', inicio: '2026-01-01', importe: 60 },
      { tipo: 'luz', inicio: '2026-01-02', importe: 60 }, // 1 día, ignorado
      { tipo: 'luz', inicio: '2026-01-03', importe: 60 }, // 1 día, ignorado
    ];
    expect(calcPrediction(fs, 'luz')).toBeNull();
  });

  test('calcula intervalo promedio de 30 días', () => {
    const fs = [
      { tipo: 'luz', inicio: '2026-01-01', importe: 60 },
      { tipo: 'luz', inicio: '2026-02-01', importe: 65 }, // 31 días
      { tipo: 'luz', inicio: '2026-03-03', importe: 70 }, // 30 días
    ];
    const result = calcPrediction(fs, 'luz');
    // promedio de 31 y 30 = 30.5 → redondeado a 31 o 30 según Math.round
    expect(result.avgDays).toBeGreaterThanOrEqual(30);
    expect(result.avgDays).toBeLessThanOrEqual(31);
  });

  test('calcula importe medio de últimas 3 facturas', () => {
    const fs = [
      { tipo: 'gas', inicio: '2026-01-01', importe: 50 },
      { tipo: 'gas', inicio: '2026-02-01', importe: 60 },
      { tipo: 'gas', inicio: '2026-03-01', importe: 70 },
    ];
    const result = calcPrediction(fs, 'gas');
    expect(result.avgImporte).toBe(60);
  });

  test('ignora facturas de otro tipo', () => {
    const fs = [
      { tipo: 'luz',  inicio: '2026-01-01', importe: 60 },
      { tipo: 'luz',  inicio: '2026-02-01', importe: 65 },
      { tipo: 'agua', inicio: '2026-01-01', importe: 30 }, // no cuenta
    ];
    const result = calcPrediction(fs, 'luz');
    expect(result).not.toBeNull();
    // importe medio es solo de luz
    expect(result.avgImporte).toBe(62.5);
  });

  test('nextDate es posterior a la última factura', () => {
    const fs = [
      { tipo: 'agua', inicio: '2026-01-01', importe: 20 },
      { tipo: 'agua', inicio: '2026-02-01', importe: 25 },
    ];
    const result = calcPrediction(fs, 'agua');
    expect(result.nextDate > '2026-02-01').toBe(true);
  });

  test('ignora gap de 2 días entre facturas (datos erróneos)', () => {
    const fs = [
      { tipo: 'luz', inicio: '2026-01-01', importe: 60 },
      { tipo: 'luz', inicio: '2026-01-02', importe: 60 }, // 1 día ← ignorado
      { tipo: 'luz', inicio: '2026-02-01', importe: 60 }, // 30 días ← válido
    ];
    const result = calcPrediction(fs, 'luz');
    expect(result.avgDays).toBe(30);
  });

  test('nextDate es formato YYYY-MM-DD', () => {
    const fs = [
      { tipo: 'gas', inicio: '2026-01-01', importe: 50 },
      { tipo: 'gas', inicio: '2026-02-01', importe: 60 },
    ];
    const result = calcPrediction(fs, 'gas');
    expect(result.nextDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─────────────────────────────────────────────────────────────────
// SHELF_LIFE — integridad de la tabla de vida útil
// ─────────────────────────────────────────────────────────────────
describe('SHELF_LIFE — tabla de vida útil correcta', () => {
  test('lácteos 7 días', () => expect(SHELF_LIFE.lacteos).toBe(7));
  test('carnes 3 días',  () => expect(SHELF_LIFE.carnes).toBe(3));
  test('pescados 2 días', () => expect(SHELF_LIFE.pescados).toBe(2));
  test('conservas 730 días', () => expect(SHELF_LIFE.conservas).toBe(730));
  test('pasta 365 días', () => expect(SHELF_LIFE.pasta).toBe(365));
  test('frutas 5 días',  () => expect(SHELF_LIFE.frutas).toBe(5));
  test('otros 30 días',  () => expect(SHELF_LIFE.otros).toBe(30));

  test('todos los valores son números positivos', () => {
    Object.values(SHELF_LIFE).forEach(v => {
      expect(typeof v).toBe('number');
      expect(v).toBeGreaterThan(0);
    });
  });

  test('contiene las categorías principales de despensa', () => {
    const required = ['lacteos', 'frutas', 'carnes', 'pescados', 'conservas', 'pasta', 'otros'];
    required.forEach(cat => expect(SHELF_LIFE).toHaveProperty(cat));
  });
});
