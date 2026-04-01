<#
.SYNOPSIS
  Sanity Check — Lance le dev server, detecte le telephone, build si necessaire, ouvre tout.

.DESCRIPTION
  1. Verifie les prerequis (node_modules, amplify_outputs.json)
  2. Detecte un telephone Android via ADB
  3. Build debug mobile si sources modifiees depuis le dernier APK
  4. Lance le Amplify sandbox (si pas deja actif)
  5. Lance le serveur Next.js dev
  6. Lance Metro bundler + installe et lance l'appli mobile
  7. Attend que le serveur web reponde (health check)
  8. Ouvre automatiquement les pages Guide et Admin dans le navigateur

.USAGE
  .\scripts\sanity-check.ps1               # Mode normal (web + mobile si tel detecte)
  .\scripts\sanity-check.ps1 -SkipSandbox   # Si sandbox deja lance
  .\scripts\sanity-check.ps1 -StubMode      # Mode stubs (sans backend reel)
  .\scripts\sanity-check.ps1 -SkipMobile    # Ne pas lancer l'appli mobile
  .\scripts\sanity-check.ps1 -ForceBuild    # Forcer le rebuild meme sans changement
  .\scripts\sanity-check.ps1 -SkipBuild     # Ne jamais rebuilder l'APK
#>

param(
  [switch]$SkipSandbox,
  [switch]$StubMode,
  [switch]$SkipMobile,
  [switch]$ForceBuild,
  [switch]$SkipBuild,
  [int]$Port = 3000,
  [int]$TimeoutSeconds = 60
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$BmadRoot = Split-Path -Parent $ProjectRoot
$MobileRoot = "$BmadRoot\TourGuide"
$MobilePackage = "com.tourguideyeup"
$MobileActivity = "com.tourguide.MainActivity"

$ApkPath = "$MobileRoot\android\app\build\outputs\apk\debug\app-debug.apk"
$GradlewPath = "$MobileRoot\android\gradlew.bat"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  TourGuide - Sanity Check Complet" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# -------------------------------------------------------------------
# 1. Prerequis
# -------------------------------------------------------------------
Write-Host "[1/8] Verification des prerequis..." -ForegroundColor Yellow

function Test-Prerequisite {
  param([string]$Name, [string]$CheckPath, [string]$Type)
  if ($Type -eq "dir") {
    $found = Test-Path $CheckPath -PathType Container
  } else {
    $found = Test-Path $CheckPath -PathType Leaf
  }
  if ($found) {
    Write-Host "  [OK] $Name" -ForegroundColor Green
  } else {
    Write-Host "  [MANQUANT] $Name - $CheckPath" -ForegroundColor Red
  }
  return $found
}

$allOk = $true
if (-not (Test-Prerequisite "node_modules (web)" "$ProjectRoot\node_modules" "dir")) { $allOk = $false }
if (-not (Test-Prerequisite "amplify_outputs.json" "$ProjectRoot\amplify_outputs.json" "file")) { $allOk = $false }
if (-not $StubMode) {
  if (-not (Test-Prerequisite ".env.local" "$ProjectRoot\.env.local" "file")) { $allOk = $false }
}

if (-not $allOk) {
  Write-Host ""
  Write-Host "Prerequis manquants. Corrigez avant de continuer." -ForegroundColor Red
  Write-Host "  - node_modules : npm install"
  Write-Host "  - amplify_outputs.json : copier depuis ..\TourGuide\amplify_outputs.json"
  Write-Host "  - .env.local : creer avec les variables Amplify"
  exit 1
}

# -------------------------------------------------------------------
# 2. Detection telephone Android (ADB)
# -------------------------------------------------------------------
Write-Host ""
Write-Host "[2/8] Detection telephone Android..." -ForegroundColor Yellow

$deviceDetected = $false
$deviceName = ""

if (-not $SkipMobile) {
  $adbPath = Get-Command adb -ErrorAction SilentlyContinue
  if ($adbPath) {
    try {
      $adbDevices = & adb devices 2>&1 | Select-String "device$"
      if ($adbDevices) {
        $deviceDetected = $true
        $deviceSerial = ($adbDevices -split "`t")[0].Trim()
        try {
          $deviceModel = (& adb -s $deviceSerial shell getprop ro.product.model 2>&1).Trim()
          $deviceAndroid = (& adb -s $deviceSerial shell getprop ro.build.version.release 2>&1).Trim()
          $deviceName = "$deviceModel (Android $deviceAndroid)"
        } catch {
          $deviceName = $deviceSerial
        }
        Write-Host "  [OK] Telephone detecte : $deviceName" -ForegroundColor Green
        Write-Host "       Serial : $deviceSerial" -ForegroundColor Gray

        # Verifier si l'appli est installee
        $appInstalled = & adb -s $deviceSerial shell pm list packages $MobilePackage 2>&1
        if ($appInstalled -match $MobilePackage) {
          Write-Host "  [OK] App $MobilePackage installee" -ForegroundColor Green
        } else {
          Write-Host "  [WARN] App $MobilePackage non installee" -ForegroundColor DarkYellow
          Write-Host "         Build : cd $MobileRoot\android && gradlew.bat app:installDebug" -ForegroundColor Gray
        }
      } else {
        Write-Host "  [SKIP] Aucun telephone connecte" -ForegroundColor Gray
        Write-Host "         Connectez un telephone en USB avec le debogage USB active" -ForegroundColor Gray
      }
    } catch {
      Write-Host "  [SKIP] Erreur ADB : $_" -ForegroundColor DarkYellow
    }
  } else {
    Write-Host "  [SKIP] ADB non trouve dans le PATH" -ForegroundColor Gray
    Write-Host "         Installez Android SDK Platform-Tools ou ajoutez adb au PATH" -ForegroundColor Gray
  }
} else {
  Write-Host "  [SKIP] -SkipMobile" -ForegroundColor Gray
}

# -------------------------------------------------------------------
# 3. Build APK debug si sources modifiees
# -------------------------------------------------------------------
Write-Host ""
$needsBuild = $false
$buildSkipped = $false

if ($deviceDetected -and -not $SkipBuild) {
  Write-Host "[3/8] Verification build mobile..." -ForegroundColor Yellow

  if (-not (Test-Path $GradlewPath -PathType Leaf)) {
    Write-Host "  [SKIP] gradlew.bat non trouve : $GradlewPath" -ForegroundColor DarkYellow
    $buildSkipped = $true
  } elseif (-not (Test-Path "$MobileRoot\node_modules" -PathType Container)) {
    Write-Host "  [SKIP] node_modules mobile manquant - npm install dans $MobileRoot" -ForegroundColor DarkYellow
    $buildSkipped = $true
  } elseif ($ForceBuild) {
    Write-Host "  -ForceBuild : rebuild force" -ForegroundColor DarkYellow
    $needsBuild = $true
  } elseif (-not (Test-Path $ApkPath -PathType Leaf)) {
    Write-Host "  Aucun APK existant - premier build necessaire" -ForegroundColor DarkYellow
    $needsBuild = $true
  } else {
    # Comparer la date de l'APK avec les sources
    $apkDate = (Get-Item $ApkPath).LastWriteTime
    Write-Host "  APK existant : $($apkDate.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray

    # Dossiers sources a surveiller
    $sourceDirs = @(
      "$MobileRoot\src",
      "$MobileRoot\android\app\src"
    )
    $sourceFiles = @(
      "$MobileRoot\package.json",
      "$MobileRoot\tsconfig.json",
      "$MobileRoot\index.js",
      "$MobileRoot\App.tsx",
      "$MobileRoot\babel.config.js",
      "$MobileRoot\metro.config.js",
      "$MobileRoot\.env",
      "$MobileRoot\amplify_outputs.json"
    )

    $newestFile = $null
    $newestDate = [DateTime]::MinValue

    # Parcourir les dossiers sources
    foreach ($dir in $sourceDirs) {
      if (Test-Path $dir -PathType Container) {
        $latest = Get-ChildItem -Path $dir -Recurse -File -ErrorAction SilentlyContinue |
          Sort-Object LastWriteTime -Descending |
          Select-Object -First 1
        if ($latest -and $latest.LastWriteTime -gt $newestDate) {
          $newestDate = $latest.LastWriteTime
          $newestFile = $latest.FullName
        }
      }
    }

    # Parcourir les fichiers racine
    foreach ($file in $sourceFiles) {
      if (Test-Path $file -PathType Leaf) {
        $item = Get-Item $file
        if ($item.LastWriteTime -gt $newestDate) {
          $newestDate = $item.LastWriteTime
          $newestFile = $item.FullName
        }
      }
    }

    if ($newestDate -gt $apkDate) {
      $relativePath = $newestFile.Replace($MobileRoot, "").TrimStart("\")
      Write-Host "  Sources modifiees depuis le dernier build !" -ForegroundColor DarkYellow
      Write-Host "  Fichier le plus recent : $relativePath" -ForegroundColor Gray
      Write-Host "  Date fichier : $($newestDate.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
      Write-Host "  Date APK     : $($apkDate.ToString('yyyy-MM-dd HH:mm:ss'))" -ForegroundColor Gray
      $needsBuild = $true
    } else {
      Write-Host "  [OK] APK a jour - aucune source modifiee depuis le dernier build" -ForegroundColor Green
    }
  }

  if ($needsBuild -and -not $buildSkipped) {
    Write-Host ""
    Write-Host "  Compilation debug + installation sur $deviceName ..." -ForegroundColor Yellow
    Write-Host "  (cela peut prendre 1-3 minutes)" -ForegroundColor Gray
    Write-Host ""

    $buildStart = Get-Date
    $androidDir = "$MobileRoot\android"

    # Lancer gradlew installDebug (compile + installe sur le device)
    $buildProcess = Start-Process -FilePath $GradlewPath `
      -ArgumentList "app:installDebug" `
      -WorkingDirectory $androidDir `
      -PassThru `
      -Wait `
      -NoNewWindow

    $buildDuration = ((Get-Date) - $buildStart).TotalSeconds
    $buildDurationStr = [math]::Round($buildDuration, 0)

    if ($buildProcess.ExitCode -eq 0) {
      Write-Host "  [OK] Build + install reussi (${buildDurationStr}s)" -ForegroundColor Green
    } else {
      Write-Host "  [ECHEC] Build echoue (exit code $($buildProcess.ExitCode))" -ForegroundColor Red
      Write-Host "  L'app existante sera utilisee si deja installee." -ForegroundColor DarkYellow
    }
  }
} elseif ($SkipBuild -and $deviceDetected) {
  Write-Host "[3/8] Build mobile skip (-SkipBuild)" -ForegroundColor Gray
} else {
  Write-Host "[3/8] Build mobile skip (aucun telephone)" -ForegroundColor Gray
}

# -------------------------------------------------------------------
# 4. Amplify Sandbox (optionnel)
# -------------------------------------------------------------------
if (-not $SkipSandbox -and -not $StubMode) {
  Write-Host ""
  Write-Host "[4/8] Lancement Amplify sandbox..." -ForegroundColor Yellow

  if (Test-Path "$MobileRoot\amplify") {
    Start-Process wt -ArgumentList "new-tab --title `"Amplify Sandbox`" -d `"$MobileRoot`" cmd /k `"npx ampx sandbox`""
    Write-Host "  Sandbox lance dans un nouvel onglet Windows Terminal" -ForegroundColor Green
    Write-Host "  Attendez que le sandbox soit pret avant de continuer..." -ForegroundColor DarkYellow
    Start-Sleep -Seconds 5
  } else {
    Write-Host "  [SKIP] Dossier TourGuide/amplify non trouve - lancez le sandbox manuellement" -ForegroundColor DarkYellow
  }
} else {
  Write-Host ""
  $skipReason = if ($StubMode) { "mode stubs" } else { "-SkipSandbox" }
  Write-Host "[4/8] Sandbox skip ($skipReason)" -ForegroundColor Gray
}

# -------------------------------------------------------------------
# 5. Serveur Next.js
# -------------------------------------------------------------------
Write-Host ""
Write-Host "[5/8] Lancement serveur Next.js (port $Port)..." -ForegroundColor Yellow

$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -First 1

if ($portInUse) {
  Write-Host "  Port $Port deja occupe (PID $($portInUse.OwningProcess)) - serveur probablement actif" -ForegroundColor Green
} else {
  if ($StubMode) {
    $devCmd = "set NEXT_PUBLIC_USE_STUBS=true && set FORCE_REAL_API=false && npm run dev"
  } else {
    $devCmd = "npm run dev"
  }

  Start-Process wt -ArgumentList "new-tab --title `"Next.js Dev`" -d `"$ProjectRoot`" cmd /k `"$devCmd`""
  Write-Host "  Serveur lance dans un nouvel onglet Windows Terminal" -ForegroundColor Green
}

# -------------------------------------------------------------------
# 6. Metro Bundler + lancement appli mobile
# -------------------------------------------------------------------
Write-Host ""
if ($deviceDetected) {
  Write-Host "[6/8] Lancement appli mobile..." -ForegroundColor Yellow

  # Verifier si Metro tourne deja (port 8081)
  $metroPort = 8081
  $metroRunning = Get-NetTCPConnection -LocalPort $metroPort -ErrorAction SilentlyContinue | Select-Object -First 1

  if ($metroRunning) {
    Write-Host "  Metro bundler deja actif (port $metroPort)" -ForegroundColor Green
  } else {
    # Verifier node_modules mobile
    if (Test-Path "$MobileRoot\node_modules" -PathType Container) {
      Start-Process wt -ArgumentList "new-tab --title `"Metro Bundler`" -d `"$MobileRoot`" cmd /k `"npx react-native start`""
      Write-Host "  Metro bundler lance dans un nouvel onglet Windows Terminal" -ForegroundColor Green
      Write-Host "  Attente demarrage Metro (5s)..." -ForegroundColor Gray
      Start-Sleep -Seconds 5
    } else {
      Write-Host "  [WARN] node_modules mobile manquant - npm install dans $MobileRoot" -ForegroundColor DarkYellow
    }
  }

  # Lancer l'appli sur le telephone
  $appInstalled = & adb -s $deviceSerial shell pm list packages $MobilePackage 2>&1
  if ($appInstalled -match $MobilePackage) {
    Write-Host "  Lancement de l'appli sur $deviceName ..." -ForegroundColor Gray
    & adb -s $deviceSerial shell am force-stop $MobilePackage 2>&1 | Out-Null
    & adb -s $deviceSerial shell am start -n "${MobilePackage}/${MobileActivity}" 2>&1 | Out-Null
    Write-Host "  [OK] Appli lancee sur le telephone" -ForegroundColor Green
  } else {
    Write-Host "  [SKIP] App non installee - installez d'abord :" -ForegroundColor DarkYellow
    Write-Host "         cd $MobileRoot\android && gradlew.bat app:installDebug" -ForegroundColor Gray
  }
} else {
  Write-Host "[6/8] Mobile skip (aucun telephone detecte)" -ForegroundColor Gray
}

# -------------------------------------------------------------------
# 7. Health check — attendre que le serveur web reponde
# -------------------------------------------------------------------
Write-Host ""
Write-Host "[7/8] Attente du serveur http://localhost:${Port} ..." -ForegroundColor Yellow

$baseUrl = "http://localhost:$Port"
$elapsed = 0
$ready = $false

while ($elapsed -lt $TimeoutSeconds) {
  try {
    $response = Invoke-WebRequest -Uri $baseUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
      $ready = $true
      break
    }
  } catch {
    # Serveur pas encore pret
  }
  Write-Host "  Attente... (${elapsed}s)" -ForegroundColor Gray
  Start-Sleep -Seconds 3
  $elapsed += 3
}

if (-not $ready) {
  Write-Host "  [TIMEOUT] Le serveur n'a pas repondu apres $TimeoutSeconds s" -ForegroundColor Red
  Write-Host "  Verifiez le terminal Next.js pour les erreurs." -ForegroundColor Red
  exit 1
}

Write-Host "  Serveur pret!" -ForegroundColor Green

# -------------------------------------------------------------------
# 8. Ouverture des pages web
# -------------------------------------------------------------------
Write-Host ""
Write-Host "[8/8] Ouverture des pages dans le navigateur..." -ForegroundColor Yellow

$guideUrl = "${baseUrl}/guide/login"
$adminUrl = "${baseUrl}/admin/moderation"

Write-Host "  Ouverture Guide Login - $guideUrl" -ForegroundColor Gray
Start-Process $guideUrl
Start-Sleep -Milliseconds 800

Write-Host "  Ouverture Admin Moderation - $adminUrl" -ForegroundColor Gray
Start-Process $adminUrl

# -------------------------------------------------------------------
# Resume
# -------------------------------------------------------------------
$catalogueUrl = "${baseUrl}/catalogue"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Sanity Check pret!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  WEB - Pages ouvertes :" -ForegroundColor White
Write-Host "    Guide  : $guideUrl" -ForegroundColor White
Write-Host "    Admin  : $adminUrl" -ForegroundColor White
Write-Host ""
if ($deviceDetected) {
  Write-Host "  MOBILE - $deviceName :" -ForegroundColor White
  Write-Host "    App TourGuide lancee" -ForegroundColor White
  Write-Host "    Metro bundler : http://localhost:8081" -ForegroundColor White
  Write-Host ""
}
Write-Host "  Checklist web :" -ForegroundColor Yellow
Write-Host "    [ ] Page Guide login s'affiche correctement"
Write-Host "    [ ] Connexion Guide fonctionne"
Write-Host "    [ ] Dashboard Guide charge (tours, stats)"
Write-Host "    [ ] Studio : creer/ouvrir une session"
Write-Host "    [ ] Page Admin moderation s'affiche"
Write-Host "    [ ] Connexion Admin fonctionne"
Write-Host "    [ ] File de moderation visible"
Write-Host "    [ ] Catalogue public accessible : $catalogueUrl"
Write-Host ""
if ($deviceDetected) {
  Write-Host "  Checklist mobile :" -ForegroundColor Yellow
  Write-Host "    [ ] App demarre sans crash"
  Write-Host "    [ ] Ecran d'accueil (HomeScreen) s'affiche"
  Write-Host "    [ ] Catalogue : liste des tours visibles"
  Write-Host "    [ ] Ouvrir un tour -> detail + carte"
  Write-Host "    [ ] Lancer un parcours fictif (lecture audio)"
  Write-Host "    [ ] Connexion Guide dans l'app"
  Write-Host "    [ ] Dashboard Guide mobile charge"
  Write-Host "    [ ] Capture terrain (LiveCapture) demarre"
  Write-Host "    [ ] GPS + enregistrement audio fonctionnent"
  Write-Host "    [ ] Retour accueil sans crash"
  Write-Host ""
}
Write-Host "  Commandes utiles :" -ForegroundColor Gray
Write-Host "    npm test              # Tests unitaires web (399 tests)"
Write-Host "    npm run e2e           # Tests E2E Playwright (16 tests)"
Write-Host "    npm run e2e:ui        # E2E avec interface visuelle"
if ($deviceDetected) {
  Write-Host "    cd ..\TourGuide && npm test  # Tests unitaires mobile (3310 tests)"
}
Write-Host ""
