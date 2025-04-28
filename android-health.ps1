# android-health.ps1
param(
  [string]$RepoRoot = (Get-Location),
  [string]$SdkDir   = "$env:LOCALAPPDATA\Android\Sdk"
)

Write-Host "🔍 Checking Java version…" -ForegroundColor Cyan
java -version 2>&1

Write-Host "`n🔍 Checking ANDROID_SDK_ROOT/local.properties…" -ForegroundColor Cyan
if (Test-Path "$RepoRoot\apps\mobile\android\local.properties") {
  Get-Content "$RepoRoot\apps\mobile\android\local.properties" | Where-Object { $_ -match "sdk.dir" }
  Get-Content "$RepoRoot\apps\mobile\android\local.properties" | Where-Object { $_ -match "ndk.dir" }
} else {
  Write-Host "  ❌ local.properties missing!" -ForegroundColor Red
}

Write-Host "`n🔍 Verifying installed SDK & NDK versions…" -ForegroundColor Cyan
& "$SdkDir\tools\bin\sdkmanager" --list | Select-String "platforms;android-"

Write-Host "`n🔍 Verifying installed NDK side-by-side versions…" -ForegroundColor Cyan
Get-ChildItem "$SdkDir\ndk" -Directory | ForEach-Object { "  • $_" }

Write-Host "`n🔍 Checking CMake versions…" -ForegroundColor Cyan
Get-ChildItem "$SdkDir\cmake" -Directory | ForEach-Object { "  • $_" }

Write-Host "`n🔍 Examining settings.gradle for version catalogs…" -ForegroundColor Cyan
$sg = Get-Content "$RepoRoot\apps\mobile\android\settings.gradle"
if ($sg -match "libs\\.versions\\.toml") {
  Write-Host "  • Found TOML import: $($Matches[0])"
} else {
  Write-Host "  • No version-catalog import found."
}

Write-Host "`n🔍 Checking AndroidManifest package name…" -ForegroundColor Cyan
$manifest = "$RepoRoot\apps\mobile\android\app\src\main\AndroidManifest.xml"
if (Test-Path $manifest) {
  (Get-Content $manifest)[0..5] | Select-String "package="
} else {
  Write-Host "  ❌ AndroidManifest.xml missing!"
}

Write-Host "`n🔍 Running Gradle wrapper version…" -ForegroundColor Cyan
& "$RepoRoot\apps\mobile\android\gradlew.bat" --version

Write-Host "`n🔍 Done. Review above output for any ❌ or missing versions." -ForegroundColor Green
