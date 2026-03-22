#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcDir = path.join(root, 'src');
const appDir = path.join(srcDir, 'app');

const PAGE_RE = /^page\.(tsx|ts|jsx|js)$/;
const TARGET_PATHS = [
  '/login',
  '/templates',
  '/builder/new',
  '/cover-letters',
  '/cover-letters/new',
  '/cover-letters/[id]',
];

function walkFiles(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, results);
    } else {
      results.push(full);
    }
  }
  return results;
}

function collectAppRoutes() {
  const files = walkFiles(appDir).filter((file) => PAGE_RE.test(path.basename(file)));

  return new Set(
    files.map((file) => {
      const relDir = path.relative(appDir, path.dirname(file));
      const segments = relDir
        .split(path.sep)
        .filter(Boolean)
        .filter((segment) => !segment.startsWith('('))
        .filter((segment) => !segment.startsWith('@'));
      const route = `/${segments.join('/')}`.replace(/\/+/g, '/');
      return route === '/' ? '/' : route.replace(/\/$/, '');
    }),
  );
}

function collectRouteReferences() {
  const files = walkFiles(srcDir).filter((file) => /\.(tsx|ts|jsx|js)$/.test(file));
  const refs = new Set();

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const quotedRoutes = content.match(/['"`]\/[A-Za-z0-9_\-/?=&%]*['"`]/g) || [];

    for (const raw of quotedRoutes) {
      const route = raw.slice(1, -1).split('?')[0];
      if (TARGET_PATHS.includes(route)) {
        refs.add(route);
      }
    }
  }

  return refs;
}

const routes = collectAppRoutes();
const referenced = collectRouteReferences();
const required = Array.from(new Set([...TARGET_PATHS, ...referenced]));
const missing = required.filter((route) => !routes.has(route));

if (missing.length > 0) {
  console.error('Missing route files for:', missing.join(', '));
  console.error('Detected routes:', Array.from(routes).sort().join(', '));
  process.exit(1);
}

console.log('verify:routes OK');
console.log('Detected routes:', Array.from(routes).sort().join(', '));
