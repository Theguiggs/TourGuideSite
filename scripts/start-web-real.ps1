<#
.SYNOPSIS
  Lance le site TourGuideWeb en mode REEL (BDD active + microservice TTS/traduction).

.DESCRIPTION
  1. Verifie les prerequis (node_modules, amplify_outputs.json, Python)
  2. Lance le microservice TTS/traduction (local_server.py, port 8000)
  3. Lance le serveur Next.js en mode reel (port 3000)
  4. Health check sur les deux services
  5. Ouvre le navigateur

.EXAMPLE
  .\scripts\start-web-real.ps1                # Mode normal
  .\scripts\start-web-real.ps1 -SkipMicro     # Si microservice deja lance
  .\scripts\start-web-real.ps1 -SkipOpen      # Ne pas ouvrir le navigateur
  .\scripts\start-web-real.ps1 -Port 3001     # Port Next.js custom
#>

param(
  [switch]$SkipMicro,
  [switch]$SkipOpen,
  [int]$Port = 3000,
  [int]$MicroPort = 8000,
  [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$MicroRoot = Join-Path $ProjectRoot "microservice"
$TempDir = Join-Path $env:TEMP "tourguide-scripts"

# Creer le dossier temp pour les scripts de lancement
if (-not (Test-Path $TempDir)) { New-Item -ItemType Directory -Path $TempDir -Force | Out-Null }

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  TourGuideWeb - Mode Reel (BDD + TTS)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# -------------------------------------------------------------------
# 1. Prerequis
# -------------------------------------------------------------------
Write-Host "[1/5] Verification des prerequis..." -ForegroundColor Yellow

$allOk = $true

if (Test-Path (Join-Path $ProjectRoot "node_modules") -PathType Container) {
  Write-Host "  [OK] node_modules" -ForegroundColor Green
} else {
  Write-Host "  [MANQUANT] node_modules - lance: npm install" -ForegroundColor Red
  $allOk = $false
}

if (Test-Path (Join-Path $ProjectRoot "amplify_outputs.json") -PathType Leaf) {
  Write-Host "  [OK] amplify_outputs.json" -ForegroundColor Green
} else {
  Write-Host "  [MANQUANT] amplify_outputs.json - copie depuis ..\TourGuide\" -ForegroundColor Red
  $allOk = $false
}

if (-not $SkipMicro) {
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) {
    $pyVersion = & python --version 2>&1
    Write-Host "  [OK] $pyVersion" -ForegroundColor Green
  } else {
    Write-Host "  [MANQUANT] Python - installe Python 3.11+ depuis python.org" -ForegroundColor Red
    $allOk = $false
  }
}

if (-not $allOk) {
  Write-Host ""
  Write-Host "Prerequis manquants. Corrige avant de continuer." -ForegroundColor Red
  exit 1
}

# -------------------------------------------------------------------
# 2. Microservice TTS/Traduction (port 8000)
# -------------------------------------------------------------------
Write-Host ""
Write-Host "[2/5] Microservice TTS/Traduction (port $MicroPort)..." -ForegroundColor Yellow

if ($SkipMicro) {
  Write-Host "  [SKIP] -SkipMicro" -ForegroundColor Gray
} else {
  $microRunning = Get-NetTCPConnection -LocalPort $MicroPort -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($microRunning) {
    Write-Host "  [OK] Deja actif sur le port $MicroPort (PID $($microRunning.OwningProcess))" -ForegroundColor Green
  } else {
    # Creer le venv si besoin
    $venvPath = Join-Path $MicroRoot ".venv"
    if (-not (Test-Path $venvPath)) {
      Write-Host "  [..] Creation du venv Python..." -ForegroundColor Gray
      & python -m venv $venvPath
    }

    # Ecrire un script temporaire pour le microservice
    $microScript = Join-Path $TempDir "start-micro.ps1"
    @"
Set-Location "$MicroRoot"
& ".\.venv\Scripts\Activate.ps1"
pip install -q torch --index-url https://download.pytorch.org/whl/cpu 2>`$null
pip install -q fastapi "uvicorn[standard]" edge-tts soundfile pydub requests transformers sentencepiece 2>`$null
`$env:MICROSERVICE_API_KEY = "tourguide-tts-2026"
Write-Host ""
Write-Host "  Microservice TTS/Traduction" -ForegroundColor Cyan
Write-Host "  http://localhost:$MicroPort/health" -ForegroundColor Cyan
Write-Host ""
python -m uvicorn local_server:app --host 0.0.0.0 --port $MicroPort
"@ | Set-Content -Path $microScript -Encoding UTF8

    Start-Process wt -ArgumentList "new-tab --title `"TTS Microservice`" powershell -NoExit -File `"$microScript`""
    Write-Host "  [OK] Lance dans un nouvel onglet Windows Terminal" -ForegroundColor Green
    Write-Host "  Attente demarrage (8s)..." -ForegroundColor Gray
    Start-Sleep -Seconds 8

    # Health check microservice
    $microReady = $false
    for ($i = 0; $i -lt 5; $i++) {
      try {
        $resp = Invoke-WebRequest -Uri "http://localhost:$MicroPort/health" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        if ($resp.StatusCode -eq 200) {
          $microReady = $true
          break
        }
      } catch { }
      Start-Sleep -Seconds 3
    }

    if ($microReady) {
      Write-Host "  [OK] Microservice pret!" -ForegroundColor Green
    } else {
      Write-Host "  [WARN] Microservice pas encore pret - il demarre peut-etre encore" -ForegroundColor DarkYellow
      Write-Host "         Verifie l'onglet TTS Microservice dans le terminal" -ForegroundColor Gray
    }
  }
}

# -------------------------------------------------------------------
# 3. Serveur Next.js en mode reel (port 3000)
# -------------------------------------------------------------------
Write-Host ""
Write-Host "[3/5] Serveur Next.js en mode REEL (port $Port)..." -ForegroundColor Yellow

$webRunning = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1
if ($webRunning) {
  Write-Host "  [OK] Deja actif sur le port $Port (PID $($webRunning.OwningProcess))" -ForegroundColor Green
} else {
  # Ecrire un script temporaire pour Next.js
  $nextScript = Join-Path $TempDir "start-next.ps1"
  @"
Set-Location "$ProjectRoot"
`$env:NEXT_PUBLIC_USE_STUBS = "false"
`$env:NEXT_PUBLIC_MICROSERVICE_URL = "http://localhost:$MicroPort"
`$env:NEXT_PUBLIC_MICROSERVICE_API_KEY = "tourguide-tts-2026"
Write-Host ""
Write-Host "  Next.js - Mode REEL (BDD active)" -ForegroundColor Cyan
Write-Host "  STUBS=false | Microservice=localhost:$MicroPort" -ForegroundColor Cyan
Write-Host ""
npm run dev -- --port $Port
"@ | Set-Content -Path $nextScript -Encoding UTF8

  Start-Process wt -ArgumentList "new-tab --title `"Next.js REAL`" powershell -NoExit -File `"$nextScript`""
  Write-Host "  [OK] Lance dans un nouvel onglet Windows Terminal" -ForegroundColor Green
}

# -------------------------------------------------------------------
# 4. Health check Next.js
# -------------------------------------------------------------------
Write-Host ""
Write-Host "[4/5] Attente du serveur http://localhost:${Port} ..." -ForegroundColor Yellow

$elapsed = 0
$ready = $false

while ($elapsed -lt $TimeoutSeconds) {
  try {
    $response = Invoke-WebRequest -Uri "http://localhost:$Port" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch { }
  Write-Host "  Attente... (${elapsed}s)" -ForegroundColor Gray
  Start-Sleep -Seconds 3
  $elapsed += 3
}

if ($ready) {
  Write-Host "  [OK] Serveur pret!" -ForegroundColor Green
} else {
  Write-Host "  [TIMEOUT] Le serveur n a pas repondu apres $TimeoutSeconds s" -ForegroundColor Red
  Write-Host "  Verifie l onglet Next.js REAL pour les erreurs." -ForegroundColor DarkYellow
}

# -------------------------------------------------------------------
# 5. Ouverture navigateur
# -------------------------------------------------------------------
Write-Host ""
Write-Host "[5/5] Ouverture du navigateur..." -ForegroundColor Yellow

$baseUrl = "http://localhost:$Port"

if ($SkipOpen) {
  Write-Host "  [SKIP] -SkipOpen" -ForegroundColor Gray
} elseif ($ready) {
  Start-Process "$baseUrl/catalogue"
  Start-Sleep -Milliseconds 500
  Start-Process "$baseUrl/guide/login"
  Write-Host "  [OK] Catalogue + Guide login ouverts" -ForegroundColor Green
} else {
  Write-Host "  [SKIP] Serveur pas pret" -ForegroundColor DarkYellow
}

# -------------------------------------------------------------------
# Resume
# -------------------------------------------------------------------
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  TourGuideWeb - Pret!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Services actifs :" -ForegroundColor White
Write-Host "    Next.js (REEL)     : http://localhost:$Port" -ForegroundColor White
Write-Host "    Microservice TTS   : http://localhost:$MicroPort" -ForegroundColor White
Write-Host "    Health check       : http://localhost:$MicroPort/health" -ForegroundColor White
Write-Host ""
Write-Host "  Pages :" -ForegroundColor White
Write-Host "    Catalogue public   : $baseUrl/catalogue" -ForegroundColor White
Write-Host "    Guide login        : $baseUrl/guide/login" -ForegroundColor White
Write-Host "    Admin moderation   : $baseUrl/admin/moderation" -ForegroundColor White
Write-Host "    Studio             : $baseUrl/guide/studio" -ForegroundColor White
Write-Host ""
Write-Host "  Pour arreter : fermer les onglets TTS Microservice et Next.js REAL" -ForegroundColor Gray
Write-Host ""
