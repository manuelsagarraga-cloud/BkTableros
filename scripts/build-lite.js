#!/usr/bin/env node
/* Copia liviana de los XML para BuildPlan: quita <TimephasedData> (el detalle de trabajo día por día,
   ~70 % del peso) y los caracteres de control inválidos. BuildPlan no usa esa información.
   Los XML originales quedan intactos en data/projects/ (los sigue leyendo Cómputo de Obras).
   Uso: node scripts/build-lite.js <carpeta-destino>   (por defecto _site/data/projects-lite) */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'data', 'projects');
const DST = path.resolve(process.argv[2] || path.join(__dirname, '..', '_site', 'data', 'projects-lite'));

fs.mkdirSync(DST, { recursive: true });
let antes = 0, despues = 0;
for (const file of fs.readdirSync(SRC).filter(f => f.toLowerCase().endsWith('.xml'))) {
  const xml = fs.readFileSync(path.join(SRC, file), 'utf8');
  const lite = xml
    .replace(/\s*<TimephasedData>[\s\S]*?<\/TimephasedData>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ');
  fs.writeFileSync(path.join(DST, file), lite);
  antes += Buffer.byteLength(xml); despues += Buffer.byteLength(lite);
}
console.log(`XML livianos: ${(antes / 1e6).toFixed(1)} MB → ${(despues / 1e6).toFixed(1)} MB en ${DST}`);
