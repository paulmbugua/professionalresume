param(
  [string]$LocalUrl  = $env:LOCAL_URL,
  [string]$RemoteUrl = $env:RAILWAY_URL,
  [switch]$DropPublic = $true,
  [int]$Jobs = 4
)

if (-not $LocalUrl -or -not $RemoteUrl) {
  Write-Error "Set LOCAL_URL and RAILWAY_URL env vars or pass -LocalUrl / -RemoteUrl."
  exit 1
}

$OutDir = "$HOME\Downloads\dbdumps"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$ts   = Get-Date -Format 'yyyyMMdd_HHmmss'
$dump = Join-Path $OutDir "tutor_app_$ts.backup"

Write-Host "Dumping local → $dump"
& pg_dump --dbname="$LocalUrl" -Fc --no-owner --no-acl -f "$dump" || exit $LASTEXITCODE

if ($DropPublic) {
  Write-Host "Dropping and recreating public schema on Railway…"
  & psql -d "$RemoteUrl" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" || exit $LASTEXITCODE
}

Write-Host "Creating common extensions (safe if they already exist)…"
& psql -d "$RemoteUrl" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
& psql -d "$RemoteUrl" -c 'CREATE EXTENSION IF NOT EXISTS pgcrypto;'
& psql -d "$RemoteUrl" -c 'CREATE EXTENSION IF NOT EXISTS citext;'

Write-Host "Restoring to Railway…"
& pg_restore --dbname="$RemoteUrl" --no-owner --no-acl --exit-on-error --jobs $Jobs "$dump" || exit $LASTEXITCODE

Write-Host "Analyzing…"
& psql -d "$RemoteUrl" -c "VACUUM (ANALYZE);"

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
