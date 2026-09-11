# Prépare le VPS pour le lot 2 AVANT de fusionner la PR #16 (qui déploie).
# 1) compose à jour (sonde /api/health, hôte audio épinglé, clé ORS serveur)
# 2) ORS_API_KEY dans /opt/murmure/.env
# 3) cache de build Docker libéré (17 Go, disque à 80 %)
# Ne redémarre AUCUN conteneur.
#
# PowerShell 5.1 — exécuter depuis C:\Projects\Bmad\TourGuideWeb :
#   .\deploy\vps-prepare-lot2.ps1

# ─── À REMPLIR ───────────────────────────────────────────────────────────────
$OrsKey = "COLLEZ-ICI-VOTRE-CLE-OPENROUTESERVICE"
# ─────────────────────────────────────────────────────────────────────────────

$Key  = "$HOME\.ssh\id_ed25519_murmure"
$Host_ = "root@23.88.98.169"
$Compose = "C:\Projects\Bmad\TourGuideWeb\deploy\docker-compose.yml"

if ($OrsKey -eq "" -or $OrsKey -like "COLLEZ-ICI*") {
  Write-Host "Renseignez `$OrsKey en tête du script." -ForegroundColor Red
  exit 1
}
if (-not (Test-Path $Compose)) { Write-Host "Compose introuvable : $Compose" -ForegroundColor Red; exit 1 }

Write-Host "1/3  Copie du compose vers le VPS (en .new, installé après validation)..."
scp -i $Key $Compose "${Host_}:/opt/murmure/docker-compose.yml.new"
if ($LASTEXITCODE -ne 0) { Write-Host "scp a échoué." -ForegroundColor Red; exit 1 }

# Script distant, en ASCII pur (il transite par stdin). Le jeton __ORS_KEY__
# est remplacé localement : la clé ne passe jamais en argument de commande.
$Remote = @'
set -e
cd /opt/murmure

echo "--- compose : validation puis installation"
cp .env .env.bak-$(date +%Y%m%d-%H%M%S)
cp docker-compose.yml docker-compose.yml.bak-$(date +%Y%m%d-%H%M%S)
if docker compose -f docker-compose.yml.new config -q; then
  mv docker-compose.yml.new docker-compose.yml
  echo "compose installe"
else
  echo "compose INVALIDE : ancien conserve" >&2
  rm -f docker-compose.yml.new
  exit 1
fi

echo "--- .env : ORS_API_KEY"
tail -c1 .env | read -r _ || echo >> .env
if grep -q '^ORS_API_KEY=' .env; then
  sed -i 's|^ORS_API_KEY=.*|ORS_API_KEY=__ORS_KEY__|' .env
  echo "ORS_API_KEY remplacee"
else
  echo 'ORS_API_KEY=__ORS_KEY__' >> .env
  echo "ORS_API_KEY ajoutee"
fi

echo "--- cache de build Docker"
docker builder prune -af | tail -1

echo "--- verification"
echo "variables .env : $(sed -E 's/=.*/=.../' .env | tr '\n' ' ')"
echo "compose porte /api/health : $(grep -c 'api/health' docker-compose.yml)  ALLOWED_AUDIO_HOSTS : $(grep -c ALLOWED_AUDIO_HOSTS docker-compose.yml)  ORS_API_KEY : $(grep -c ORS_API_KEY docker-compose.yml)"
df -h / | tail -1
echo "Termine. Rien n'a ete redemarre : la fusion de la PR #16 deploiera."
'@

$Remote = $Remote.Replace('__ORS_KEY__', $OrsKey)

Write-Host "2/3  Installation du compose, .env, nettoyage du cache..."
$Remote | ssh -i $Key $Host_ 'bash -s'
if ($LASTEXITCODE -ne 0) { Write-Host "Le script distant a échoué (voir ci-dessus)." -ForegroundColor Red; exit 1 }

Write-Host "3/3  OK. Prochaine étape : fusionner la PR quand le CI est vert." -ForegroundColor Green
