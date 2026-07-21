# Déploiement — murmure-visit.com

## Architecture

Un seul VPS Hetzner, tout mutualisé en Docker Compose, sans GPU.

```
┌─────────────────── VPS Hetzner CX22 ───────────────────┐
│                                                          │
│   caddy  (ports 80/443 — HTTPS auto Let's Encrypt)      │
│     ├── murmure-visit.com / www  →  web:3000             │
│     └── api.murmure-visit.com   →  microservice:8000     │
│                                                          │
│   web          Next.js (TourGuideWeb/Dockerfile.web)     │
│   microservice MarianMT + edge-tts CPU (Dockerfile.cpu)  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Coût estimé : ~4-5 €/mois** (CX22 = 2 vCPU, 4 Go RAM ; viser 8 Go si budget le permet pour MarianMT).

## Fichiers de déploiement

Situés dans `../deploy/` (à la racine de `c:\Projects\Bmad\`) :

| Fichier | Rôle |
|---|---|
| `docker-compose.yml` | Orchestration des 3 conteneurs |
| `Caddyfile` | Routing HTTPS murmure-visit.com + api. |
| `.env.example` | Variables à copier en `.env` sur le VPS |

## Statut actuel

**Déployé en production** — 2026-06-25

- VPS : Hetzner CX22, IP `23.88.98.169`
- SSH : `ssh -i ~/.ssh/id_ed25519_murmure root@23.88.98.169`
- Code : `/opt/murmure/` (TourGuideWeb cloné depuis GitHub, microservice en symlink)
- 3 conteneurs up : `murmure-caddy`, `murmure-web`, `murmure-microservice` (healthy)

## Étapes pour déployer

### 1. Commander le VPS

- **Hetzner CX22** (Ubuntu 24.04 LTS) — [console.hetzner.com](https://console.hetzner.com)
- Si budget : CX32 (8 Go RAM) pour confort MarianMT

### 2. Configurer le DNS

3 enregistrements A vers l'IP du VPS :

```
murmure-visit.com     A  <IP_VPS>
www.murmure-visit.com A  <IP_VPS>
api.murmure-visit.com A  <IP_VPS>
```

### 3. Préparer le VPS (SSH)

```bash
# Installer Docker
curl -fsSL https://get.docker.com | sh

# Ouvrir les ports nécessaires
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw enable

# Créer le dossier de déploiement
mkdir -p /opt/murmure
```

### 4. Déposer le code

```bash
# Depuis le PC (PowerShell) — copier les fichiers de config
scp -i "$HOME\.ssh\id_ed25519_murmure" deploy/docker-compose.yml root@<IP>:/opt/murmure/
scp -i "$HOME\.ssh\id_ed25519_murmure" deploy/Caddyfile root@<IP>:/opt/murmure/

# Sur le serveur — cloner TourGuideWeb
cd /opt/murmure
git clone https://github.com/Theguiggs/TourGuideSite.git TourGuideWeb

# Symlink microservice (il est dans TourGuideWeb mais docker-compose l'attend à la racine)
ln -s /opt/murmure/TourGuideWeb/microservice /opt/murmure/microservice
```

### 5. Créer le `.env`

```bash
cp /opt/murmure/.env.example /opt/murmure/.env
# Editer :
#   DOMAIN=murmure-visit.com
#   API_DOMAIN=api.murmure-visit.com
#   MICROSERVICE_API_KEY=<clé aléatoire longue>
```

### 6. Lancer

```bash
cd /opt/murmure
docker compose up -d --build
docker compose logs -f   # vérifier le cert Let's Encrypt (~30s)
```

### 7. Vérifier

```bash
curl https://murmure-visit.com        # doit répondre 200
curl https://api.murmure-visit.com/health  # doit répondre {"status":"ok"}
```

## Mises à jour

```bash
cd /opt/murmure/TourGuideWeb && git pull
cd /opt/murmure && docker compose up -d --build
```

## Limites connues (V1)

Le microservice est mono-instance : traduction et TTS sérialisés.
La Phase 1 de scaling est implémentée (semaphore asyncio + réponse 429) — suffit pour la V1 avec peu de guides simultanés.

Pour la montée en charge (Phase 3 multi-instance, GPU RunPod) : voir `docs/tts-deployment.md`.
