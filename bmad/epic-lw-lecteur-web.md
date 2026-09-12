# Épopée LW : lecteur web léger (Murmure joue sans l'appli)

Status: draft — rédigée le 2026-09-12 à partir d'un diagnostic du code, aucune story démarrée

<!-- Née le 2026-09-12 d'une question de Steff : « peut-on adapter le site pour qu'il joue le rôle d'appli ? ». Réponse : pas pour l'expérience de marche (GPS en fond impossible en PWA), oui pour un lecteur léger. -->
<!-- Périmètre : TourGuideWeb uniquement. Aucun changement de schéma ni de Lambda. -->

## Pourquoi

Trois usages réels, sans toucher à l'appli :

1. Écoute à domicile, prévisualisation avant achat, relecture après la visite.
2. Vente web à 19,90 € sans commission de store : le visiteur doit pouvoir consommer ce qu'il a payé là où il l'a payé.
3. Couverture iOS tant que la parité iOS n'est pas livrée.

## Ce que le diagnostic a montré (vérifié le 2026-09-12)

- La page `/catalogue/[city]/[tourSlug]` existe (689 lignes) et son îlot `itinerary-list.tsx` **appelle déjà** `getPublishedTourContent` en mode `userPool` : le serveur renvoie, par scène, `audioUrl` et `translatedAudioUrls` **signés**, gatés par l'achat (façade C3, aperçu gratuit = `FREE_PREVIEW_SCENE_COUNT` scènes).
- `mapScenesToPois` (`src/lib/catalogue/scene-pois.ts:29`) **jette** `audioUrl` et `translatedAudioUrls`. L'audio arrive dans le navigateur et n'est jamais joué.
- La CSP autorise déjà `media-src` sur le bucket (`src/lib/security/csp.ts:99`). La `Permissions-Policy` autorise déjà `geolocation=(self)`.
- Les URLs signées expirent au bout de **15 min** (`PUBLISHED_MEDIA_URL_TTL_SECONDS`) ; `mediaExpiresAt` est déjà exposé côté web.
- `public/manifest.json` existe en `display: standalone`, mais **aucun service worker** : le site s'installe sans rien savoir faire hors connexion.
- Leaflet est déjà une dépendance (`react-leaflet`).
- Le seul code audio web est côté Studio (`LanguagePreviewPlayer`, `audio-player-service.ts`) : réutilisable comme référence, pas comme composant visiteur.
- La page affiche encore « Téléchargez Murmure pour profiter de l'expérience audio immersive complète » (`page.tsx:45`) : ce message devient faux dès LW-1 pour la partie écoute.

## Hors périmètre — délibérément, pour toute l'épopée

- **Audio hors-ligne.** Les URLs sont signées 15 min ; mettre l'audio en cache exigerait soit des URLs longues (affaiblit C3), soit un cache chiffré côté navigateur (protection faible). On tranche plus tard, avec des chiffres d'usage.
- **Déclenchement automatique par la position.** Impossible écran éteint en PWA ; écran allumé, c'est un dégradé qu'on ne promet pas. LW-4 se limite à « me situer ».
- **Store via TWA.** Google impose son système de facturation aux biens numériques : cela tuerait l'argument Stripe.
- **Haptique, push, notifications.**

## Stories

| Story | Titre | Dépend de | Estimation |
| --- | --- | --- | --- |
| LW-1 | Écouter une scène déverrouillée sur la page visite | — | 2 j |
| LW-2 | Lecture enchaînée, contrôles écran verrouillé, reprise | LW-1 | 2 j |
| LW-3 | Choix de la langue d'écoute | LW-1 | 1,5 j |
| LW-4 | Carte de l'itinéraire et « me situer » | LW-1 | 2 j |
| LW-5 | PWA installable pour de vrai (service worker, hors-ligne d'accueil) | — | 2 j |
| LW-6 | « Écouter » depuis Mes achats, mesure Amplitude, i18n, a11y | LW-1, LW-2 | 1,5 j |

Total : 11 jours. LW-1 seule livre déjà de la valeur et se démontre en une session.

Ordre conseillé : LW-1 → LW-2 → LW-6 (boucle de valeur fermée), puis LW-3, LW-4, LW-5 dans l'ordre que les usages dicteront.

## Démo de fin d'épopée

Sur un téléphone, sans l'appli : ouvrir Murmure depuis l'écran d'accueil, aller dans Mes achats, lancer une visite achetée en anglais, verrouiller l'écran, passer à la scène suivante depuis l'écran verrouillé, rouvrir : la carte montre où l'on est et quelle étape est la plus proche.

## Fichiers

- `story-lw-1-ecouter-scene.md`
- `story-lw-2-lecture-enchainee-media-session.md`
- `story-lw-3-langue-ecoute.md`
- `story-lw-4-carte-me-situer.md`
- `story-lw-5-pwa-service-worker.md`
- `story-lw-6-mes-achats-mesure-i18n-a11y.md`
