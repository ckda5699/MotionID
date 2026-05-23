# Motion ID - One-Shot Setup (Windows / PowerShell)
#
# Run from the repo root:
#   .\setup.ps1
#
# What this does:
#   1. Checks prerequisites (Node, Python, AWS CLI)
#   2. Installs Node dependencies in app/
#   3. Creates a Python .venv and installs pipeline dependencies
#   4. Copies .env.example -> .env if not already present
#   5. Prints next steps

$ErrorActionPreference = "Stop"
$repoRoot = $PSScriptRoot

function Write-Step { param([string]$msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-Ok   { param([string]$msg) Write-Host "    OK: $msg" -ForegroundColor Green }
function Write-Warn { param([string]$msg) Write-Host "    WARN: $msg" -ForegroundColor Yellow }
function Write-Fail { param([string]$msg) Write-Host "    FAIL: $msg" -ForegroundColor Red; exit 1 }

# ── 1. Check prerequisites ────────────────────────────────────────────────────
Write-Step "Checking prerequisites"

try {
    $nodeVer = node --version
    Write-Ok "Node $nodeVer"
} catch {
    Write-Fail "Node.js not found. Install from https://nodejs.org (v20+)"
}

try {
    $npmVer = npm --version
    Write-Ok "npm $npmVer"
} catch {
    Write-Fail "npm not found. Install Node.js from https://nodejs.org"
}

try {
    $pyVer = python --version
    Write-Ok "$pyVer"
} catch {
    Write-Warn "Python not found - pipeline scripts will not work. Install from https://python.org (3.12+)"
    $skipPython = $true
}

try {
    $awsVer = aws --version
    Write-Ok "$awsVer"
} catch {
    Write-Warn "AWS CLI not found - deployment scripts will not work. Install from https://aws.amazon.com/cli/"
}

# ── 2. Install Node dependencies ──────────────────────────────────────────────
Write-Step "Installing Node dependencies (app/)"
Push-Location (Join-Path $repoRoot "app")
try {
    npm ci
    Write-Ok "Node dependencies installed"
} finally {
    Pop-Location
}

# ── 3. Create Python venv and install pipeline deps ───────────────────────────
if (-not $skipPython) {
    Write-Step "Creating Python .venv"
    $venvPath = Join-Path $repoRoot ".venv"
    if (-not (Test-Path $venvPath)) {
        python -m venv $venvPath
        Write-Ok ".venv created at $venvPath"
    } else {
        Write-Ok ".venv already exists - skipping creation"
    }

    $reqPath = Join-Path $repoRoot "pipeline\requirements.txt"
    if (Test-Path $reqPath) {
        Write-Step "Installing Python pipeline dependencies"
        & "$venvPath\Scripts\pip.exe" install -r $reqPath
        Write-Ok "Pipeline dependencies installed"
    } else {
        Write-Warn "pipeline\requirements.txt not found - skipping Python deps"
    }
}

# ── 4. Copy .env files ────────────────────────────────────────────────────────
Write-Step "Setting up .env files"

$rootEnv = Join-Path $repoRoot ".env"
$rootEnvExample = Join-Path $repoRoot ".env.example"
if (-not (Test-Path $rootEnv)) {
    Copy-Item $rootEnvExample $rootEnv
    Write-Ok "Copied .env.example -> .env (root)"
} else {
    Write-Ok ".env (root) already exists - not overwriting"
}

$appEnv = Join-Path $repoRoot "app\.env"
$appEnvExample = Join-Path $repoRoot "app\.env.example"
if (-not (Test-Path $appEnv)) {
    Copy-Item $appEnvExample $appEnv
    Write-Ok "Copied app/.env.example -> app/.env"
} else {
    Write-Ok "app/.env already exists - not overwriting"
}

# ── 5. Done ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
Write-Host "  Setup complete. Next steps:" -ForegroundColor White
Write-Host ""
Write-Host "  1. Start the app locally:" -ForegroundColor White
Write-Host "     cd app && npm run dev" -ForegroundColor Yellow
Write-Host "     → http://127.0.0.1:5177" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Add goal/highlight videos (for local media mode):" -ForegroundColor White
Write-Host "     Copy MP4 files into:" -ForegroundColor Gray
Write-Host "       app\public\media\goals\        (skeleton goal clips)" -ForegroundColor Gray
Write-Host "       app\public\media\highlights\   (full highlight clips)" -ForegroundColor Gray
Write-Host "     See each folder's README.md for expected filenames." -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Or use S3/CloudFront for media:" -ForegroundColor White
Write-Host "     Edit app\.env and set VITE_MEDIA_BASE_URL=https://<your-cf-url>/media" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Deploy to AWS Amplify staging:" -ForegroundColor White
Write-Host "     aws sso login --profile 113725432743_slalom_IsbUsersPS" -ForegroundColor Yellow
Write-Host "     .\pipeline\deploy\deploy_motion_id_staging.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Magenta
