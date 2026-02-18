<!--
Routing diagnosis:
- Framework: Next.js (apps/web/package.json uses next dev/build/start, dependency next@14)
- Router type: Next.js App Router (routes are in src/app/**/page.tsx)
- Route source of truth: src/app
- Dev port: localhost:3000 by default (next dev script, no explicit -p override)
-->

# Routing audit (apps/web)

## Summary

This audit standardizes routing on **Next.js App Router** and fixes the missing `/login` route that caused `GET /login?returnTo=%2Ftemplates 404`.

## Active routes and files

| Route | File |
|---|---|
| `/` | `src/app/page.tsx` |
| `/login` | `src/app/login/page.tsx` |
| `/templates` | `src/app/templates/page.tsx` |
| `/builder` | `src/app/builder/page.tsx` |
| `/builder/new` | `src/app/builder/new/page.tsx` |
| `/builder/[id]` | `src/app/builder/[id]/page.tsx` |
| `/routes-debug` | `src/app/routes-debug/page.tsx` |

## Guardrails added

- `src/lib/returnTo.ts` now normalizes and validates return paths to avoid open redirects.
- `scripts/verify-routes.mjs` validates required routes (`/login`, `/templates`, `/builder/new`) exist in `src/app/**/page.*`.
- `eslint.config.ts` disallows `react-router-dom` imports in `src/app/**` route files.

## Manual test steps

1. Start web app: `yarn workspace @mytutorapp/web dev`.
2. Open `http://localhost:3000/login` and confirm page renders (no 404).
3. Open `http://localhost:3000/templates` while logged out; confirm redirect to `/login?returnTo=%2Ftemplates`.
4. Open `http://localhost:3000/builder/new?templateId=ats-minimal` while logged out; confirm redirect to login with returnTo.
5. Log in and verify redirect returns to the intended path.
6. Open `http://localhost:3000/routes-debug` and confirm expected routes are present and not marked missing.
7. Confirm no 404 occurs for `/login`, `/templates`, `/builder/new` on localhost:3000.
