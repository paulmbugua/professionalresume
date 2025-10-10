<# ========================================================================
  sync-railway.ps1  —  Local → Railway Postgres schema sync (via migra)

  USAGE (from repo root):
    # Quick apply (no file)
    .\scripts\sync-railway.ps1

    # Dry-run (print SQL only, no changes)
    .\scripts\sync-railway.ps1 -DryRun

    # Save SQL to file (UTF-8), then apply
    .\scripts\sync-railway.ps1 -OutFile .\sync_railway_to_local.sql

    # Include GRANTs/REVOKEs as well
    .\scripts\sync-railway.ps1 -WithPrivileges

    # Make a Railway backup first
    .\scripts\sync-railway.ps1 -Backup

    # If migra isn't installed, let the script install it (pipx)
    .\scripts\sync-railway.ps1 -AutoInstall

  ENV VARS (defaults if not passed as params):
    $env:LOCAL_URL   = "postgresql://user:pass@localhost:5432/db"
    $env:RAILWAY_URL = "postgresql://user:pass@host:port/db?sslmode=require"

  NOTES:
    - We pipe migra → psql to avoid Windows UTF-16 redirection issues.
    - We auto-upgrade postgres:// → postgresql:// (SQLAlchemy 2.x).
    - Options are placed BEFORE -d in psql calls (important on Windows).
========================================================================= #>

[CmdletBinding()]
param(
  [string]$LocalUrl   = $env:LOCAL_URL,
  [string]$RailwayUrl = $env:RAILWAY_URL,
  [string[]]$Schemas  = @('public'),
  [switch]$WithPrivileges,
  [switch]$DryRun,
  [string]$OutFile,                 # if set, write SQL to this path (UTF-8) then apply
  [switch]$Backup,                  # pg_dump of Railway first (custom format)
  [switch]$AutoInstall              # attempt to install migra via pipx if missing
)

function Fail($msg) { Write-Error $msg; exit 1 }

# ---------- Validate URLs ----------
if (-not $LocalUrl)   { Fail "LOCAL_URL not set. Set -LocalUrl or `$env:LOCAL_URL`." }
if (-not $RailwayUrl) { Fail "RAILWAY_URL not set. Set -RailwayUrl or `$env:RAILWAY_URL`." }

# Normalize postgres:// → postgresql:// for SQLAlchemy/migra
$LocalUrl   = $LocalUrl   -replace '^postgres://',   'postgresql://'
$RailwayUrl = $RailwayUrl -replace '^postgres://',   'postgresql://'

# ---------- Tool discovery ----------
function Get-MigraPath {
  $cmd = Get-Command migra -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $candidates = @(
    "$env:USERPROFILE\AppData\Roaming\Python\Python313\Scripts\migra.exe",
    "$env:USERPROFILE\.local\bin\migra.exe"
  )
  foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
  return $null
}

function Ensure-Migra {
  $mp = Get-MigraPath
  if ($mp) { return $mp }

  if (-not $AutoInstall) {
    Fail "migra not found on PATH. Re-run with -AutoInstall or install manually (`pipx install migra` + `pipx inject migra 'psycopg[binary]' 'setuptools<81>'`)."
  }

  $py = Get-Command py -ErrorAction SilentlyContinue
  if (-not $py) { Fail "'py' launcher not found. Install Python 3.x for Windows." }

  Write-Host "Installing migra via pipx..." -ForegroundColor Cyan
  & $py.Source -m pip install --user pipx | Out-Null
  & $py.Source -m pipx ensurepath | Out-Null

  # Make pipx/migra discoverable in this session
  $env:Path += ";$env:USERPROFILE\AppData\Roaming\Python\Python313\Scripts;$env:USERPROFILE\.local\bin"

  # Install migra + inject drivers (psycopg3 and setuptools for pkg_resources)
  & $py.Source -m pipx install migra
  & $py.Source -m pipx inject migra "psycopg[binary]" "setuptools<81>"

  $mp = Get-MigraPath
  if (-not $mp) { Fail "migra still not found after install. Close and reopen PowerShell or add user Scripts to PATH." }
  return $mp
}

function Ensure-PSQL {
  $psql = Get-Command psql -ErrorAction SilentlyContinue
  if (-not $psql) { Fail "'psql' not found. Install PostgreSQL client tools and reopen PowerShell." }
  return $psql.Source
}

$MigraExe = Ensure-Migra
$PsqlExe  = Ensure-PSQL

# ---------- Optional backup ----------
if ($Backup) {
  $stamp = Get-Date -Format 'yyyyMMdd_HHmm'
  $dumpPath = Join-Path (Get-Location) "railway_backup_$stamp.dump"
  $pgdump = Get-Command pg_dump -ErrorAction SilentlyContinue
  if (-not $pgdump) { Fail "'pg_dump' not found. Install PostgreSQL client tools to use -Backup." }

  Write-Host "Backing up Railway to $dumpPath ..." -ForegroundColor Yellow
  & $pgdump.Source -d "$RailwayUrl" --format=custom --no-owner --no-privileges --file "$dumpPath"
  if ($LASTEXITCODE -ne 0) { Fail "Backup failed. Aborting sync." }
}

# ---------- Build migra args ----------
$schemaArgs = @()
foreach ($s in $Schemas) { if ($s) { $schemaArgs += @('--schema', $s) } }

$migraArgs = @('--unsafe') + $schemaArgs
if ($WithPrivileges) { $migraArgs += '--with-privileges' }
# Force UTF-8 to be safe on Windows
$migraArgs += '--force-utf8'
$migraArgs += @("$RailwayUrl", "$LocalUrl")

# Silence schemainspect warning noise
$env:PYTHONWARNINGS = "ignore::UserWarning"

# Ensure UTF-8 code page for console output (harmless if already set)
chcp 65001 > $null

# ---------- Run (dry-run / to file / apply) ----------
if ($DryRun) {
  Write-Host ">>> Dry-run (no changes): Railway → Local diff" -ForegroundColor Cyan
  & $MigraExe @migraArgs
  exit $LASTEXITCODE
}

if ($OutFile) {
  # Write SQL to file in UTF-8, then apply with psql (correct flag order!)
  Write-Host "Generating diff to $OutFile (UTF-8)..." -ForegroundColor Cyan
  & $MigraExe @migraArgs | Out-File -FilePath $OutFile -Encoding utf8

  Write-Host "Applying $OutFile to Railway..." -ForegroundColor Cyan
  & $PsqlExe -v ON_ERROR_STOP=1 -f $OutFile -d "$RailwayUrl"
  if ($LASTEXITCODE -ne 0) { Fail "Apply failed. Inspect $OutFile for the failing statement." }
} else {
  # Pipe directly (avoids UTF-16 BOM issues on Windows)
  Write-Host "Applying schema changes (pipeline)..." -ForegroundColor Cyan
  & $MigraExe @migraArgs | & $PsqlExe -v ON_ERROR_STOP=1 -d "$RailwayUrl"
  if ($LASTEXITCODE -ne 0) { Fail "Apply failed during pipeline. Try -OutFile to debug exact SQL." }
}

# ---------- Verify ----------
Write-Host "Verifying: expecting NO output (schemas match)..." -ForegroundColor Green
& $MigraExe @('--unsafe') + $schemaArgs + @("$RailwayUrl", "$LocalUrl")
if ($LASTEXITCODE -eq 0) {
  Write-Host "✅ Railway schema now matches Local." -ForegroundColor Green
} else {
  Write-Warning "Migra returned a non-zero exit code during verify."
}
