> Version versionn?e de la documentation de l?espace local Bmad, conserv?e dans le d?p?t TourGuideSite. Les chemins d?crits ci-dessous sont relatifs ? la racine de cet espace, pas ? celle du d?p?t web. Les sauvegardes priv?es, caches, archives et changements applicatifs pr?existants ne font pas partie de ce dossier.
>
> Pour ex?cuter le script directement depuis ce d?p?t :
> `powershell -NoProfile -File docs/workspace/scripts/workspace-status.ps1 -WorkspaceRoot C:/Projects/Bmad`
>
> Ces fichiers documentent une r?organisation locale. Les cloner ne d?place aucun dossier et ne ferme aucun worktree.

# Espace de travail Bmad / Murmure

Cet espace contient deux dépôts Git indépendants. Exécuter les commandes Git dans le dépôt concerné ou utiliser `git -C` ; la racine Bmad n’est pas un dépôt.

| Emplacement | Rôle |
|---|---|
| `TourGuideApp/` | Application mobile et backend Amplify — dépôt `Theguiggs/TourGuideApp` |
| `TourGuideWeb/` | Site et microservice — dépôt distant `Theguiggs/TourGuideSite` |
| `.worktrees/app/` | Chantiers mobiles conservés |
| `.worktrees/web/` | Chantiers web conservés |
| `_bmad/`, `_bmad-output/` | Installation et livrables BMAD |
| `docs/` | Documentation commune, décisions et anciens documents |
| `design/`, `design-artifacts/` | Sources graphiques et structure WDS |
| `design-system/` | Source historique à comparer aux copies versionnées dans les applications |
| `artifacts/` | Captures, exports, rapports, images, builds et fichiers temporaires |
| `archive/` | Copies historiques conservées, non utilisées comme dépôts actifs |
| `backups/` | Sauvegardes locales et configurations privées |
| `scripts/`, `deploy/` | Utilitaires transverses et configuration de déploiement existante |

## Travailler au quotidien

```powershell
# Voir les branches ouvertes et les modifications locales
.\scripts\workspace-status.ps1

# Démarrer la stack web et microservice existante
.\start-dev.ps1

# Examiner le dépôt choisi
git -C TourGuideApp status
git -C TourGuideWeb status
```

Les dossiers principaux conservent leurs branches et leurs modifications locales. Ne pas supposer qu’ils sont sur `main`. Ne pas changer de branche sans examiner et préserver le travail en cours.

Le [registre des worktrees](docs/workspace-worktrees.md) précise les chemins retenus. La [procédure d’entretien et de restauration](docs/workspace-maintenance.md) explique comment ouvrir ou fermer un chantier.

## Retrouver les anciens fichiers

- Captures : `artifacts/screenshots/workspace/`.
- Play Store : `artifacts/playstore/assets/` et `artifacts/playstore/screenshots/`.
- Ancien `output/imagegen` : `artifacts/images/imagegen/`.
- Ancien `.tmp` : `artifacts/tmp/workspace-2026-09-26/`.
- Ancien `TourGuide/bmad` : `docs/legacy-tourguide/bmad/`.
- Anciennes copies de code : `archive/source-copies/`.
- Plans, revues et prompts : `docs/plans/`, `docs/reviews/`, `docs/prompts/`.

Le [compte rendu de réorganisation](docs/reorganisation-effectuee-2026-09-26.md) et le manifeste local `backups/reorganisation-2026-09-26/operations.jsonl` donnent les déplacements exacts.

## Règles de rangement

Un worktree correspond à un chantier actif, pas à chaque story terminée. Ranger tout nouveau worktree sous `.worktrees/app/<chantier>` ou `.worktrees/web/<chantier>`. Les fichiers générés vont dans `artifacts`, les versions historiques dans `archive` et les documents maintenus dans `docs` ou dans la documentation du dépôt propriétaire.

Les dossiers `TourGuideApp` et `scripts` présents sous les groupes de worktrees sont des **jonctions de compatibilité**, pas des copies supplémentaires. Certains `node_modules` sont aussi partagés. Ne jamais traverser ces liens lors d’un nettoyage récursif.

Les documents et outils transverses restent locaux à cet espace ; ils ne sont pas automatiquement publiés par un commit applicatif. Leur sauvegarde locale est décrite dans le compte rendu. Aucun nouveau dépôt englobant Bmad n’a été créé.
