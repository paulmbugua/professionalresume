#!/usr/bin/env bash
set -Eeuo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_LOCAL_RETENTION_DAYS:-14}"
SCHEDULE_UTC="${BACKUP_SCHEDULE_UTC:-01:30}"

log() {
  printf '%s [backup] %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    log "required variable is missing: ${name}"
    return 1
  fi
}

restore_test() {
  local dump_path="$1"
  local test_db="${PGDATABASE}_restore_test_$(date -u +%s)"
  log "starting isolated restore test"
  createdb --maintenance-db=postgres "$test_db"
  trap 'dropdb --if-exists --maintenance-db=postgres "$test_db" >/dev/null 2>&1 || true' RETURN
  pg_restore --exit-on-error --no-owner --no-privileges --dbname="$test_db" "$dump_path"
  local table_count
  table_count="$(psql --dbname="$test_db" -Atqc "select count(*) from pg_catalog.pg_tables where schemaname='public'")"
  if [[ ! "$table_count" =~ ^[0-9]+$ ]] || (( table_count == 0 )); then
    log "restore test failed: restored database contains no public tables"
    return 1
  fi
  log "restore test passed (${table_count} public tables)"
  dropdb --if-exists --maintenance-db=postgres "$test_db"
  trap - RETURN
}

upload_backup() {
  local encrypted_path="$1"
  local manifest_path="$2"
  require_env BACKUP_S3_BUCKET
  require_env BACKUP_S3_ENDPOINT
  local prefix="${BACKUP_S3_PREFIX:-professionalresume/postgres}"
  local target="s3://${BACKUP_S3_BUCKET}/${prefix}/"
  aws --endpoint-url "$BACKUP_S3_ENDPOINT" s3 cp "$encrypted_path" "$target" --only-show-errors
  aws --endpoint-url "$BACKUP_S3_ENDPOINT" s3 cp "$manifest_path" "$target" --only-show-errors
  log "encrypted backup and checksum uploaded off-server"
}

backup_now() {
  require_env BACKUP_AGE_RECIPIENT
  mkdir -p "$BACKUP_DIR"
  local stamp base temp_dump encrypted manifest
  stamp="$(date -u +'%Y%m%dT%H%M%SZ')"
  base="professionalresume-${PGDATABASE}-${stamp}"
  temp_dump="/tmp/${base}.dump"
  encrypted="${BACKUP_DIR}/${base}.dump.age"
  manifest="${encrypted}.sha256"
  trap 'rm -f "$temp_dump"' EXIT

  log "creating consistent PostgreSQL custom-format backup"
  pg_dump --format=custom --compress=9 --no-owner --no-privileges --file="$temp_dump"
  pg_restore --list "$temp_dump" >/dev/null
  restore_test "$temp_dump"

  age --recipient "$BACKUP_AGE_RECIPIENT" --output "$encrypted" "$temp_dump"
  (
    cd "$BACKUP_DIR"
    sha256sum "$(basename "$encrypted")" >"$(basename "$manifest")"
  )
  chmod 0600 "$encrypted" "$manifest"
  rm -f "$temp_dump"
  trap - EXIT

  upload_backup "$encrypted" "$manifest"
  find "$BACKUP_DIR" -type f \( -name '*.dump.age' -o -name '*.sha256' \) -mtime "+${RETENTION_DAYS}" -delete
  log "backup completed"
}

seconds_until_schedule() {
  local now target
  now="$(date -u +%s)"
  target="$(date -u -d "today ${SCHEDULE_UTC}" +%s)"
  if (( target <= now )); then
    target="$(date -u -d "tomorrow ${SCHEDULE_UTC}" +%s)"
  fi
  echo $((target - now))
}

case "${1:-daemon}" in
  backup-now)
    backup_now
    ;;
  daemon)
    while true; do
      wait_seconds="$(seconds_until_schedule)"
      log "next backup scheduled in ${wait_seconds}s"
      sleep "$wait_seconds"
      backup_now || log "backup failed; retrying at the next scheduled run"
    done
    ;;
  *)
    echo "usage: professionalresume-backup [daemon|backup-now]" >&2
    exit 2
    ;;
esac
