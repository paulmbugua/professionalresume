#!/usr/bin/env bash
set -Eeuo pipefail

psql -v ON_ERROR_STOP=1 -At -F '|' -c "
  select 'ROLE', rolname, rolsuper, rolcreaterole, rolcreatedb, rolcanlogin
  from pg_roles
  where rolname !~ '^pg_'
  order by rolname;
"

psql -v ON_ERROR_STOP=1 -Atqc "
  select quote_ident(schemaname) || '.' || quote_ident(tablename)
  from pg_catalog.pg_tables
  where schemaname = 'public'
  order by tablename;
" | while IFS= read -r table; do
  count="$(psql -v ON_ERROR_STOP=1 -Atqc "select count(*)::bigint from ${table}")"
  printf 'TABLE|%s|%s\n' "$table" "$count"
done
