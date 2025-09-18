param(
  [string]$LocalUrl  = $env:LOCAL_URL,
  [string]$RemoteUrl = $env:RAILWAY_URL,
  [switch]$DropPublic = $true,
  [int]$Jobs = 4,

  # Delta mode: list new tables to push (schema + data)
  [string[]]$Tables = @(),
  [switch]$Delta
)

if (-not $LocalUrl -or -not $RemoteUrl) {
  Write-Error "Set LOCAL_URL and RAILWAY_URL env vars or pass -LocalUrl / -RemoteUrl."
  exit 1
}

if ($Tables.Count -gt 0) { $Delta = $true }

$OutDir = Join-Path $HOME "Downloads\dbdumps"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$ts   = Get-Date -Format 'yyyyMMdd_HHmmss'
$dump = Join-Path $OutDir "tutor_app_$ts.backup"

Write-Host "Dumping local → $dump"
& pg_dump --dbname="$LocalUrl" -Fc --no-owner --no-acl -f "$dump"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

function Ensure-Extensions {
  Write-Host "Ensuring common extensions (safe if they already exist)…"
  & psql -d "$RemoteUrl" --% -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS ""uuid-ossp"";" | Out-Null
  & psql -d "$RemoteUrl" --% -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"      | Out-Null
  & psql -d "$RemoteUrl" --% -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS citext;"        | Out-Null
}




function Full-Replace {
  if ($DropPublic) {
    Write-Host "Dropping and recreating public schema on Railway…"
    & psql -d "$RemoteUrl" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
  Ensure-Extensions

  Write-Host "Restoring FULL dump to Railway…"
  & pg_restore --dbname="$RemoteUrl" --no-owner --no-acl --exit-on-error --jobs $Jobs "$dump"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

function Delta-NewTables {
  if ($Tables.Count -eq 0) {
    Write-Error "Delta mode needs -Tables 'table1','table2', ..."
    exit 1
  }
  Ensure-Extensions

  foreach ($t in $Tables) {
    $qualified = "public.$t"

    Write-Host "Creating schema for $qualified …"
    & pg_restore --dbname="$RemoteUrl" --no-owner --no-acl --schema-only --table="$qualified" "$dump"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

    # Try common sequence names in case of SERIAL/BIGSERIAL
    $possibleSeqs = @("public.${t}_id_seq","public.${t}_seq")
    foreach ($seq in $possibleSeqs) {
      Write-Host "Trying sequence $seq (if present)…"
      & pg_restore --dbname="$RemoteUrl" --no-owner --no-acl --schema-only --table="$seq" "$dump" 2>$null | Out-Null
      # ignore failures here; it's best-effort
    }

    Write-Host "Loading DATA for $qualified …"
    & pg_restore --dbname="$RemoteUrl" --no-owner --no-acl --data-only --disable-triggers --table="$qualified" "$dump"
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  }
}

function Post-Analyze {
  Write-Host "Analyzing…"
  & psql -d "$RemoteUrl" -c "VACUUM (ANALYZE);" | Out-Null

  Write-Host "Top row estimates:"
  & psql -At -d "$RemoteUrl" -c "SELECT n.nspname||'.'||c.relname, c.reltuples::bigint
FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE c.relkind='r' AND n.nspname='public'
ORDER BY 2 DESC
LIMIT 20;"

  Write-Host "Exact counts (common tables):"
  & psql -At -d "$RemoteUrl" -c "
SELECT 'courses', count(*) FROM public.courses
UNION ALL SELECT 'users', count(*) FROM public.users
UNION ALL SELECT 'profiles', count(*) FROM public.profiles
UNION ALL SELECT 'org_course_assignments', count(*) FROM public.org_course_assignments
UNION ALL SELECT 'org_quiz_attempts', count(*) FROM public.org_quiz_attempts
UNION ALL SELECT 'packages', count(*) FROM public.packages;"
}

if ($Delta) {
  Write-Host "Running in DELTA mode (add new tables + data only)…"
  # Safety: never drop schema in delta mode
  $DropPublic = $false
  Delta-NewTables
} else {
  Write-Host "Running in FULL REPLACE mode…"
  Full-Replace
}

Post-Analyze
Write-Host "Done."
