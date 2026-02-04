# Templates blank render investigation

## Reproduction (before fix)
1. Start backend without a reachable Postgres instance.
2. Backend exits during startup probe.
3. Visit `http://localhost:3000/templates`.
4. `/api/cv/templates` fails with `ERR_EMPTY_RESPONSE`.
5. Templates page renders blank with no fallback UI.

## Expected behavior (after fix)
- Backend stays up in non-production even if DB is down.
- `/api/cv/templates` responds with `{ templates, source, fallback }`.
- Templates page falls back to local registry with visible messaging.
- Preview renders demo resume data when user draft is empty.

## Console errors (observed before fix)
- `🔴 [listCvTemplates] status/data: undefined undefined`
- `Failed to load resource: net::ERR_EMPTY_RESPONSE`

## Failing network calls (before fix)
- `GET http://localhost:4001/api/cv/templates` → `ERR_EMPTY_RESPONSE`

## Verification steps (after fix)
- Visit `/health` → expect `{ status: "degraded", db: { status: "down" } }` when DB is offline.
- Visit `/templates` → expect local templates list and fallback banner.
- Select a template → preview shows demo resume data if draft is empty.
