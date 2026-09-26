# Proposition de réorganisation de l’espace Bmad

Rapport du 26 septembre 2026 — soumis à validation. Aucun déplacement, nettoyage, changement de branche ou suppression réalisé pendant cet audit.

## 1. Recommandation

Conserver `C:\Projects\Bmad` comme espace de travail, avec les deux dépôts `TourGuideApp` et `TourGuideWeb` à leur emplacement actuel. Regrouper les worktrees actifs dans `.worktrees/app/` et `.worktrees/web/`, fermer progressivement les worktrees devenus inutiles, puis ranger les livrables et archives.

Ne pas transformer immédiatement cet ensemble en monorepo : ce serait un chantier distinct, sans nécessité pour résoudre l’encombrement actuel. Une branche Git occupe peu de place ; ce sont surtout ses dossiers de travail, dépendances et compilations qui multiplient les fichiers.

## 2. Constats vérifiés

La racine comporte **38 répertoires** et n’est **pas un dépôt Git**. Les fichiers placés directement à la racine et les dossiers transverses ne sont donc pas couverts par les historiques des deux dépôts. Une éventuelle sauvegarde externe n’a pas été vérifiée.

| Indicateur | Application | Site web | Total |
|---|---:|---:|---:|
| Branches locales | 41 | 44 | 85 |
| Arbres Git enregistrés, dépôt principal inclus | 18 | 20 | 38 |
| Branches dont le sommet est inclus dans `origin/main` local | 24 | 31 | 55 |
| Branches avec suivi distant indiqué `gone` | 10 | 6 | 16 |
| Branches sans upstream configuré | 15 | 17 | 32 |
| Stashes | 0 | 2 | 2 |

Ces catégories se recoupent. « Sans upstream » ne prouve pas qu’une branche n’a jamais été publiée ; « gone » ne prouve pas qu’elle peut être supprimée.

Sur les 38 arbres enregistrés, 36 sont dans Bmad, dont les deux dépôts principaux ; deux sont dans le dossier temporaire Windows de Claude. `.worktrees/TourGuideApp` est en plus une **jonction vers le dépôt principal**, pas une copie indépendante. Elle ne doit pas être comptée comme un worktree supplémentaire.

Les dépôts principaux sont actuellement ouverts sur :

- application : `chore/play-review-prep` ;
- site : `feat/lw-1-lecteur-scene`.

La branche `main` de l’application est ouverte dans le dossier temporaire `scratchpad/app-tree`. Celle du site est ouverte dans `.fix-web-e2e`. Leurs références locales sont respectivement en retard de 10 et 11 commits sur `origin/main` connu localement. Ces emplacements rendent la navigation et le choix de la branche de référence difficiles.

Le dépôt distant du site s’appelle `Theguiggs/TourGuideSite`, alors que son dossier local est `TourGuideWeb` : documenter cette correspondance suffit ; un renommage n’est pas nécessaire.

Le relevé des volumes totalise **55,25 Go de fichiers mesurés** dans les répertoires racine : `TourGuideApp` représente 19,18 Go, `.worktrees` 12,78 Go et `TourGuideWeb` 8,17 Go. Ce sont des tailles logiques, hors jonctions, pas une promesse d’espace disque récupérable. Le parcours de `.worktrees` a rencontré 86 erreurs de lecture : son volume est partiel. Le dossier `backups` ne contient que 21 fichiers pour environ 10 Ko ; il ne constitue donc pas, à lui seul, une copie complète de cet espace.

## 3. Travail à préserver avant toute fermeture

| Emplacement | État observé | Traitement proposé |
|---|---|---|
| `TourGuideApp` | 3 fichiers suivis modifiés | Conserver ; enregistrer séparément les modifications avant toute bascule de branche |
| `TourGuideWeb` | 47 fichiers suivis modifiés et 141 entrées non suivies | Priorité de sauvegarde ; séparer le contenu éditorial et le code lors de la revue |
| `.content-expansion` | 5 fichiers suivis modifiés et 23 entrées non suivies ; sommet non inclus dans `origin/main` | Conserver comme chantier actif et comparer avec les narrations modifiées du dépôt web principal |
| `.worktrees/TourGuideApp-guide-metadata` | Script non suivi `scripts/migrate-guide-visit-photos.mjs` | Sauvegarder/revoir ce script et les manifestes de migration ignorés avant fermeture |
| Temporaire Claude `scratchpad/app-tree` | 2 145 suppressions de fichiers suivis signalées | Examiner comme arbre incomplet ; ne pas considérer ces suppressions comme un changement à committer |
| Temporaire Claude `scratchpad/prod-tree` | 1 955 suppressions de fichiers suivis signalées ; HEAD détachée | Examiner l’état incomplet et préserver sa référence avant désenregistrement éventuel |

Les nombres d’entrées non suivies viennent de `git status --untracked-files=normal` : un répertoire peut compter pour une seule entrée. Les deux stashes du site doivent également être examinés et préservés.

Un état Git propre ne signifie pas un dossier jetable : certains arbres contiennent des `.env`, des sorties Amplify, des manifestes, des fichiers d’authentification de tests ou des résultats ignorés. Leur contenu n’a pas été exposé par cet audit.

## 4. Réduire les worktrees sans perdre les branches

### A. Chantiers « visites personnalisées »

Les sommets de toutes les branches locales `feat/visites-personnalisees-story-*` sont ancêtres de `feat/visites-personnalisees-story-12`, dans chacun des deux dépôts. Les 20 worktrees de cette série sont propres pour les fichiers suivis et non suivis visibles par Git.

**Proposition : conserver deux worktrees, un par dépôt, sur la story 12 ; fermer les 18 worktrees intermédiaires après contrôle des fichiers ignorés et de leur utilisation. Garder d’abord toutes les branches.** Cette inclusion dans story 12 ne signifie pas que le chantier est intégré à `main` : les deux branches story 12 ne le sont pas dans l’état local observé.

Les deux dossiers nommés `visites-personnalisees-story-11-*` portent actuellement la branche story 12. Les renommer selon le chantier, par exemple `.worktrees/app/visites-personnalisees` et `.worktrees/web/visites-personnalisees`, évitera de nouvelles discordances à chaque story.

### B. Autres worktrees candidats à fermer

Ces 12 worktrees sont propres et leur sommet est inclus dans `origin/main` local. Leur fermeture reste conditionnée à la vérification de leur usage et de leurs fichiers ignorés :

- application : `.worktrees/gemini-38-flash-tts-app`, `.worktrees/rejected-tour-editing`, `TourGuideApp-account-deletion`, `TourGuideApp-appsync-hardening` ;
- site : `.fix-web-e2e`, `.release-web-i18n`, `.seo-multilingue`, `.worktrees/gemini-38-flash-tts-web`, `.worktrees/route-validation-deploy`, `.worktrees/TourGuideWeb-guide-recording`, `TourGuideWeb-seo`, `TourGuideWeb-seo-free`.

Avec les 18 worktrees intermédiaires de la série précédente, cela donne **30 candidats à fermeture**, sans supprimer leurs branches. Après leur fermeture, il resterait 8 arbres enregistrés, dont les deux temporaires anormaux et le worktree contenant le script de migration à préserver. Cette réduction est une cible conditionnelle, pas une autorisation de suppression.

### C. Branches locales

Le nettoyage des branches vient après celui des dossiers. Vérifier les références distantes actualisées et les éventuelles fusions par squash avant de statuer. Préserver les références des chantiers non intégrés ; supprimer uniquement les branches explicitement classées comme terminées et sauvegardées. Ne pas appliquer de suppression massive aux 16 branches `gone`.

Objectif de fonctionnement : les deux dépôts permanents et un ou deux chantiers simultanés par dépôt, avec dérogation documentée pour les tests ou releases. Un worktree par chantier actif suffit généralement ; une story terminée n’a pas besoin de garder son propre dossier.

## 5. Arborescence proposée

```text
Bmad/
├── README.md                   # Carte de l’espace, dépôts, commandes et règles
├── TourGuideApp/               # Dépôt application, emplacement conservé
├── TourGuideWeb/               # Dépôt site, emplacement conservé
├── .worktrees/
│   ├── app/<chantier>/
│   └── web/<chantier>/
├── _bmad/                      # Installation BMAD conservée
├── _bmad-output/               # Livrables BMAD conservés
├── .agents/ .claude/ .codex/    # Configurations des assistants conservées
├── docs/                       # Documentation transverse et décisions
├── design/                     # Sources graphiques et livrables UX
├── artifacts/                  # Exports, captures, traces, livrables générés
│   ├── screenshots/
│   ├── playstore/
│   ├── builds/
│   ├── reports/
│   └── tmp/
├── archive/                    # Historique identifié, avec index et date
├── backups/                    # Sauvegardes avec périmètre et restauration décrits
├── scripts/                    # Utilitaires transverses
├── deploy/                     # Maintenu jusqu’à clarification de sa source
└── design-system/              # Maintenu jusqu’à comparaison des trois versions
```

Les scripts `start-dev.ps1` et `kill-dev.ps1` peuvent rester à la racine comme points d’entrée. Les dossiers `deploy` et `design-system` sont conservés provisoirement, car leur déplacement exige des vérifications supplémentaires.

## 6. Proposition de classement des autres dossiers

| Actuel | Destination ou décision proposée |
|---|---|
| `screenshots`, `playstore-screenshots`, `playstore-assets` | `artifacts/screenshots` et `artifacts/playstore`, avec sous-dossiers source distincts pour éviter les collisions |
| `.deploy-artifacts`, `microservice.zip` | `artifacts/builds`, datés et associés au commit source quand il est connu |
| `.tmp`, `.tmp-e2e-*` | `artifacts/tmp` ; suppression ultérieure seulement après identification des pièces utiles |
| `output` | Trier par contenu avant migration vers `artifacts` ; le nom seul ne prouve pas que tout est régénérable |
| `design-artifacts` | Arborescence sans fichiers lors du relevé ; conserver si attendue par WDS, sinon retirer après contrôle des références |
| `design` | Garder les sources et maquettes ; séparer les exports générés |
| `TourGuide` | Contient des documents BMAD, pas un troisième dépôt applicatif ; rapprocher de `_bmad-output` après comparaison, archiver les versions remplacées |
| `_archive-audio` | `archive/audio`, avec inventaire des sources et possibilité de régénération |
| `.fix-app-ci` | Copie de travail sans `.git` détecté, contenant du code : comparer aux dépôts avant tout archivage ou nettoyage |
| `TourGuideApp-locktest` | Aucun fichier ni `.git` détecté ; candidat au retrait après contrôle de son utilisation |
| `microservice-build` | Comparer ses trois fichiers au microservice de `TourGuideWeb` ; ne pas assimiler automatiquement cette copie à un cache |
| Fichiers `.xlsx`, JSON de contenu, rapports et prompts à la racine | Classer selon leur usage : documentation, données sources ou artefacts ; comparer avant fusion de noms |
| `toSave` | Vérifier localement la nature du fichier JSON avant de le ranger ; ne pas l’inclure automatiquement dans un dépôt ou une archive partageable |
| `.github` à la racine | Vérifier les workflows et leur provenance ; ce dossier hors dépôt n’active pas à lui seul les workflows des deux dépôts distants |

## 7. Dépendances à respecter

- BMAD configure explicitement `_bmad-output/planning-artifacts`, `_bmad-output/implementation-artifacts` et `docs` dans `_bmad/bmm/config.yaml` : les conserver lors de la première phase.
- `start-dev.ps1` attend `TourGuideWeb` et `TourGuideWeb/microservice` sous la racine.
- `deploy/vps-prepare-lot2.ps1` et certains scripts de migration contiennent des chemins absolus `C:/Projects/Bmad/...`.
- Le build web `TourGuideWeb/amplify.yml` organise un répertoire frère `TourGuideApp` pour les types de schéma. Toute nouvelle profondeur de worktree web doit être vérifiée vis-à-vis des imports et de la résolution locale du schéma.
- Les deux applications consomment leur propre `packages/design-system` via une dépendance `file:`. Le `design-system` à la racine constitue une troisième source à comparer, pas une dépendance commune déjà démontrée. Des fixtures des scripts transverses le référencent aussi.
- La jonction `.worktrees/TourGuideApp` peut servir à résoudre les chemins relatifs depuis les worktrees web actuels. Vérifier ses consommateurs avant de la déplacer ou retirer ; ne pas traverser sa cible dans un nettoyage récursif.

Ces observations favorisent un rangement progressif. L’unification du design system, le changement des noms de dépôts et une éventuelle migration en monorepo doivent rester des décisions séparées.

## 8. Plan d’exécution à valider

1. **Préserver.** Relever à nouveau les états Git, sauvegarder les modifications suivies, non suivies, stashes et fichiers ignorés utiles. Conserver des références récupérables pour les commits. Une sauvegarde Git seule ne contient pas le travail non committé ni les fichiers ignorés.
2. **Assainir les worktrees.** Examiner les deux arbres temporaires incomplets. Actualiser les références distantes avant la décision finale. Fermer les candidats confirmés avec les commandes Git appropriées ; ne pas supprimer leurs dossiers à l’aveugle. Aucun `reset --hard`, `clean -fdx` ou recours automatique à `--force`.
3. **Regrouper les actifs.** Déplacer les worktrees retenus via `git worktree move` lorsque applicable, contrôler les jonctions et la résolution des dépendances. Garder les deux dépôts principaux à leur emplacement.
4. **Ranger les livrables.** Déplacer les groupes de fichiers selon la table ci-dessus, en conservant un manifeste ancien chemin → nouveau chemin et sans écraser de collisions. Mettre à jour les références identifiées.
5. **Documenter et prévenir.** Ajouter un README racine, un registre des chantiers actifs et une procédure courte de fermeture. Décider où versionner les scripts et documents transverses actuellement hors dépôt ; éviter un `git add .` global de Bmad.
6. **Nettoyer les branches en second passage.** Après vérification des fusions et sauvegardes, proposer la liste exacte des branches locales supprimables. Aucune suppression de branche distante dans le périmètre proposé.

Contrôles d’acceptation : worktrees valides, aucune modification perdue, fichiers préservés comparés aux sauvegardes, démarrage local des projets utilisés, résolution du design system et des types Amplify, liens de documentation et chemins BMAD valides. Les vérifications applicatives seront adaptées aux déplacements effectivement réalisés.

Retour arrière : manifeste de déplacements inversable, sauvegarde des fichiers hors Git, références de branches conservées. Les nettoyages irréversibles de sauvegardes restent hors de cette première réorganisation.

## 9. Périmètre de validation recommandé

**Valider les étapes 1 à 5**, avec conservation initiale de toutes les branches, des deux dépôts principaux et des chemins BMAD. Les 30 fermetures envisagées restent soumises à leurs contrôles de préservation ; tout élément encore utilisé est maintenu et documenté.

Reporter la suppression des branches, la consolidation du design system et l’éventuel monorepo à des décisions séparées. Cette proposition répond au problème de lisibilité avec un impact limité sur le fonctionnement existant.

## 10. Méthode et limites

Audit local : inventaire des répertoires, `git worktree list --porcelain`, branches et upstreams, stashes, états Git sans verrou optionnel, tests d’ascendance et lecture ciblée des configurations. Aucune synchronisation distante ni vérification des PR sur GitHub ; les résultats relatifs à `origin/main` reflètent les références locales au moment de l’audit. Une non-inclusion par ascendance ne prouve pas l’absence d’une fusion par squash.

L’audit ne démontre pas qu’un worktree est inutilisé par un processus ou une autre session. Les copies sans `.git`, les documents et les fichiers ignorés n’ont pas fait l’objet d’une comparaison exhaustive de contenu. Aucun test applicatif n’a été lancé : aucun code n’a été modifié. Les [annexes](annexes-reorganisation-bmad-2026-09-26.md) donnent le relevé détaillé des worktrees, branches et volumes.
