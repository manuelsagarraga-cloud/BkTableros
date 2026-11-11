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
  'isAnulada', 'FIN_OBRA_RE', 'DEMORA_RE', 'CAUSA_RE', 'POSVENTA_RE', 'isDemoraTask', 'cleanName', 'calcPorque', 'fmtPlazo', 'extTxt',
  'normName', 'DIRECTORES', 'setDirectores', 'dirKey', 'dirNombre', 'dB', 'META_TOL', 'metaRef', 'metaResolve', 'metaLeaves', 'calcMeta', 'nextMeta', 'enProyecto'];
const piezas = nombres.map(pieza); if (process.env.DEBUG) piezas.forEach((p, k) => console.log(nombres[k], p.length, JSON.stringify(p.slice(-40))));
const fuente = piezas.join(';\n');

// Reloj fijo: "hoy" es 29/10/2026, para que los resultados no cambien con la fecha
const RealDate = Date, HOY = new RealDate('2026-10-29T12:00:00').getTime();
class FakeDate extends RealDate { constructor(...a) { a.length ? super(...a) : super(HOY); } static now() { return HOY; } }
const api = new Function('Date', 'DOMParser', 'console',
  fuente + ';\nreturn {parseMSPDI,calcHealth,isOv,fmtPlazo,extTxt,dirKey,setDirectores,dirNombre,calcMeta,nextMeta,metaRef,enProyecto};')(FakeDate, DOMParser, { warn() {}, log() {} });

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

console.log('Extensión y por qué');
ok(h.ext === 10 && /Fin de obra/.test(h.finSrc), 'extensión +10 d contra el hito "Fin de obra"', [h.ext, h.finSrc]);
ok(api.extTxt(10) === 'Se extendió 10 días' && api.extTxt(84) === 'Se extendió 2,8 meses' && api.extTxt(-43) === '43 días antes de lo contratado' && api.extTxt(0) === 'En la fecha contratada',
  'extensión en palabras', [api.extTxt(10), api.extTxt(84), api.extTxt(-43), api.extTxt(0)]);
const pq = h.porque;
ok(pq.demoras.length === 1 && pq.demoras[0].name === 'Stand by lluvias' && pq.demoras[0].days === 7, 'demora cargada: Stand by lluvias, 7 d hábiles', pq.demoras);
ok(pq.notas.length === 1 && pq.notas[0].name === 'Mampostería' && /materiales/.test(pq.notas[0].note), 'nota de MS Project que explica una causa', pq.notas);
ok(pq.estirones.length === 2 && pq.estirones[0].name === 'Mampostería' && pq.estirones[0].orig === 55 && pq.estirones[0].act === 65 && pq.estirones[1].name === 'Instalaciones' && pq.estirones[1].delta === 4,
  'lo que más se estiró: Mampostería 55→65, Instalaciones +4', pq.estirones.map(x => [x.name, x.orig, x.act]));
ok(pq.finales[0]?.name === 'Pintura', 'define el final: Pintura', pq.finales[0]);
{ const past = new Date('2026-09-01'), base = { finish: past, percentComplete: 0, isSummary: false };
  ok(!api.isOv({ ...base, name: 'X C2- Cielorraso aplicado' }) && !api.isOv({ ...base, name: '✔X Revoque' }) && api.isOv({ ...base, name: 'Xilografía' }) && api.isOv({ ...base, name: 'Revoque' }),
    'tareas anuladas (X …) no cuentan como vencidas'); }

// ── 3. Directores ──
console.log('Directores de obra');
api.setDirectores([{ nombre: 'Alexandra Arevalo', variantes: ['alex'] }, { nombre: 'Mariana Valdez', variantes: ['mariana'] }]);
ok(api.dirKey('Alexandra Arevalo') === 'alexandra arevalo', 'Alexandra Arevalo');
ok(api.dirKey('ALEXANDRA') === 'alexandra arevalo', 'variante "alex" toma Alexandra');
ok(api.dirKey('Mariana V') === 'mariana valdez', 'Mariana V → Mariana Valdez');
ok(api.dirKey('Juan Pérez') === null, 'Juan Pérez no es director');
ok(api.dirNombre('mariana valdez') === 'Mariana Valdez', 'nombre para mostrar');

// ── 4. Metas internas por tareas del cronograma ──
console.log('Metas internas');
{
  const F = s => new Date(s + 'T17:00:00');
  let uid = 1; const all = [];
  const T = (name, fin, pc, parent = null, extra = {}) => { const t = { uid: String(uid++), name, wbs: '', isSummary: false, isMilestone: false, ent: {}, finish: F(fin), percentComplete: pc, durDays: 10, children: [], parent, ...extra }; if (parent) parent.children.push(t); all.push(t); return t; };
  const S = (name, parent = null) => T(name, '2000-01-01', 0, parent, { isSummary: true });
  const obra = S('Obra'), est = S('Estructura', obra), mam = S('Mampostería', obra), term = S('Terminaciones', obra);
  T('Columnas PB', '2026-11-10', 100, est); T('Losa', '2026-12-20', 30, est); T('Hito losa', '2027-06-01', 0, est, { isMilestone: true });
  T('Muros PB', '2026-12-05', 0, mam); T('Muros PA', '2027-01-15', 0, mam);
  T('Piso', '2028-03-01', 0, term);
  const hojas = x => x.isSummary ? x.children.flatMap(hojas) : [x];
  for (const s of [est, mam, term, obra]) s.finish = new Date(Math.max(...hojas(s).filter(x => !x.isMilestone).map(x => x.finish)));
  const data = { tasks: all, uidMap: Object.fromEntries(all.map(t => [t.uid, t])) };
  const M = (ts, fecha, extra = {}) => api.calcMeta({ nombre: 'x', tareas: ts.map(api.metaRef), fecha, suspendida: false, ...extra }, data);
  let r = M([est], '2026-12-31');
  ok(r.sel.length === 1 && r.n === 2 && r.st === 'ok' && r.desvio === -11, 'macrotarea Estructura en fecha, 11 d de margen (el hito no cuenta)', [r.n, r.st, r.desvio]);
  r = M([est, mam], '2026-12-31');
  ok(r.st === 'atn' && r.desvio === 15 && r.empujan[0].name === 'Muros PA', 'dos macrotareas: Mampostería empuja +15 d = atención', [r.st, r.desvio, r.empujan.map(t => t.name)]);
  r = M([mam], '2026-12-20');
  ok(r.st === 'riesgo' && r.desvio === 26, '+26 d = en riesgo', [r.st, r.desvio]);
  r = M([est], '2026-10-25');
  ok(r.st === 'venc', 'fecha pasada y sin terminar = vencida', r.st);
  r = M([est], '2026-10-25', { suspendida: true });
  ok(r.st === 'susp', 'suspendida no cuenta como atrasada', r.st);
  r = M([est], null);
  ok(r.st === 'sinf', 'sin fecha', r.st);
  r = api.calcMeta({ tareas: [{ uid: '999', nombre: 'Mampostería', wbs: '' }], fecha: '2027-02-01' }, data);
  ok(r.sel[0] === mam && r.st === 'ok', 'si el UID no está, la encuentra por nombre', [r.sel.map(t => t.name), r.st]);
  r = api.calcMeta({ tareas: [{ uid: mam.uid, nombre: 'Mamposteria vieja', wbs: '' }], fecha: '2027-02-01' }, data);
  ok(r.sel[0] === mam, 'si la renombraron en MS Project, la mantiene por UID', r.sel.map(t => t.name));
  r = api.calcMeta({ tareas: [{ uid: '999', nombre: 'Pintura', wbs: '' }], fecha: '2027-02-01' }, data);
  ok(r.st === 'vacia' && r.faltan[0] === 'Pintura', 'tarea que ya no está en el cronograma', [r.st, r.faltan]);
  { const sm = { uid: '1', name: 'E', isSummary: true, isMilestone: false, children: [], percentComplete: 100, finish: F('2026-11-20') };
    const a1 = { uid: '2', name: 'a', isSummary: false, isMilestone: false, children: [], percentComplete: 100, finish: F('2026-11-20'), durDays: 3, parent: sm }; sm.children.push(a1);
    r = api.calcMeta({ tareas: [{ uid: '1', nombre: 'E' }], fecha: '2026-11-15' }, { tasks: [sm, a1], uidMap: { 1: sm, 2: a1 } });
    ok(r.st === 'tarde' && r.desvio === 5, 'terminada después de la fecha: lista con atraso', [r.st, r.desvio]); }
  const metas = [{ nombre: 'Piso', tareas: [api.metaRef(term)], fecha: '2028-03-15' }, { nombre: 'Obra gris', tareas: [api.metaRef(est), api.metaRef(mam)], fecha: '2026-12-31' }, { nombre: 'Frenada', tareas: [api.metaRef(mam)], fecha: '2026-11-05', suspendida: true }];
  const nm = api.nextMeta(metas, data);
  ok(nm && nm.m.nombre === 'Obra gris', 'próxima meta = la más cercana pendiente (salta suspendidas y la de 2028)', nm && nm.m.nombre);
}

// ── 5. Etapa: proyecto u obra (columna Ciclo de Vida) ──
console.log('Proyecto u obra');
for (const [cv, esp] of [['Proyecto', true], ['2-En Proyecto', true], ['en proyecto', true], ['Obra', false], ['', false], ['Proyecto y obra', false]])
  ok(api.enProyecto({ cicloVida: cv }) === esp, `Ciclo de Vida "${cv}" → ${esp ? 'En proyecto' : 'Obra'}`);
ok(api.enProyecto(null) === false, 'sin fila en el Excel → obra');

console.log(fallas ? `\n${fallas} prueba(s) fallaron — no se publica` : '\nTodo OK');
process.exit(fallas ? 1 : 0);
