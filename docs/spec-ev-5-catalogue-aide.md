# EV-5 — Découverte et aide visiteur

## Intention

Conserver la recherche de ville et les filtres de visites dans l’URL, avec compteur, effacement et résultat vide utile. Filtrer par langue réellement vendue, durée renseignée et gratuité issue de la politique existante. Ne pas inventer de thèmes ou de valeurs manquantes.

## Carte et tâches

- `src/app/catalogue/catalogue-view-cities.tsx:112` : recherche persistante à la saisie et au retour navigateur.
- `src/app/catalogue/[city]/tour-list-filter.tsx:53` : langue, durée/prix, compteur et réinitialisation.
- Pages ville FR/EN : initialisation serveur des paramètres.
- Pages aide FR/EN : section visiteur avant création, conservation des anciennes ancres créateur.

## Présentation

Conserver les blocs de destinations et tokens EV-2. Filtres avec champs de 44 pixels en ligne sur ordinateur, retour à la ligne sur téléphone ; pas de tiroir qui masque l’état actif. Aide sous forme de questions lisibles, avec accès compte et catalogue.

## Matrice et acceptation

URL copiée/rechargée → mêmes filtres. Retour navigateur → recherche/filtres conservés. Paramètre invalide → valeur par défaut. Durée absente → exclue d’une plage explicite. Aucun résultat → effacement disponible. Compte commun, paiement confirmé, écoute web, langues, reprise locale et hors connexion expliqués sans promesse de GPS écran éteint ni téléchargement audio web. Vérifier clavier, 320–1440 pixels, FR/EN et tests des filtres.
