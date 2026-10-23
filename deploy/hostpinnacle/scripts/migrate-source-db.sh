#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
source_env="${1:-secrets/source.env}"
if [[ ! -f "$source_env" ]]; then
  echo "missing source credential file: $source_env" >&2
  exit 2
fi

set -a
source "$source_env"
set +a
: "${SOURCE_DATABASE_URL:?SOURCE_DATABASE_URL is required}"

compose=(docker compose --env-file .env -f compose.yml)
work="migration-work"
stamp="$(date -u +'%Y%m%dT%H%M%SZ')"
mkdir -p "$work"
chmod 0700 "$work"
dump="$work/source-${stamp}.dump"
source_counts="$work/source-${stamp}-counts.csv"
target_counts="$work/target-${stamp}-counts.csv"

cleanup() {
  unset SOURCE_DATABASE_URL
}
trap cleanup EXIT

echo "Capturing source counts and roles..."
docker run --rm -e DATABASE_URL="$SOURCE_DATABASE_URL" postgres:18-alpine sh -c '
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -At -F "|" -c "select tablename from pg_catalog.pg_tables where schemaname='\''public'\'' order by tablename" |
  while IFS= read -r table; do
    count=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atqc "select count(*)::bigint from \"$table\"")
    printf "%s|%s\n" "$table" "$count"
  done
' >"$source_counts"

echo "Creating source custom-format dump..."
docker run --rm -e DATABASE_URL="$SOURCE_DATABASE_URL" -v "$PWD/$work:/migration" postgres:18-alpine \
  sh -c "pg_dump \"\$DATABASE_URL\" --format=custom --compress=9 --no-owner --no-privileges --file=/migration/$(basename "$dump")"
docker run --rm -v "$PWD/$work:/migration" postgres:18-alpine \
  pg_restore --list "/migration/$(basename "$dump")" >/dev/null

echo "Restoring destination database..."
"${compose[@]}" stop backend >/dev/null 2>&1 || true
"${compose[@]}" exec -T postgres sh -c 'dropdb --if-exists -U "$POSTGRES_USER" "$POSTGRES_DB"; createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'
"${compose[@]}" exec -T postgres sh -c 'pg_restore --exit-on-error --no-owner --no-privileges -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <"$dump"

echo "Capturing destination counts..."
"${compose[@]}" exec -T postgres sh -c '
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -At -F "|" -c "select tablename from pg_catalog.pg_tables where schemaname='\''public'\'' order by tablename" |
  while IFS= read -r table; do
    count=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -Atqc "select count(*)::bigint from \"$table\"")
    printf "%s|%s\n" "$table" "$count"
  done
' >"$target_counts"

diff -u "$source_counts" "$target_counts"
echo "Source and destination table row counts match."
rm -f "$source_env"
echo "Removed temporary source database credentials."
