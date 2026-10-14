#!/usr/bin/env node
/* Genera data/manifest.json a partir de los XML de MS Project en data/projects/.
   - hash: huella del contenido. BuildPlan la usa como versión (?v=hash) para que el navegador
     reutilice lo que ya bajó y solo vuelva a descargar un XML cuando realmente cambió.
   - avisos: controles de calidad de cada cronograma (no frenan el deploy, quedan a la vista). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PROJECTS_DIR = path.join(__dirname, '..', 'data', 'projects');
const MANIFEST_PATH = path.join(__dirname, '..', 'data', 'manifest.json');

const CTRL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F]/g;

function revisar(xml) {
  const avisos = [];
  const ctrl = (xml.match(CTRL_CHARS) || []).length;
  if (ctrl) avisos.push(`${ctrl} carácter(es) inválido(s) en el XML (se limpian al leer)`);
  const tareas = xml.split('<Task>').slice(1).map(t => t.split('</Task>')[0]);
  const reales = tareas.filter(t => !/<UID>0<\/UID>/.test(t));
  const hojas = reales.filter(t => !/<Summary>1<\/Summary>/.test(t));
  const sinNombre = reales.filter(t => !/<Name>[^<]*\S[^<]*<\/Name>/.test(t)).length;
  if (sinNombre) avisos.push(`${sinNombre} tarea(s) sin nombre`);
  if (hojas.length) {
    const conLB = hojas.filter(t => t.includes('<Baseline>')).length;
    if (conLB === 0) avisos.push('sin línea base');
    else if (conLB < hojas.length * 0.8) avisos.push(`línea base solo en ${Math.round(100 * conLB / hojas.length)}% de las tareas`);
  }
  return { tareas: hojas.length, avisos };
}

function nombreProyecto(xml, file) {
  const m = xml.slice(0, 4096).match(/<(?:\w+:)?Name>(.*?)<\/(?:\w+:)?Name>/);
  return m ? m[1].trim() : path.basename(file, '.xml');
}

function main() {
  if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  const files = fs.readdirSync(PROJECTS_DIR).filter(f => f.toLowerCase().endsWith('.xml')).sort();
  const projects = files.map(file => {
    const fullPath = path.join(PROJECTS_DIR, file);
    const buf = fs.readFileSync(fullPath);
    const xml = buf.toString('utf8');
    const { tareas, avisos } = revisar(xml);
    if (/^VI[a-z]/.test(file)) avisos.push('el nombre del archivo empieza con "VI" mayúscula');
    return {
      file,
      name: nombreProyecto(xml, file),
      hash: crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12),
      sizeKB: Math.round(buf.length / 1024),
      tareas,
      avisos
    };
  });
  const manifest = { generated: new Date().toISOString(), count: projects.length, projects };
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`manifest.json generado con ${projects.length} proyecto(s)`);
  for (const p of projects) if (p.avisos.length) console.log(`::warning title=${p.file}::${p.avisos.join(' · ')}`);
}

main();
