#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
compose=(docker compose --env-file .env -f compose.yml)

echo "Checking container health..."
"${compose[@]}" ps

required=(postgres redis backend web admin backup)
for service in "${required[@]}"; do
  cid="$("${compose[@]}" ps -q "$service")"
  if [[ -z "$cid" ]]; then
    echo "${service}: container missing" >&2
    exit 1
  fi
  status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")"
  if [[ "$status" != "healthy" && "$status" != "running" ]]; then
    echo "${service}: unhealthy (${status})" >&2
    exit 1
  fi
done

echo "Checking PostgreSQL and Redis..."
"${compose[@]}" exec -T postgres sh -c \
  'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atqc "select count(*) from pg_catalog.pg_tables where schemaname = '\''public'\''"' \
  | grep -Eq '^[1-9][0-9]*$'
"${compose[@]}" exec -T redis sh -c 'redis-cli -a "$REDIS_PASSWORD" ping' 2>/dev/null | grep -q PONG

echo "Checking private HTTP services..."
"${compose[@]}" exec -T backend node -e \
  "fetch('http://127.0.0.1:4006/health').then(async r=>{if(![200,207].includes(r.status))process.exit(1)}).catch(()=>process.exit(1))"
"${compose[@]}" exec -T web node -e \
  "fetch('http://127.0.0.1:3000/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
"${compose[@]}" exec -T admin wget -q --spider http://127.0.0.1:8080/healthz
"${compose[@]}" exec -T admin sh -c \
  "wget -qO- http://127.0.0.1:8080/a-route-that-does-not-exist | grep -qi '<!doctype html'"

echo "All private-stack checks passed."
