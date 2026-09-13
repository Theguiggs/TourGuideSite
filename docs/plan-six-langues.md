# Site dans les six langues de l’application

Périmètre confirmé le 13 septembre 2026 : menus et pages aussi, pas seulement
les narrations. Langues : français, anglais, espagnol, allemand, italien,
néerlandais. **État : migration implémentée et recette locale terminée.**

## État réel

Le site public, le Studio et l’administration utilisent les six langues.
Les URL françaises et anglaises sont conservées ; ES/DE/IT/NL utilisent un
préfixe et les mêmes composants métier. Les traductions sont sélectionnées
avant le rendu. Les titres et descriptions publiés suivent la langue choisie,
avec un avertissement lorsqu’un contenu reste dans sa langue source.

La langue de l’interface ne crée aucun audio ni aucun droit supplémentaire.
L’aperçu reste limité à une étape et chaque audio démarre sur action explicite.
Le paiement et le déploiement font l’objet d’un contrôle distinct ; voir
[la recette et ses limites](recette-six-langues-2026-09-13.md).

## Lots de réalisation

1. **Socle partagé** : type unique à six langues, validation, dictionnaires
   typés utilisables côté serveur et client, formats dates/nombres/prix et
   constructeur de routes. Conserver les URL françaises et anglaises.
   Les quatre nouvelles langues utilisent leur préfixe explicite. La langue
   choisie reste visible et persistante pendant le parcours.
2. **Parcours visiteur** : accueil, navigation, connexion, inscription,
   confirmation, récupération du mot de passe, catalogue et filtres,
   bibliothèque, fiche, carte, lecteur et erreurs. Retours d’authentification
   et filtres conservés lors du changement de langue.
3. **Contenus et achat** : brancher les titres/descriptions traduits publiés
   dans les fiches, cartes et métadonnées. Signaler le repli lorsqu’une
   traduction manque. Les audios disponibles restent ceux du serveur.
   Traduire tous les états de paiement : démarrage, attente, vérification,
   refus, accès déjà acquis, succès et erreur réseau.
4. **Pages annexes** : aide, création de visites, profils guides, confidentialité,
   CGU, suppression de compte, consentements, erreurs et pages introuvables.
   Conserver les données légales et liens dans une source commune.
5. **Studio et administration** : migrer la préférence et les messages,
   formulaires, publication, modération, revenus et notifications vers le même
   socle. Conserver les routes protégées et leurs contrôles d’accès.
6. **SEO et installation** : `html lang`, titres et descriptions, canonical,
   hreflang, sitemap, OpenGraph, manifeste et pages hors connexion six langues.
7. **Recette** : parcours complets dans les six langues ; toutes les clés et
   paramètres présents ; aucun repli français silencieux ; clavier, lecteur
   d’écran et affichage 320 à 1440 pixels. Vérifier particulièrement les textes
   plus longs en allemand et néerlandais et la conservation des retours d’achat.

## Carte du code

- Routes/langue : `src/lib/i18n/public-routes.ts`, `src/lib/site.ts`,
  `src/proxy.ts`, `src/app/layout.tsx`.
- Navigation : `src/components/{Header,Footer,SiteChrome}.tsx` et
  `src/components/auth/visitor-bottom-nav.tsx`.
- Compte : `src/lib/auth/visitor-routes.ts`, composants d’authentification.
- Catalogue/écoute : `src/components/catalogue/`, `src/components/home/`,
  `src/app/catalogue/`, `src/app/en/catalogue/`.
- Contenus : `src/lib/api/translated-metadata.ts` et projections catalogue.
- Paiement : `src/components/checkout/` et cartes d’achat des fiches.
- Studio : `src/lib/i18n/studio-locale.tsx`, `src/components/studio/`.
- PWA : `public/sw.js`, `public/offline/`, manifeste.
- Terminologie app : `TourGuideApp/src/i18n/{fr,en,es,de,it,nl}.ts`.

## Critères de livraison

Les six interfaces doivent être réelles avant d’exposer leur sélecteur. Pas
de traduction du DOM après rendu, pas de duplication indépendante de logique
d’achat, pas de traduction inventée des narrations absentes. Relecture
fonctionnelle, cas de bord et preuves pour chaque lot ; commits locaux.
Le déploiement reste une étape distincte.
