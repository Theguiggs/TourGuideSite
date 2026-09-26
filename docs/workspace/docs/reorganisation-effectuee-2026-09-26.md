# Réorganisation effectuée — 26 septembre 2026

## Résultat

La réorganisation des étapes 1 à 5 du rapport validé est terminée. La racine passe de **38 à 18 répertoires**. Les deux dépôts principaux et les chemins BMAD sont conservés.

| Indicateur | Avant | Après |
|---|---:|---:|
| Arbres Git enregistrés, principaux inclus | 38 | 6 |
| Branches locales | 85 | 85 |
| Stashes | 2 | 2 |
| Worktrees secondaires conservés | 36 | 4 |

**32 worktrees fermés** : les 30 candidats validés, puis les deux arbres temporaires incomplets de Claude. Ces derniers ne contenaient plus de fichiers de travail ; après vérification, leurs fichiers suivis manquants ont été restaurés depuis leur HEAD, puis les arbres ont été retirés avec la commande Git normale. Le commit détaché et les stashes ont aussi des références de sauvegarde.

**Quatre worktrees déplacés** dans `.worktrees/app` et `.worktrees/web`. Leurs branches et leurs travaux locaux sont conservés. Voir le [registre](workspace-worktrees.md).

**26 déplacements de dossiers ou fichiers racine**, sans écrasement : captures, Play Store, builds, exports, données d’import, documents et copies historiques. Les dossiers devenus vides `output` et `TourGuideApp-locktest` ont été retirés. Les fichiers sources uniques des anciennes copies ont été archivés, pas supprimés.

## Préservation et contrôles

- Bundles complets des deux dépôts créés et vérifiés. Les 85 références de branches et les deux stashes sont identiques avant et après l’opération.
- Modifications suivies, index, fichiers non suivis et fichiers ignorés utiles sauvegardés localement. Les configurations privées restent dans des sauvegardes à accès Windows restreint.
- **30 223 fichiers locaux** des six arbres conservés comparés aux empreintes de sauvegarde : aucune différence. Les états Git de ces arbres correspondent à ceux relevés avant l’opération.
- **1 690 fichiers rangés** vérifiés par SHA-256 avant et après déplacement. Une adaptation ultérieure des liens d’un document historique est enregistrée séparément, avec copie originale et empreintes.
- Neuf liens de ce document ont été adaptés à sa nouvelle profondeur et leurs cibles existent.
- Résolution de TypeScript et du design system vérifiée dans les deux dépôts principaux et les deux worktrees des visites personnalisées.
- Démarrage du worktree web déplacé : Next prêt, `/favicon.ico` en HTTP 200. Démarrage du worktree mobile déplacé : Metro `/status` en HTTP 200, réponse `packager-status:running`.
- Les processus de test ont été arrêtés. Les ajustements automatiques de Next à `tsconfig.json` et `next-env.d.ts` ont été annulés après les contrôles ; le cache du test a été rangé dans `artifacts/tmp/validation-next-2026-09-26`.

Ces contrôles valident le rangement, la préservation des fichiers et le démarrage des outils. Ils ne constituent pas une recette fonctionnelle complète des applications ni une validation de déploiement. Aucune suite fonctionnelle complète n’a été lancée pour ce changement de répertoires.

## Dépendances et archives

Les dépendances du dernier worktree web étaient hébergées par un ancien worktree. Leur dossier physique a été conservé dans le worktree actif et son lien vers le design system a été corrigé. Les jonctions ont été détachées sans traverser leurs cibles avant la suppression des anciens arbres.

`archive/source-copies/fix-app-ci-2026-09-26` conserve 1 120 fichiers hors dépendances : 594 étaient identiques à une copie correspondante des dépôts, 526 différents ou sans correspondance. Les trois fichiers de `microservice-build` et les quatre documents de l’ancien `TourGuide` n’étaient pas des doublons identiques aux emplacements comparés : ils sont conservés respectivement dans l’archive et `docs/legacy-tourguide`.

`deploy`, les trois copies du design system, les configurations des assistants, `_bmad`, `_bmad-output` et la structure WDS restent en place. Les copies du design system n’ont pas été fusionnées. `.github` racine est conservé comme modèle historique hors dépôt.

Les scripts et documents transverses restent hors des deux dépôts applicatifs et bénéficient d’une sauvegarde locale dédiée. Aucun monorepo ni nouveau dépôt distant n’a été créé. Leur versionnement commun pourra être traité séparément, sans engager la racine entière dans Git.

## Utilisation et retour arrière

Le [README racine](../README.md) sert de point d’entrée. `scripts/workspace-status.ps1` affiche l’état courant sans traverser les jonctions. La [procédure d’entretien](workspace-maintenance.md) explique la création, la fermeture et la restauration des worktrees.

Les sauvegardes et preuves sont dans `backups/reorganisation-2026-09-26/` : bundles, fichiers locaux ZIP, patches, inventaires, rapports de comparaison, journaux de validation et **`operations.jsonl`**, manifeste chronologique des déplacements et retraits. Les branches conservées permettent de recréer les worktrees ; les fichiers locaux utiles sont restaurables depuis les archives.

La suppression des branches, la fusion des copies du design system et le rapprochement des travaux éditoriaux restent hors de cette opération. Les scripts historiques de migration et les déploiements n’ont pas été exécutés.
