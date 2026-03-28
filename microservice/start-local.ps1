# TourGuide TTS/Translation Microservice — Local Windows
# Usage: .\start-local.ps1

Write-Host "== TourGuide Microservice (local) ==" -ForegroundColor Cyan

# Check Python
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "[FAIL] Python non trouve. Installe Python 3.11+ depuis python.org" -ForegroundColor Red
    exit 1
}

# Create venv if needed
if (-not (Test-Path ".\\.venv")) {
    Write-Host "[...] Creation du venv..." -ForegroundColor Yellow
    python -m venv .venv
}

# Activate venv
& .\.venv\Scripts\Activate.ps1

# Install deps in two steps (torch CPU index breaks other packages)
Write-Host "[...] Installation de torch (CPU)..." -ForegroundColor Yellow
pip install -q torch --index-url https://download.pytorch.org/whl/cpu

Write-Host "[...] Installation des autres dependances..." -ForegroundColor Yellow
pip install -q fastapi "uvicorn[standard]" edge-tts soundfile pydub requests transformers sentencepiece

# Set API key
$env:MICROSERVICE_API_KEY = "tourguide-tts-2026"

Write-Host ""
Write-Host "[OK] Microservice pret" -ForegroundColor Green
Write-Host "   URL: http://localhost:8000"
Write-Host "   API Key: $env:MICROSERVICE_API_KEY"
Write-Host "   Health: http://localhost:8000/health"
Write-Host ""

# Start server
python -m uvicorn local_server:app --host 0.0.0.0 --port 8000
