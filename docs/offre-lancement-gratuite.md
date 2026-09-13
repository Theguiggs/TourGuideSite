# Offre de lancement gratuite

Toutes les visites publiées sont accessibles aux comptes visiteurs pendant une
fenêtre datée. Les prix et les achats existants restent inchangés. Un visiteur
anonyme conserve l’aperçu d’une étape ; la connexion gratuite ouvre ensuite le
contenu complet. À la date de fin, l’accès promotionnel cesse automatiquement.

Le backend reste l’autorité : il ouvre le contenu, autorise la narration à la
demande et refuse la création des paiements de visite ou de forfait pendant la
campagne. Le Web et l’application lisent les mêmes dates pour leurs badges et
messages. Une configuration absente désactive la campagne ; une configuration
partielle ou invalide bloque les paiements et n’ouvre aucun contenu.

## Variables

Utiliser des instants ISO UTC, avec une fin exclusive :

```text
LAUNCH_FREE_ACCESS_START_AT=2026-10-01T00:00:00.000Z
LAUNCH_FREE_ACCESS_END_AT=2026-11-01T00:00:00.000Z
NEXT_PUBLIC_LAUNCH_FREE_ACCESS_START_AT=2026-10-01T00:00:00.000Z
NEXT_PUBLIC_LAUNCH_FREE_ACCESS_END_AT=2026-11-01T00:00:00.000Z
```

Les variables sans préfixe sont définies pour le déploiement du backend. Les
variables `NEXT_PUBLIC_…` sont définies dans l’hébergement Web. Le déploiement
du backend publie aussi les dates dans `amplify_outputs.json`, utilisé par
l’application mobile. Après ce déploiement, recopier ce fichier dans le Web et
dans le projet mobile distribué avant leurs builds de production.

## Commandes de déploiement

Choisir d'abord les deux instants UTC. Depuis `TourGuideApp`, enregistrer les
variables du pipeline puis lancer le déploiement manuel :

```powershell
gh variable set LAUNCH_FREE_ACCESS_START_AT --body "<DEBUT_ISO_UTC>"
gh variable set LAUNCH_FREE_ACCESS_END_AT --body "<FIN_ISO_UTC>"
gh workflow run deploy-backend.yml --ref main
gh run watch
```

Le workflow produit l’artefact `amplify-outputs-main`. Le télécharger, puis
remplacer `amplify_outputs.json` dans `TourGuideApp` et `TourGuideWeb` avant les
builds clients :

```powershell
gh run download <RUN_ID> --name amplify-outputs-main --dir .\sortie-amplify
Copy-Item .\sortie-amplify\amplify_outputs.json C:\Projects\Bmad\TourGuideApp\amplify_outputs.json
Copy-Item .\sortie-amplify\amplify_outputs.json C:\Projects\Bmad\TourGuideWeb\amplify_outputs.json
```

La release Android échoue volontairement si ce fichier ne porte pas les trois
champs d’autorité de la campagne et les deux dates configurées.

Sur le VPS, ajouter les mêmes instants au fichier `/opt/murmure/.env` avec le
préfixe public, puis reconstruire le site :

```bash
NEXT_PUBLIC_LAUNCH_FREE_ACCESS_START_AT=<DEBUT_ISO_UTC>
NEXT_PUBLIC_LAUNCH_FREE_ACCESS_END_AT=<FIN_ISO_UTC>
cd /opt/murmure/TourGuideWeb
git pull --ff-only origin main
cp deploy/docker-compose.yml /opt/murmure/docker-compose.yml
cd /opt/murmure
export BUILD_SHA=$(git -C TourGuideWeb rev-parse --short HEAD)
docker compose up -d --build web caddy
docker compose ps
```

Les deux premières lignes sont à placer dans `/opt/murmure/.env` ; elles ne
doivent pas être exécutées seules dans un terminal éphémère. Le backend se
déploie avant le Web afin que l'interface n'annonce jamais un accès que l'API
n'accorde pas encore.

## Contrôle après déploiement

1. Sans connexion : une étape disponible et aucune donnée privée dans la réponse.
2. Avec un compte gratuit : toutes les étapes et les audios publiés disponibles.
3. Pendant la campagne : aucun PaymentIntent visite ou forfait ne peut être créé.
4. Une seconde avant la fin : accès complet ; à la fin exacte : retour aux droits normaux.
5. Les achats antérieurs restent accessibles après la fin de campagne.
