import fs from 'node:fs/promises';
import path from 'node:path';

const expectedRoutes = ['/login', '/templates', '/builder', '/builder/new', '/profile'];
const APP_DIR = path.join(process.cwd(), 'src', 'app');
const PAGE_FILE = /^page\.(tsx|ts|jsx|js)$/;

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const routes: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('_')) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      routes.push(...(await walk(fullPath)));
      continue;
    }

    if (!PAGE_FILE.test(entry.name)) continue;

    const relDir = path.relative(APP_DIR, path.dirname(fullPath));
    const segments = relDir
      .split(path.sep)
      .filter(Boolean)
      .filter((segment) => !segment.startsWith('('))
      .filter((segment) => !segment.startsWith('@'));

    const route = `/${segments.join('/')}`.replace(/\/+/g, '/');
    routes.push(route === '/' ? '/' : route.replace(/\/$/, ''));
  }

  return routes;
}

export default async function RoutesDebugPage() {
  const routeList = Array.from(new Set(await walk(APP_DIR))).sort();
  const missing = expectedRoutes.filter((route) => !routeList.includes(route));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Route Debug</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-white/70">
        Detected app routes from <code>src/app/**/page.tsx</code>
      </p>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Detected routes</h2>
        <ul className="mt-3 space-y-1 font-mono text-sm">
          {routeList.map((route) => (
            <li key={route}>{route}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Expected routes</h2>
        <ul className="mt-3 space-y-1 font-mono text-sm">
          {expectedRoutes.map((route) => (
            <li key={route} className={missing.includes(route) ? 'text-rose-500' : 'text-emerald-600'}>
              {route} {missing.includes(route) ? '✗ missing' : '✓ present'}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
