# Entretien de l’espace de travail

## Ouvrir un chantier

Vérifier l’état du dépôt et ses worktrees, puis créer une branche et un dossier propres au chantier. Exemple à adapter :

```powershell
git -C TourGuideWeb fetch origin
git -C TourGuideWeb worktree add C:/Projects/Bmad/.worktrees/web/exemple -b feat/exemple origin/main
```

Adapter `exemple` au chantier réel. Employer de préférence un chemin absolu sous `C:/Projects/Bmad/.worktrees/web/<chantier>` ou `C:/Projects/Bmad/.worktrees/app/<chantier>` ; un chemin relatif passé à `git -C ... worktree add` est résolu depuis le dépôt indiqué.

Les imports web du schéma Amplify utilisent un frère `TourGuideApp`. Le groupe `.worktrees/web` contient une jonction vers le dépôt mobile principal pour conserver cette convention. Si un chantier doit utiliser un schéma spécifique d’une branche mobile, le configurer explicitement plutôt que modifier silencieusement cette jonction partagée.

Installer les dépendances selon le lockfile du chantier. Éviter les chaînes de jonctions passant par des worktrees temporaires : leur fermeture casse les consommateurs. Documenter toute dépendance partagée dans le registre.

## Fermer un chantier

1. Vérifier qu’aucun serveur, terminal actif ou autre session ne travaille dans le dossier.
2. Examiner `git status --short`, l’index et les fichiers ignorés utiles : configurations locales, manifestes de migration, exports et résultats.
3. Préserver les modifications, les fichiers non suivis et les fichiers ignorés utiles. Un bundle Git ne sauvegarde pas ces fichiers.
4. Vérifier l’intégration du travail ou conserver sa branche et une sauvegarde Git vérifiée.
5. Retirer le worktree avec `git worktree remove <chemin>`, depuis son dépôt propriétaire. En présence d’un refus, examiner sa cause ; ne pas ajouter automatiquement `--force`.
6. Mettre à jour le registre. La suppression de la branche est une décision séparée.

Avant toute suppression récursive, vérifier le chemin absolu et détacher les jonctions sans toucher à leur cible. Les caches et dépendances peuvent être régénérés ; les configurations locales et données de migration ne doivent pas être traitées comme des caches.

## Restaurer la réorganisation du 26 septembre 2026

Les sauvegardes sont dans `backups/reorganisation-2026-09-26/` :

- `TourGuideApp.bundle`, `TourGuideWeb.bundle` : historiques et références ; vérifiés par `git bundle verify`.
- `repositories-before.json` : branches et stashes avant l’opération.
- `inventory-before.json` et `worktrees/*/manifest.json` : état, fichiers locaux, empreintes et liens avant déplacement.
- `worktrees/*/local-files.zip` : copies des fichiers locaux utiles, configurations comprises.
- `worktrees/*/index.patch` et `working.patch` : différences binaires de l’index et de l’arbre de travail.
- `root-moves.json` : empreintes des fichiers rangés.
- `operations.jsonl` : opérations réellement effectuées, dans leur ordre.

Pour un simple déplacement, inverser l’opération indiquée dans le manifeste après contrôle des collisions. Pour un worktree, employer `git worktree move`, pas un renommage opaque pour Git.

Pour un worktree fermé, sa branche est conservée : le recréer avec `git worktree add <chemin-libre> <branche>`. Pour l’ancien arbre à HEAD détachée, utiliser le commit enregistré avec `git worktree add --detach <chemin-libre> <commit>`.

Restaurer ensuite les fichiers locaux depuis leur archive dans un emplacement de contrôle, comparer les empreintes, puis remettre les seuls fichiers nécessaires. Reconstituer l’index séparément avec le patch d’index si nécessaire ; ne pas appliquer aveuglément les deux patches après avoir écrasé l’arbre avec les copies des fichiers.

Les caches `node_modules`, `.next*`, `.gradle`, compilations Android et caches Python usuels sont exclus des archives de fichiers locaux. Les jonctions sont inventoriées, pas archivées comme des copies de leurs cibles. Réinstaller ou reconnecter les dépendances adaptées au chantier.

Les archives locales peuvent contenir des configurations privées. Le dossier de sauvegarde de cette opération et `backups/local-config` ont des droits limités au compte Windows courant et à SYSTEM. Ne pas publier ces dossiers dans un dépôt.

## Dossiers volontairement conservés

`deploy`, le `design-system` racine, les configurations d’assistants et les chemins BMAD restent en place. Les copies du design system n’ont pas été fusionnées. `design-artifacts` conserve la structure WDS. `.github` à la racine est un modèle historique hors dépôt, pas la CI effective des deux applications.

Les scripts historiques déplacés depuis `.tmp` s’utilisent depuis `artifacts/tmp/workspace-2026-09-26` pour leurs chemins relatifs. Leur jonction `node_modules` et la jonction voisine `TourGuideWeb` conservent leurs imports. Ils peuvent modifier des données distantes : aucun n’a été exécuté pendant le rangement.
