<#
.SYNOPSIS
  Resynchronise AMPLIFY_OUTPUTS_B64 de l'app Amplify Hosting avec le backend live,
  puis relance un build.

.DESCRIPTION
  Le buildspec (amplify.yml) ecrit amplify_outputs.json a partir de la variable
  d'environnement AMPLIFY_OUTPUTS_B64 (gzip + base64). Aucun backend n'est deploye
  par le build : a chaque recreation du sandbox, cette variable pointe dans le vide
  jusqu'a ce qu'on la remette a jour.

  Constate le 2026-08-21 : le site pointait sur l'API j5ergthsrre53glks3ec44kbpy,
  detruite depuis, et servait des pages statiques periemes (visites deprecees,
  anciennes durees, tout affiche "gratuit").

  Le script FUSIONNE les variables existantes (GITHUB_PAT, NEXT_PUBLIC_USE_STUBS...)
  au lieu de les ecraser : l'API update-branch remplace la map entiere, et perdre
  GITHUB_PAT casse le clone de TourGuideApp au preBuild.

.PARAMETER Confirm
  Sans ce commutateur, le script ne fait qu'un dry-run (aucune ecriture, aucun build).

.EXAMPLE
  .\scripts\fix-hosting-outputs.ps1
  .\scripts\fix-hosting-outputs.ps1 -Confirm
#>
[CmdletBinding()]
param(
  [switch]$Confirm,
  [string]$AppId      = 'd4e0mmxzlbpmv',
  [string]$BranchName = 'main',
  [string]$Region     = 'us-east-1',
  [string]$SourceFile = 'C:\Projects\Bmad\TourGuideApp\amplify_outputs.json'
)

$ErrorActionPreference = 'Stop'

function Get-ApiHost([string]$path) {
  $o = Get-Content -Raw -Path $path | ConvertFrom-Json
  return @{ Host = ([Uri]$o.data.url).Host; Pool = $o.auth.user_pool_id }
}

Write-Host "`n=== Resynchronisation des outputs Amplify Hosting ===" -ForegroundColor Cyan

if (-not (Test-Path $SourceFile)) { throw "Source introuvable : $SourceFile" }
$src = Get-ApiHost $SourceFile
Write-Host "Source  : $SourceFile"
Write-Host "   host : $($src.Host)"
Write-Host "   pool : $($src.Pool)"

# --- Etat actuel + sauvegarde -------------------------------------------------
$branch = (aws amplify get-branch --app-id $AppId --branch-name $BranchName --region $Region | ConvertFrom-Json).branch
$app    = (aws amplify get-app    --app-id $AppId --region $Region | ConvertFrom-Json).app

$stamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $PSScriptRoot "fix-hosting-outputs.backup-$stamp.json"
@{ app = $app.environmentVariables; branch = $branch.environmentVariables } |
  ConvertTo-Json -Depth 6 | Set-Content -Path $backup -Encoding utf8
Write-Host "`nSauvegarde des variables actuelles -> $backup" -ForegroundColor Yellow

# Diagnostic de la valeur en place
$old = $branch.environmentVariables.AMPLIFY_OUTPUTS_B64
if ($old) {
  try {
    $bytes = [Convert]::FromBase64String($old)
    $msIn  = New-Object IO.MemoryStream(,$bytes)
    $gzIn  = New-Object IO.Compression.GZipStream($msIn, [IO.Compression.CompressionMode]::Decompress)
    $rd    = New-Object IO.StreamReader($gzIn)
    $cur   = $rd.ReadToEnd() | ConvertFrom-Json
    $rd.Close()
    Write-Host "Deploye actuellement : host=$(([Uri]$cur.data.url).Host) pool=$($cur.auth.user_pool_id)"
  } catch {
    Write-Host "Deploye actuellement : valeur illisible ($($_.Exception.Message))" -ForegroundColor Yellow
  }
}

# --- Nouvelle valeur : gzip puis base64 --------------------------------------
$raw = [IO.File]::ReadAllBytes($SourceFile)
$ms  = New-Object IO.MemoryStream
$gz  = New-Object IO.Compression.GZipStream($ms, [IO.Compression.CompressionMode]::Compress)
$gz.Write($raw, 0, $raw.Length); $gz.Close()
$b64 = [Convert]::ToBase64String($ms.ToArray())
Write-Host "`nNouvelle valeur : $($raw.Length) octets -> $($b64.Length) caracteres en base64"

# --- Fusion (ne jamais ecraser les autres variables) -------------------------
function Merge-Vars($existing) {
  $h = @{}
  if ($existing) { $existing.PSObject.Properties | ForEach-Object { $h[$_.Name] = $_.Value } }
  $h['AMPLIFY_OUTPUTS_B64'] = $b64
  return $h
}
$appVars    = Merge-Vars $app.environmentVariables
$branchVars = Merge-Vars $branch.environmentVariables
Write-Host "Variables conservees (branche) : $(($branchVars.Keys | Sort-Object) -join ', ')"

if (-not $Confirm) {
  Write-Host "`nDRY-RUN : rien ecrit. Relance avec -Confirm pour appliquer." -ForegroundColor Yellow
  return
}

# --- Ecriture ----------------------------------------------------------------
$tmpApp    = Join-Path $env:TEMP "amplify-app-$stamp.json"
$tmpBranch = Join-Path $env:TEMP "amplify-branch-$stamp.json"
@{ appId = $AppId; environmentVariables = $appVars } |
  ConvertTo-Json -Depth 6 | Set-Content -Path $tmpApp -Encoding utf8
@{ appId = $AppId; branchName = $BranchName; environmentVariables = $branchVars } |
  ConvertTo-Json -Depth 6 | Set-Content -Path $tmpBranch -Encoding utf8

Write-Host "`nMise a jour de l'app..."
aws amplify update-app    --region $Region --cli-input-json "file://$tmpApp"    | Out-Null
Write-Host "Mise a jour de la branche $BranchName..."
aws amplify update-branch --region $Region --cli-input-json "file://$tmpBranch" | Out-Null
Remove-Item $tmpApp, $tmpBranch -ErrorAction SilentlyContinue

Write-Host "`nDeclenchement d'un build..."
$job = aws amplify start-job --app-id $AppId --branch-name $BranchName --job-type RELEASE --region $Region | ConvertFrom-Json
Write-Host "   jobId  : $($job.jobSummary.jobId)"
Write-Host "   statut : $($job.jobSummary.status)"

Write-Host "`nSuivre le build :" -ForegroundColor Cyan
Write-Host "   aws amplify get-job --app-id $AppId --branch-name $BranchName --job-id $($job.jobSummary.jobId) --region $Region --query 'job.summary.status' --output text"
Write-Host "`nEn cas d'echec 'environment variables too large', voir le plan d'action"
Write-Host "(docs/business/plan-action-monetisation-2026-08.md) : basculer le buildspec"
Write-Host "sur un amplify_outputs.json versionne plutot que sur cette variable."
Write-Host ""
