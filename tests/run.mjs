// Pruebas de buildplan.html antes de publicar. Si algo falla, el Action corta y no se publica.
//   1. El JSX compila (un error de sintaxis deja la página en blanco).
//   2. El lector de MS Project y el semáforo dan los números esperados con un cronograma de prueba sintético.
//   3. Los directores de obra se reconocen como en la tabla de Supabase.
// Uso: npm i --no-save @babel/standalone@7.23.9 @xmldom/xmldom@0.8.10 && node tests/run.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Babel = require('@babel/standalone');
const { DOMParser } = require('@xmldom/xmldom');
// xmldom no hace iterables sus listas de nodos; el navegador sí
{ const nl = new DOMParser().parseFromString('<a/>', 'text/xml').getElementsByTagName('a');
  for (let pr = Object.getPrototypeOf(nl); pr && pr !== Object.prototype; pr = Object.getPrototypeOf(pr))
    if (!pr[Symbol.iterator]) pr[Symbol.iterator] = function* () { for (let i = 0; i < this.length; i++) yield this[i]; }; }

const dir = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(dir, '..', 'buildplan.html'), 'utf8');
let fallas = 0;
const ok = (cond, msg, got) => { if (cond) console.log('  ✓ ' + msg); else { fallas++; console.log('  ✗ ' + msg + (got !== undefined ? '  → obtuvo: ' + JSON.stringify(got) : '')); } };

// ── 1. Compilación ──
console.log('Compilación');
const scripts = [...html.matchAll(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
ok(scripts.length > 0, 'hay script JSX');
let code = '';
for (const s of scripts) {
  try { code += Babel.transform(s, { presets: ['react'] }).code + '\n'; ok(true, `compila (${Math.round(s.length / 1024)} KB)`); }
  catch (e) { ok(false, 'compila: ' + e.message.split('\n')[0]); }
}
if (fallas) { console.log(`\n${fallas} prueba(s) fallaron`); process.exit(1); }

// ── Extrae solo las funciones y constantes puras que se prueban (no corre React) ──
function pieza(nombre) {
  const re = new RegExp('(^|\\n)((?:const|let|function) ' + nombre.replace(/[$]/g, '\\$') + '\\b)');
  const m = re.exec(code);
  if (!m) throw new Error('no encontré ' + nombre + ' en buildplan.html');
  const ini = m.index + m[1].length;
  // recorre hasta cerrar llaves/corchetes del bloque de nivel superior
  let i = code.indexOf(m[2], ini) + m[2].length, prof = 0, par = 0, empezo = false, str = null;
  for (; i < code.length; i++) {
    const c = code[i];
    if (str) { if (c === '\\') { i++; continue } if (c === str) str = null; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; continue; }
    if (c === '/' && code[i + 1] === '/') { i = code.indexOf('\n', i); continue; }
    if (c === '/' && code[i + 1] === '*') { i = code.indexOf('*/', i + 2) + 1; continue; }
    if (c === '(') { par++; continue; }
    if (c === ')') { par--; continue; }
    if (c === '{' || c === '[') { prof++; empezo = true; }
    else if (c === '}' || c === ']') { prof--; if (empezo && prof === 0 && par === 0) { i++; break; } }
    else if (c === ';' && prof === 0 && par === 0) { i++; break; }
    else if (c === '\n' && empezo && prof === 0) break;
  }
  return code.slice(ini, i).replace(/^let /, 'var ');
}
const nombres = ['FID_TEXTO4', 'ENT', 'entV', 'countItems', 'findObraRoot', 'classifyAlcance', 'parseMSPDI',
  'isOv', 'STALE_DAYS', 'isStale', 'wAvg', 'isCtrlTask', 'SEMA_LBL', 'SEV', 'DESVIO_MAX', 'calcHealth',
  'normName', 'DIRECTORES', 'setDirectores', 'dirKey', 'dirNombre'];
const piezas = nombres.map(pieza); if (process.env.DEBUG) piezas.forEach((p, k) => console.log(nombres[k], p.length, JSON.stringify(p.slice(-40))));
const fuente = piezas.join(';\n');

// Reloj fijo: "hoy" es 29/10/2026, para que los resultados no cambien con la fecha
const RealDate = Date, HOY = new RealDate('2026-10-29T12:00:00').getTime();
class FakeDate extends RealDate { constructor(...a) { a.length ? super(...a) : super(HOY); } static now() { return HOY; } }
const api = new Function('Date', 'DOMParser', 'console',
  fuente + ';\nreturn {parseMSPDI,calcHealth,dirKey,setDirectores,dirNombre};')(FakeDate, DOMParser, { warn() {}, log() {} });

// ── 2. Lector de MS Project y semáforo ──
console.log('Lector MS Project');
const d = api.parseMSPDI(fs.readFileSync(path.join(dir, 'fixtures', 'obra-prueba.xml'), 'utf8'));
const hojas = d.tasks.filter(t => !t.isSummary);
ok(d.tasks.length === 8, '8 tareas leídas (la UID 0 del proyecto se descarta)', d.tasks.length);
ok(hojas.length === 7, '7 tareas sin resumen', hojas.length);
ok(d.statusDate && d.statusDate.toISOString().startsWith('2026-10-20'), 'fecha de estado 20/10/2026', d.statusDate);
ok(JSON.stringify(d.contractors) === JSON.stringify(['Constructora Uno', 'Instal SRL', 'Pinturas Sur']), 'contratistas desde el campo enterprise Contratista', d.contractors);
const mamp = d.tasks.find(t => t.name === 'Mampostería');
ok(mamp && mamp.ent['N° Item']?.value === '2.01', 'N° Item (Texto4)', mamp?.ent['N° Item']);
ok(mamp && mamp.baselines[0]?.finish?.toISOString().startsWith('2026-09-15'), 'línea base', mamp?.baselines[0]);
ok(mamp && mamp.resources.includes('Alexandra Arevalo'), 'recursos asignados', mamp?.resources);
ok(mamp && mamp.parent?.name === 'Obra', 'jerarquía (padre = Obra)', mamp?.parent?.name);

console.log('Semáforo y avance');
const h = api.calcHealth(d);
ok(h.contratadaName === 'Fecha contratada', 'encuentra la tarea "contratada"', h.contratadaName);
ok(h.obraName === 'Obra', 'encuentra la tarea de obra', h.obraName);
ok(h.standbyDays === 10, 'standby 10 días', h.standbyDays);
ok(h.desvioBruto === 10 && h.desvioNeto === 0, 'desvío bruto +10, neto 0', [h.desvioBruto, h.desvioNeto]);
ok(h.ov === 1, '1 vencida (Mampostería)', h.ov);
ok(h.color === 'y' && h.label === 'Atención', 'semáforo Atención (14 % vencidas, plazo ok)', [h.color, h.label]);
ok(h.espSrc === 'línea base', 'plan contra línea base', h.espSrc);
ok(typeof h.esp === 'number' && h.esp > h.avg, 'plan a hoy mayor que el real', [h.esp, h.avg]);
ok(h.delays.length === 1 && h.delays[0].name === 'Mampostería' && h.delays[0].late === 28 && h.delays[0].con === 'Constructora Uno',
  'demoras: Mampostería, 28 d, Constructora Uno', h.delays);

// ── 3. Directores ──
console.log('Directores de obra');
api.setDirectores([{ nombre: 'Alexandra Arevalo', variantes: ['alex'] }, { nombre: 'Mariana Valdez', variantes: ['mariana'] }]);
ok(api.dirKey('Alexandra Arevalo') === 'alexandra arevalo', 'Alexandra Arevalo');
ok(api.dirKey('ALEXANDRA') === 'alexandra arevalo', 'variante "alex" toma Alexandra');
ok(api.dirKey('Mariana V') === 'mariana valdez', 'Mariana V → Mariana Valdez');
ok(api.dirKey('Juan Pérez') === null, 'Juan Pérez no es director');
ok(api.dirNombre('mariana valdez') === 'Mariana Valdez', 'nombre para mostrar');

console.log(fallas ? `\n${fallas} prueba(s) fallaron — no se publica` : '\nTodo OK');
process.exit(fallas ? 1 : 0);
