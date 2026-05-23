param(
  [string]$Profile = "113725432743_slalom_IsbUsersPS",
  [string]$Region  = "eu-central-1",
  [string]$AppId   = "d2atp4d3qd2js3",
  [string]$Branch  = "staging"
)

$ErrorActionPreference = "Stop"

$repoRoot  = Resolve-Path (Join-Path $PSScriptRoot "..\..") # pipeline/deploy/ -> repo root
$appRoot   = Join-Path $repoRoot "app"
$deployDir = Join-Path $repoRoot ".deploy"
$zipPath   = Join-Path $deployDir "motion-id-staging.zip"

New-Item -ItemType Directory -Force -Path $deployDir | Out-Null

# ── Build with staging env vars ───────────────────────────────────────────────
Push-Location $appRoot
try {
  $env:VITE_APP_ENV          = "staging"
  $env:VITE_ENABLE_AGENTATION = "false"
  $env:VITE_DATA_BASE_URL    = "/data"
  $env:VITE_MEDIA_BASE_URL   = "/media"
  npm run build
} finally {
  Pop-Location
}

# ── Zip dist using Python zipfile (safe for Amplify nested assets) ────────────
if (Test-Path $zipPath) { Remove-Item -LiteralPath $zipPath -Force }

@"
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(r"$appRoot") / "dist"
out  = Path(r"$zipPath")
with ZipFile(out, "w", ZIP_DEFLATED) as zf:
    for path in root.rglob("*"):
        if path.is_file():
            zf.write(path, path.relative_to(root).as_posix())
print(out)
"@ | python -

# ── Upload and deploy to Amplify ──────────────────────────────────────────────
$deployment = aws amplify create-deployment `
  --app-id    $AppId `
  --branch-name $Branch `
  --profile   $Profile `
  --region    $Region `
  --output json | ConvertFrom-Json

& curl.exe -sS -X PUT -H "Content-Type: application/zip" --upload-file "$zipPath" "$($deployment.zipUploadUrl)"
if ($LASTEXITCODE -ne 0) { throw "curl upload failed with exit code $LASTEXITCODE" }

aws amplify start-deployment `
  --app-id    $AppId `
  --branch-name $Branch `
  --job-id    $deployment.jobId `
  --profile   $Profile `
  --region    $Region `
  --query     "jobSummary.{jobId:jobId,status:status}" `
  --output json

# ── Wait for completion ───────────────────────────────────────────────────────
$terminalStates = @("SUCCEED", "FAILED", "CANCELLED")
do {
  Start-Sleep -Seconds 5
  $status = aws amplify get-job `
    --app-id    $AppId `
    --branch-name $Branch `
    --job-id    $deployment.jobId `
    --profile   $Profile `
    --region    $Region `
    --query     "job.summary.status" `
    --output text
  Write-Output "job $($deployment.jobId) status: $status"
} until ($terminalStates -contains $status)

if ($status -ne "SUCCEED") { throw "Amplify deployment failed with status $status" }

# ── Verify live assets ────────────────────────────────────────────────────────
$url   = "https://$Branch.$AppId.amplifyapp.com"
$html  = (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30).Content
$assets = ($html | Select-String -Pattern "assets/[^`" ]+" -AllMatches).Matches.Value
Write-Output "URL: $url"
Write-Output "Assets: $($assets -join ', ')"

foreach ($asset in $assets) {
  $assetUrl = "$url/$asset"
  $response = Invoke-WebRequest -Uri $assetUrl -UseBasicParsing -TimeoutSec 30
  Write-Output "$asset $($response.StatusCode) $($response.RawContentLength)"
}
