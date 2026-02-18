# Login routing root cause (apps/web)

## Findings

1. `apps/web` is configured as a **Next.js App Router** app:
   - `package.json` scripts run `next dev|build|start` and depend on `next@14`.
   - `src/app` exists and contains route files (`page.tsx` pattern).
2. `next.config.mjs` does **not** define `pageExtensions`, so Next uses default extension handling and App Router route discovery from `src/app/**/page.*`.
3. `LoginPage.web.tsx` lives in `apps/web/src/pages/LoginPage.web.tsx`, which is a legacy screen location and is **not auto-routed** by App Router.
4. Root cause of `/login` 404: there was no guaranteed App Router wrapper contract for legacy screens. The login UI existed as a page-like component, but App Router requires `src/app/login/page.tsx` to resolve `/login`.

## Exact missing mapping that caused the issue

- URL: `/login`
- Required App Router file: `apps/web/src/app/login/page.tsx`
- Legacy screen: `apps/web/src/pages/LoginPage.web.tsx`

Without the wrapper, requests such as `/login?returnTo=%2Ftemplates` resolve to 404 because App Router ignores `src/pages/LoginPage.web.tsx` as a route source.

## Additional compatibility issue

Several page-like components in `src/pages/**` used `react-router-dom` APIs (`Link`, `useNavigate`, `useLocation`, `useParams`). These APIs are incompatible when rendered via Next App Router route wrappers and were refactored to Next equivalents (`next/link`, `next/navigation`).
