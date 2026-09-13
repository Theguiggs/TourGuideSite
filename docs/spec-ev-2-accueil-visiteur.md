# Spécification EV-2 — Découvrir les visites dès l’accueil

Date : 13 septembre 2026. Écrite avant implémentation ; plan EV approuvé, EV-1 local `19e5af24`.

## Intention et limites

Remplacer l’accueil créateur par un accueil de découverte. Les routes de compte, le paiement et le lecteur conservent leurs comportements. Le texte créateur est déplacé et harmonisé dans une page dédiée FR/EN ; `/guide/signup` et les ancres de l’aide continuent de fonctionner. Aucun contenu audio, compte ou donnée distante n’est créé.

La recherche de ville utilise un formulaire GET vers le catalogue avec `q`, lisible sans JavaScript. Le catalogue initialise le filtre existant depuis cette recherche. Les filtres avancés et leur synchronisation complète dans l’URL restent EV-5.

Les suggestions proviennent de `getAllTours()` côté serveur, déjà réservé aux publications. Filtre défensif published, identité et slugs exploitables, déduplication, ordre déterministe ; trois suggestions réparties entre villes si possible. Aucun prix ou durée inventé. Un échec ou une liste vide laisse le formulaire de recherche et le lien catalogue accessibles. Le hero est rendu avant les données via Suspense.

Une reprise mémorisée valide et non périmée peut fournir « Retrouver mon écoute » vers le lecteur d’une visite toujours publiée. Ce lien n’affirme ni synchronisation multi-appareils, ni droit d’accès, ni reprise automatique : le lecteur LW vérifie le contenu servi. Sans reprise exploitable ou stockage disponible, ne pas afficher cette invitation. Mes visites reste toujours accessible.

Précision issue de la revue : la cible est `#itineraire`, une ancre neutre. L’ancre historique `#ecouter` possède un comportement de lancement choisi dans LW ; elle ne convient pas à ce simple retour depuis l’accueil.

## Direction visuelle — première passe

Palette existante : papier `#F4ECDD`, encre `#102A43`, grenadine `#C1262A`, mer `#2B6E8A`, fond mer `#D7E5EC`, olive `#6B7A45`. Réutilisation des tokens tg ; pas de nouvelle palette.

Typographie : DM Serif Display pour les titres, Manrope pour la lecture et les commandes. Titres bornés et fluides ; paragraphes de moins de 80 caractères par ligne.

Composition : titre et recherche alignés à gauche, espace suffisant sur ordinateur ; destinations sous forme de noms de villes en blocs colorés propres au catalogue Murmure. Visites choisies avec leur titre réel et leurs informations pratiques. Numérotation uniquement pour les trois étapes chronologiques : choisir, écouter un extrait, profiter de sa visite.

```text
Téléphone                       Ordinateur
Logo / connexion / menu         Logo / découvrir / mes visites / compte
Titre court                     Titre et promesse       Recherche ville
Promesse                        Mes visites             Trouver une visite
Ville / Trouver une visite       Destinations en ligne, selon disponibilité
Mes visites                     Visite 1      Visite 2      Visite 3
Destinations                    Choisir       Écouter       Profiter
Visites, une colonne            Créer des visites (lien secondaire)
Explorer / Mes visites / Compte
```

Relecture avant construction : conserver papier/serif malgré leur fréquence dans les modèles génériques, car ce sont les choix existants de Murmure. Renoncer à un faux téléphone, une illustration décorative ou une promesse chiffrée ; les noms de destinations et les visites réelles portent l’identité du service. Pas d’animation automatique ni de photo générique ajoutée. La création est conservée comme parcours secondaire explicite.

## Carte initiale du code

- `src/app/page.tsx:18` et `src/app/en/page.tsx:13` : accueil et métadonnées créateurs à remplacer.
- `src/app/_components/HeroCta.tsx:23` : bouton responsive existant, conservé pour le parcours créateur.
- `src/lib/api/tours-server.ts:326` : catalogue public serveur.
- `src/app/catalogue/page.tsx:30`, `src/app/en/catalogue/page.tsx:21` : chargement des villes et visites.
- `src/app/catalogue/catalogue-view-cities.tsx:123` : recherche locale par ville et pliage des accents.
- `src/components/catalogue/tour-price-badge.tsx` : vocabulaire du prix et abonnement à réutiliser.
- `src/components/catalogue/scene-player/resume-store.ts:116` : reprise validée avec purge des entrées expirées.
- `src/components/Header.tsx`, `Footer.tsx`, `src/lib/i18n/public-routes.ts`, `src/app/sitemap.ts` : nouvelle destination créateur.
- `src/app/layout.tsx`, `opengraph-image.tsx` : métadonnées et partage génériques ; compléter les pages EN sans hériter d’un texte FR.
- `src/app/__tests__/page.test.tsx` : tests du précédent accueil à remplacer par tests du parcours visiteur et de la page créateur.

## Matrice des cas

| Cas | Attendu |
| --- | --- |
| Accueil anonyme FR/EN | Recherche et catalogue utilisables sans compte |
| Recherche vide | Catalogue complet |
| Recherche Nice, eze ou casse différente | Filtre existant avec accents tolérés |
| Recherche sans résultat | État vide du catalogue, champ modifiable |
| Données lentes | Hero et recherche disponibles avec état de chargement annoncé |
| API rejetée ou sans visites | Message neutre et accès catalogue, aucune visite fictive |
| Visites en brouillon ou archivée | Jamais suggérées |
| Prix/durée manquants | Information omise ou vocabulaire du composant de prix, aucune valeur fabriquée |
| Reprise valide, publiée | Lien vers lecteur, pas d’autoplay |
| Reprise expirée, illisible, supprimée ou déconnexion | Pas de lien de reprise |
| Guide existant | Studio conservé ; page création accessible et traduite |
| Écran 320 à 1440, paysage | Pas de défilement horizontal, recherche et commandes accessibles |

## Validation prévue

Tests unitaires sélection et reprise, composants de recherche et accueil, métadonnées et routes créateur. Production locale Playwright : accueil FR/EN aux largeurs 320/360/390/430/768/1024/1440, recherche réelle vers catalogue, création vers inscription, retour aux comptes EV-1, absence de lecture automatique, accessibilité et captures à 390 et 1440. Réexécuter typecheck, lint, Jest et build. Les essais physiques et le déploiement restent distincts.
