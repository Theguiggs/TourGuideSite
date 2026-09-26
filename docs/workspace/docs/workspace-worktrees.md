# Registre des worktrees

État vérifié le 26 septembre 2026. Pour actualiser la vue : `scripts/workspace-status.ps1`.

| Dossier | Branche | Entrées du status | Usage |
|---|---|---:|---|
| `TourGuideApp` | `chore/play-review-prep` | 3 | Application principale ; modifications locales conservées |
| `.worktrees/app/guide-metadata` | `fix/guide-metadata-provenance` | 1 | Script et manifeste de migration à reprendre ; préservés |
| `.worktrees/app/visites-personnalisees` | `feat/visites-personnalisees-story-12` | 0 | Chantier mobile story 12, incluant les stories précédentes |
| `TourGuideWeb` | `feat/lw-1-lecteur-scene` | 188 | Site principal ; contenu et modifications locales conservés |
| `.worktrees/web/content-expansion` | `feature/expand-draft-tour-content` | 28 | Enrichissement éditorial en cours ; modifications préservées |
| `.worktrees/web/visites-personnalisees` | `feat/visites-personnalisees-story-12` | 0 | Chantier web story 12, incluant les stories précédentes |

Les 85 branches locales et les deux stashes du site sont conservés. Les branches `main` sont libres, sans worktree temporaire associé. Les deux dépôts principaux restent sur leurs branches initiales.

## Liens techniques

- `.worktrees/app/TourGuideApp` et `.worktrees/web/TourGuideApp` pointent vers le dépôt mobile principal.
- `.worktrees/app/scripts` et `.worktrees/web/scripts` pointent vers les utilitaires racine.
- Les deux worktrees mobiles conservés partagent `TourGuideApp/node_modules` via des jonctions préexistantes.
- Le worktree web des visites personnalisées possède maintenant les dépendances physiques autrefois hébergées par story 10. Son lien `@murmure/design-system` cible son propre `packages/design-system`.
- `artifacts/tmp/workspace-2026-09-26/node_modules` et `artifacts/tmp/TourGuideWeb` conservent les imports des scripts historiques.

Ces jonctions ne sont pas des dépôts supplémentaires. Ne pas les suivre dans un nettoyage récursif.

L’enrichissement éditorial et le dépôt web principal comportent tous deux des modifications de narrations. Leur rapprochement fonctionnel reste un chantier distinct ; aucune fusion n’a été imposée pendant le rangement.
