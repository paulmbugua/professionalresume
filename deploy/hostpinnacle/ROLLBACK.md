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

## Cloudflare Worker rollback

The previous `professionalresume` Worker was not deleted. Its two custom-domain
bindings were detached during cutover:

- `professionalresume.co.ke`: `406c585d1bddf2da497e6ce77eb70dcc419b198a`
- `www.professionalresume.co.ke`: `2ef7687c0413776f578248fbe501de9731a1b0b3`

To restore the web frontend, reattach both custom domains to the existing
`professionalresume` production Worker from Cloudflare. The active
`apps/web/wrangler.jsonc` intentionally has no production custom-domain routes,
so an ordinary Worker deployment cannot accidentally take traffic from the VPS.
Verify the Worker response before moving the backend hostname.

The active VPS tunnel is `professionalresume-hostpinnacle` with ID
`1fc8f67c-17b0-4ea9-b82e-ce9c1f3cfa26`. Do not delete it during rollback;
leave it available until the old web and API endpoints have been verified.

The prior Railway service and database were not deleted. Recover the previous
`server` DNS target from the Cloudflare DNS change history, restore that record,
and confirm `/health` before directing the Worker frontend back to it.
