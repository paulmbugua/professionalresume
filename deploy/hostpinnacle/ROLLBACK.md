# Rollback

## Before DNS cutover

The existing Railway backend and Cloudflare-hosted web deployment remain the
production rollback targets. Do not delete or modify them during migration.

## DNS rollback

Reverse hostnames one at a time using the pre-cutover Cloudflare DNS snapshot:

1. Restore `server.professionalresume.co.ke` to its previous target and verify
   `/health`, OAuth callbacks, API requests, and payment callbacks.
2. Restore `www.professionalresume.co.ke`, then the apex hostname, and verify page
   navigation plus browser API calls.
3. Restore `admin.professionalresume.co.ke` if it existed before cutover.
4. Leave MX, SPF, DKIM, DMARC, mail, and verification records unchanged.

## Application rollback on the VPS

Set `IMAGE_TAG` in `.env` to the prior deployed Git short SHA and run:

```bash
docker compose --env-file .env -f compose.yml up -d --no-build
./scripts/verify.sh
```

## Database rollback

Stop write traffic before restoring a database backup. Validate the encrypted
backup in an isolated database with `scripts/restore-encrypted.sh` first. Never
restore over the live database without a new pre-restore snapshot.

The original Railway database remains intact for immediate platform rollback
until the VPS deployment has passed an agreed observation period.
