# Migration verification report

Date: 2026-10-23 UTC

Production cutover status: complete

## Private deployment

- Git revision deployed: `5c5d83e6`
- PostgreSQL 18 and Redis 7.4 run on an internal Docker network.
- Backend, web, and admin have no host port bindings.
- Backend `/health` reports `status: ok` and database `status: up`.
- Private web, API, admin health, and admin SPA routing checks pass.
- PostgreSQL, Redis, web, backend, and admin are healthy. The backup worker and
  Cloudflare Tunnel are running under `restart: unless-stopped`.
- External probes confirmed that ports 3000, 4006, 5432, 6379, and 8080 are
  not publicly reachable on the VPS.

## Database comparison

The validated source and destination snapshot contains 12 public tables and 107
rows. Source and destination row counts matched exactly at import time:

| Table | Rows |
| --- | ---: |
| `ai_lab_chunks` | 0 |
| `ai_lab_documents` | 0 |
| `cover_letter_drafts` | 2 |
| `cv_drafts` | 30 |
| `cv_payments` | 8 |
| `cv_templates` | 23 |
| `document_exports` | 18 |
| `generated_resume_versions` | 1 |
| `original_resume_documents` | 5 |
| `original_resume_files` | 5 |
| `user_entitlements` | 6 |
| `users` | 9 |

Critical destination checks: 9 users, 30 active CV drafts, 2 active cover-letter
drafts, 7 completed payments, 6 entitlements, 18 document exports, and 5
original resume files. The source uses Railway's managed `postgres` role. The
destination uses the dedicated login role `professionalresume`; application
objects were restored without source ownership or grants.

The final source snapshot was taken at `2026-10-23T20:53:14Z`, immediately
before the API hostname moved to the VPS. Source and destination table and
critical-record reports matched exactly. The migration helper then removed the
plaintext dump and temporary source credential file.

## Files and object storage

- The five original resume binaries are stored in PostgreSQL and migrated with
  the database.
- All 18 exported document public URLs returned successful HTTP responses.
- A temporary guest CV-photo upload through the public VPS API passed presign,
  PUT, confirmation, and public-read checks with HTTP 200, then the test object
  was deleted.
- Persistent backend upload and storage volumes contain the packaged fonts,
  logo, and local fallback files.

## Backups

- The post-cutover backup `20261023T205625Z` restored into an isolated 12-table
  test database before encryption.
- The encrypted backup and SHA-256 manifest uploaded to off-server R2 storage.
- The uploaded artifacts were downloaded, checksum-verified, decrypted, and
  restored into a second isolated test database successfully.
- The age private identity is stored off-server in the user's OneDrive Documents
  folder and was removed from the VPS after the restore test.

## Cloudflare cutover

- Dedicated tunnel: `professionalresume-hostpinnacle`
  (`1fc8f67c-17b0-4ea9-b82e-ce9c1f3cfa26`).
- Tunnel status is healthy with four active connectors.
- `professionalresume.co.ke` and `www.professionalresume.co.ke` route to web.
- `server.professionalresume.co.ke` routes to backend port 4006.
- `admin.professionalresume.co.ke` routes to admin port 8080.
- The prior `professionalresume` Worker remains deployed for rollback. Its apex
  and `www` custom-domain bindings were detached after their identifiers were
  recorded in `ROLLBACK.md`.
- A public DNS snapshot was captured before cutover. Only the four application
  hostnames were provisioned; mail and verification records were not edited.

## Public verification

- Apex, `www`, admin, templates, ATS checker, career resources, and login routes
  return HTTP 200 through Cloudflare.
- All 19 JavaScript/CSS asset URLs in the public `www` response exactly match
  the assets served by the VPS web container.
- Public backend `/health` returns HTTP 200 with database status `up`.
- Production CORS preflight returns HTTP 204 and allows
  `https://www.professionalresume.co.ke`.
- Google OAuth initiation returns HTTP 302 to Google with callback
  `https://server.professionalresume.co.ke/api/auth/google/callback`.
- Payment configuration returns the expected M-Pesa amount of Ksh 100 and
  Paystack amount of Ksh 130.

## Remaining interactive checks

- Complete one production Google sign-in to exercise the user-controlled Google
  consent screen and callback exchange.
- Run one real M-Pesa or Paystack payment before relying on a paid transaction;
  do not create a charge as an infrastructure test.
- Exercise authenticated resume generation/export and cover-letter export with
  a designated test account. These workflows can consume AI or payment services
  and were intentionally not triggered by the migration scripts.
