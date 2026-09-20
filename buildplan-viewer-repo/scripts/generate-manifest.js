#!/usr/bin/env node
/**
 * generate-manifest.js
 * 
 * Scans data/projects/ for .xml files, extracts the <Name> from each,
 * and writes data/manifest.json.
 *
 * Run: node scripts/generate-manifest.js
 */

const fs = require('fs');
const path = require('path');

const PROJECTS_DIR = path.join(__dirname, '..', 'data', 'projects');
const MANIFEST_PATH = path.join(__dirname, '..', 'data', 'manifest.json');

function extractProjectName(xmlPath) {
  // Read only the first 4KB to find <Name> without parsing the full file
  const fd = fs.openSync(xmlPath, 'r');
  const buf = Buffer.alloc(4096);
  fs.readSync(fd, buf, 0, 4096, 0);
  fs.closeSync(fd);

  const head = buf.toString('utf8');

  // Try namespace-prefixed or plain <Name>
  const match = head.match(/<(?:\w+:)?Name>(.*?)<\/(?:\w+:)?Name>/);
  return match ? match[1].trim() : path.basename(xmlPath, '.xml');
}

function main() {
  if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(PROJECTS_DIR)
    .filter(f => f.toLowerCase().endsWith('.xml'))
    .sort();

  const projects = files.map(file => {
    const fullPath = path.join(PROJECTS_DIR, file);
    const stat = fs.statSync(fullPath);
    return {
      file,
      name: extractProjectName(fullPath),
      lastModified: stat.mtime.toISOString(),
      sizeKB: Math.round(stat.size / 1024)
    };
  });

  const manifest = {
    generated: new Date().toISOString(),
    count: projects.length,
    projects
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`✓ manifest.json generated with ${projects.length} project(s)`);
}

main();
