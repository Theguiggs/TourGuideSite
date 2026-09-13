# EV-2 — Accueil consacré aux visites

Statut : réalisé localement, sans push ni déploiement. Dépendances : EV-1 et socle LW locaux.

En tant que visiteur, je comprends dès l’accueil que je peux chercher une visite audio, consulter son contenu et écouter sur le site. Je peux retrouver mes visites sans traverser un parcours de création.

## Acceptation

- Accueil FR/EN : promesse visiteur, recherche de ville fonctionnelle, action Trouver une visite et lien Mes visites.
- Destinations et suggestions issues des visites publiées, sans contenu fictif ni chiffres commerciaux inventés ; état vide/réseau utile.
- Recherche accessible sans compte et transmissible au catalogue, accents et casse tolérés.
- Création expliquée sur `/creer-des-visites` et `/en/create-tours` ; anciens accès guide conservés.
- Métadonnées, partage, sitemap et navigation alignés dans les deux langues.
- Présentation fluide du téléphone à l’ordinateur ; premier écran 390 pixels : titre, promesse et recherche visibles.
- Retour à une écoute locale proposé seulement pour une reprise valide associée à une visite encore publiée, sans autoplay ni présomption d’achat.
- Tests, trois revues indépendantes, corrections et commit local en français.

Spécification : [spec-ev-2](../docs/spec-ev-2-accueil-visiteur.md).

## Réalisation et preuves

Composants communs dans `src/components/home/`, sélection publiée dans `src/lib/catalogue/home-selection.ts`, pages publiques FR/EN et créateur, métadonnées et images OG, recherche native du catalogue, navigation et sitemap mis à jour. Ancre neutre `#itineraire` ajoutée à la fiche pour retrouver une écoute sans la lancer.

Validation : 288 suites Jest / 2497 tests réussis, compilation, lint et vérification TypeScript réussis ; quatre scénarios navigateur EV-2 réussis. Trois revues indépendantes et corrections consignées dans la [revue EV-2](revue-ev-2.md).

Aperçus : [téléphone](../docs/verification-ev2/accueil-fr-mobile.png), [ordinateur](../docs/verification-ev2/accueil-fr-ordinateur.png). La recette physique et publique reste à faire ; la fiche, l’achat et l’écoute mobile constituent EV-3.
