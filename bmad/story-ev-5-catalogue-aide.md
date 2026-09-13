# EV-5 — Catalogue et aide

Statut : implémenté localement ; recette consolidée dans EV-6. Aucun push ni déploiement.

Recherche ville et filtres langue/durée/prix sont conservés dans l’URL, y compris au retour depuis une fiche et à la bascule FR/EN. Initialisation serveur, paramètres invalides neutralisés, compteur, effacement et état vide utile. Les filtres reposent sur les données réellement disponibles.

Une aide visiteur précède le contenu créateur et explique compte commun, paiement, écoute web, langue, reprise locale et limites hors connexion. Les anciennes FAQ ont été harmonisées ; les ancres créateur restent accessibles.

Fichiers : pages catalogue ville FR/EN, `tour-list-filter.tsx`, `catalogue-view-cities.tsx`, `src/lib/catalogue/{filter-url,serialize-filters}.ts`, `Header.tsx`, pages/contenus aide FR/EN et `src/components/catalogue/visitor-help.tsx`.

Spécification : [EV-5](../docs/spec-ev-5-catalogue-aide.md). Trois revues indépendantes ont détecté la langue de filtre non validée et la perte des filtres à la bascule de langue ; ces deux points sont corrigés. Rapport : [recette EV-6](revue-ev-6.md).
