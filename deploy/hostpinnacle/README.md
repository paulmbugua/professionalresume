# HostPinnacle production deployment

This stack mirrors the Daybreak Learner isolation model. PostgreSQL and Redis are
reachable only on Docker's internal `data` network. The backend, web, and admin
services have no host port bindings and are reachable only through the dedicated
Cloudflare Tunnel on the `edge` network.

## Hostnames

- `professionalresume.co.ke` and `www.professionalresume.co.ke` -> `http://web:3000`
- `server.professionalresume.co.ke` -> `http://backend:4006`
- `admin.professionalresume.co.ke` -> `http://admin:8080`

## Required secret files

Create these files on the VPS with mode `0600`; never commit them:

- `.env` from `.env.example`
- `secrets/backend.env` from `secrets/backend.env.example`
- `secrets/backup.env` from `secrets/backup.env.example`
- `secrets/source.env` containing `SOURCE_DATABASE_URL` only during migration

## Build and private verification

```bash
cd /opt/apps/professionalresume/deploy/hostpinnacle
docker compose --env-file .env -f compose.yml build
docker compose --env-file .env -f compose.yml up -d postgres redis
./scripts/migrate-source-db.sh
docker compose --env-file .env -f compose.yml up -d backend web admin backup
./scripts/verify.sh
```

Start the tunnel only after private checks and Cloudflare public-hostname routes
are configured:

```bash
docker compose --env-file .env -f compose.yml --profile cutover up -d cloudflared
```

## Backups

The backup worker creates a PostgreSQL custom-format dump, restores it into an
isolated temporary database, encrypts it with `age`, writes a SHA-256 manifest,
uploads both files to S3-compatible off-server storage, and retains 14 local days.

Run and inspect an immediate backup:

```bash
docker compose --env-file .env -f compose.yml exec backup professionalresume-backup backup-now
docker compose --env-file .env -f compose.yml logs --tail=100 backup
```

Use `scripts/restore-encrypted.sh` to checksum, decrypt, and restore into an
isolated database. The private age identity must remain off-server.

## Updating

Deploy immutable Git revisions and retain the prior images:

```bash
git fetch origin
git checkout <commit>
export IMAGE_TAG=<short-commit>
docker compose --env-file .env -f compose.yml build
docker compose --env-file .env -f compose.yml up -d --remove-orphans
./scripts/verify.sh
```
