#!/usr/bin/env bash
set -Eeuo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 <backup.dump.age> <age-private-key-file>" >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
encrypted="$1"
identity="$2"
compose=(docker compose --env-file .env -f compose.yml)
temp_dir="$(mktemp -d)"
temp_dump="${temp_dir}/restore.dump"
test_db=""

cleanup() {
  if [[ -n "$test_db" ]]; then
    "${compose[@]}" exec -T postgres sh -c \
      "dropdb --if-exists -U \"\$POSTGRES_USER\" '$test_db'" >/dev/null 2>&1 || true
  fi
  rm -rf "$temp_dir"
}
trap cleanup EXIT

(
  cd "$(dirname "$encrypted")"
  sha256sum -c "$(basename "${encrypted}.sha256")"
)
"${compose[@]}" run --rm --no-deps \
  -v "$(realpath "$encrypted"):/restore/source.dump.age:ro" \
  -v "$(realpath "$identity"):/restore/identity.txt:ro" \
  -v "$temp_dir:/restore/output" \
  --entrypoint sh backup \
  -c 'age --decrypt --identity /restore/identity.txt --output /restore/output/restore.dump /restore/source.dump.age'
docker run --rm -i postgres:18-alpine pg_restore --list <"$temp_dump" >/dev/null

test_db="${POSTGRES_DB:-professional_resume}_manual_restore_test_$(date -u +%s)"
"${compose[@]}" exec -T postgres sh -c "createdb -U \"\$POSTGRES_USER\" '$test_db'"
"${compose[@]}" exec -T postgres sh -c \
  "pg_restore --exit-on-error --no-owner --no-privileges -U \"\$POSTGRES_USER\" -d '$test_db'" \
  <"$temp_dump"
"${compose[@]}" exec -T postgres sh -c \
  "psql -U \"\$POSTGRES_USER\" -d '$test_db' -Atqc \"select count(*) from pg_catalog.pg_tables where schemaname='public'\"" \
  | grep -Eq '^[1-9][0-9]*$'
echo "Encrypted backup restored successfully into isolated database ${test_db}."
