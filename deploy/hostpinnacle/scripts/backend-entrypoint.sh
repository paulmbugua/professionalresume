#!/usr/bin/env bash
set -Eeuo pipefail

mkdir -p \
  /workspace/apps/backend/logs \
  /workspace/apps/backend/uploads \
  /workspace/apps/backend/storage
chown -R node:node \
  /workspace/apps/backend/logs \
  /workspace/apps/backend/uploads \
  /workspace/apps/backend/storage

gosu node node scripts/runMigrations.js
exec gosu node node server.js
