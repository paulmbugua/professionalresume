# Migration verification report

Date: 2026-10-23 UTC

## Private deployment

- Git revision built for the initial private deployment: `76471581`
- PostgreSQL 18 and Redis 7.4 run on an internal Docker network.
- Backend, web, and admin have no host port bindings.
- Backend `/health` reports `status: ok` and database `status: up`.
- Private web, API, admin health, and admin SPA routing checks pass.

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

Critical destination checks: 9 users, 7 completed payments, 6 entitlements,
and 18 document exports. The source uses Railway's managed `postgres` role. The
destination uses the dedicated login role `professionalresume`; application
objects were restored without source ownership or grants.

## Files and object storage

- The five original resume binaries are stored in PostgreSQL and migrated with
  the database.
- All 18 exported document public URLs returned successful HTTP responses.
- A temporary guest CV-photo upload passed presign, PUT, confirmation, and
  public-read checks with HTTP 200, then the test object was deleted.
- Persistent backend upload and storage volumes contain the packaged fonts,
  logo, and local fallback files.

## Backups

- A PostgreSQL custom-format backup restored into an isolated 12-table test
  database before encryption.
- The encrypted backup and SHA-256 manifest uploaded to off-server R2 storage.
- The uploaded artifacts were downloaded, checksum-verified, decrypted, and
  restored into a second isolated test database successfully.
- The age private identity is stored off-server in the user's OneDrive Documents
  folder and was removed from the VPS after the restore test.

## Pending cutover

- Export the complete Cloudflare zone through the API and compare it with the
  public DNS snapshot.
- Create the dedicated Cloudflare Tunnel and route the four application
  hostnames one at a time.
- Repeat the database import immediately before backend cutover.
- Complete production Google sign-in and browser workflow checks after public
  routing reaches the VPS.
