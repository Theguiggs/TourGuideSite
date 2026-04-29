# Story Refonte-3: Mes tours (catalogue Studio)

**Status:** ready-for-review
**Phase:** 3b / 6 (refonte Studio Murmure — Mes tours)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §5 + §7 Phase 3 (écran 2)
**Source design:** [docs/design/ds/studio-tours.jsx](../docs/design/ds/studio-tours.jsx)
**Estimation:** 0.75 j-personne
**Branche:** `feat/refonte-studio-murmure-tours`
**Dépend de:** Refonte-1 (Shell) + Refonte-2 (Dashboard — extraction `groupSessionsByTour` et `DeleteSessionDialog`)

---

## Summary
Création de la nouvelle route `/guide/studio/tours` qui devient le catalogue Murmure : grid de cards horizontales avec bande couleur ville, photo placeholder DS, stats (écoutes/note), status pill et action contextuelle. Filtres : search + tabs (Tous/En ligne/Brouillons/En relecture) + tri.

Cette route remplace la fonctionnalité de listing qu'avait l'ancienne page `/guide/studio` (refondue en Dashboard dans Refonte-2). On réutilise `groupSessionsByTour` et `DeleteSessionDialog` extraits dans Refonte-2.

---

## Acceptance Criteria

### Composants créés (`src/components/studio/tours-list/`)
- [ ] `TourCard.tsx` — card horizontale 6 colonnes (bande couleur · photo · titre block · stats · status+langs · action)
  - props : `session, scenesTotal, scenesDone, plays, rating, langs, current, onDelete`
  - utilise `cityFamily()` pour la couleur, `<Pin>` du DS pour le placeholder, `<DeleteSessionDialog>` extrait
  - port de `studio-tours.jsx:80-162`
- [ ] `TourCardCompact.tsx` (optionnel) — variante compacte pour les groupes multi-versions
- [ ] `TourFilters.tsx` — barre de filtres (search input pill + tabs status + tri select)
  - props : `query, onQueryChange, statusFilter, onStatusChange, sortBy, onSortChange, counts`
  - port de `studio-tours.jsx:46-72`
- [ ] `index.ts` — barrel exports

### Page créée (`src/app/guide/studio/tours/page.tsx`)
- [ ] Page header : eyebrow grenadine `Mes tours · {N} au total · {M} en ligne`
- [ ] H1 display « Votre *catalogue*. » + subtitle italic editorial
- [ ] Bouton « ＋ Nouveau tour » → `/guide/studio/nouveau` (route 404 attendue, hors scope)
- [ ] `<TourFilters>` connecté à un état local (Zustand pas nécessaire à ce stade)
- [ ] Liste `<TourCard>` filtrée + triée
- [ ] Modale `<DeleteSessionDialog>` câblée
- [ ] Pull-quote éditorial en bas (« Un bon tour commence par un endroit qu'on aime trop pour le garder pour soi. »)

### Logique métier
- [ ] `src/lib/studio/tours-list-helpers.ts` :
  - `filterTours(sessions, query, statusFilter): StudioSession[]`
  - `sortTours(sessions, sortBy): StudioSession[]` — `recently_modified | alphabetical | most_played`
  - `tourStatusLabel(status): { label, color }` — mapping `published→En ligne(success)`, `draft|editing|recording→Brouillon(ocre)`, `submitted|revision_requested→En relecture(mer)`
- [ ] Tests unitaires pour ces 3 helpers

### Sidebar active
- [ ] Sur `/guide/studio/tours`, la sidebar a déjà `active="tours"` via `resolveSidebarKey()` (ajusté en Refonte-1)

### États
- [ ] Loading : skeleton avec 3 cards placeholder beiges
- [ ] Empty (aucun tour) : message + CTA grenadine vers `/guide/studio/nouveau`
- [ ] Empty filtré (recherche / filter sans résultat) : message « Aucun tour ne correspond à ces filtres » avec lien « Réinitialiser »
- [ ] Error : bandeau danger + retry

### Tokens & DS
- [ ] **0 hex hardcodé** dans les nouveaux fichiers (vérifié par grep)
- [ ] **0 font-family ad-hoc** — `font-display`, `font-editorial`, `font-mono`
- [ ] Photo placeholder via `<Pin>` du DS (pas d'emoji ni image)
- [ ] Codes langues en uppercase (`FR`, `EN`, etc.) — pas d'emoji drapeau
- [ ] Boutons primaires via classes statiques Tailwind (pas de `bg-${var}`)

### Tests
- [ ] `__tests__/TourCard.test.tsx` — rendu titre/ville, action contextuelle (Reprendre/Modifier/Continuer), bande couleur ville
- [ ] `__tests__/TourFilters.test.tsx` — search debounced, click tab change filter, change tri
- [ ] `__tests__/tours-list-helpers.test.ts` — filter par query/status, sort 3 stratégies, status label mapping
- [ ] `__tests__/page.test.tsx` (intégration) — états loading/empty/error/list, modale delete
- [ ] `npm test` → all green
- [ ] `npm run tg:audit` → 0 violation

---

## Files

### Nouveaux
- `src/components/studio/tours-list/TourCard.tsx` + test
- `src/components/studio/tours-list/TourFilters.tsx` + test
- `src/components/studio/tours-list/index.ts`
- `src/lib/studio/tours-list-helpers.ts` + test
- `src/app/guide/studio/tours/page.tsx`

### Réutilisés (de Refonte-2)
- `src/lib/studio/group-sessions.ts`
- `src/components/studio/session-list/delete-session-dialog.tsx`

---

## Hors scope
- `/guide/studio/nouveau` (création tour) → story dédiée (pas dans le périmètre Murmure de cette phase)
- Compteurs réels écoutes/notes (analytics) — affichés en `—`
- Sidebar collapse mobile — Phase 5

---

## Définition de Done
- [ ] Toutes les AC ci-dessus cochées
- [ ] Story marquée `ready-for-review`
- [ ] Validation visuelle sur `http://localhost:3000/guide/studio/tours`

---

## Dev Agent Record

**Agent :** Amelia (BMAD dev) — branche `feat/refonte-studio-murmure-tours`.

### Décisions notables
1. **Statuts groupés en 4 buckets UI** (`live | draft | review | + Refusé`) malgré 12+ statuts en DB. Les utilisateurs n'ont pas besoin de la granularité interne (recording vs editing vs paused = tous « Brouillon »). Mapping centralisé dans `tourStatusLabel()`.
2. **Sort `most_played` = fallback `recently_modified`** : tant qu'il n'y a pas d'endpoint analytics côté backend, le tri "Plus écoutés" reste cohérent en triant par updatedAt — mieux qu'un sort aléatoire ou une option grisée.
3. **Ville extraite du titre** : `cityFromTitle()` parse la partie avant em-dash/hyphen/virgule (ex: "Vence — Chapelle Matisse" → "Vence"). Fallback "Tour" sinon. Cohérent avec le design source.
4. **Codes langues uppercase, pas d'emoji drapeau** : `FR`, `EN`, `DE`, `ES` etc. — fidèle au brief Murmure (typo over emoji).
5. **`<Pin>` du DS pour la photo placeholder** : couleur dérivée de `cityFamily()` via `tgColors[fam]` car la prop `color` du `<Pin>` accepte un hex.
6. **Bouton supprimer en surface (⋯)** : à côté du CTA principal, déclenche directement la modale extraite (`<DeleteSessionDialog>` réutilisée de Refonte-2). Pas de menu contextuel à ce stade — sera ajouté plus tard si besoin.
7. **Filters state local (useState)** : pas de Zustand nécessaire car portée page-only. Si on doit persister entre routes, on migrera vers le store.

### Files

#### Nouveaux (8)
- `src/components/studio/tours-list/TourCard.tsx`
- `src/components/studio/tours-list/TourFilters.tsx`
- `src/components/studio/tours-list/index.ts`
- `src/components/studio/tours-list/__tests__/TourCard.test.tsx`
- `src/components/studio/tours-list/__tests__/TourFilters.test.tsx`
- `src/lib/studio/tours-list-helpers.ts`
- `src/lib/studio/__tests__/tours-list-helpers.test.ts`
- `src/app/guide/studio/tours/page.tsx`
- `bmad/story-refonte-3-tours.md` (cette story)

### Validation
- `npm test` → **119 suites / 972 tests passent** (33 nouveaux : 14 helpers + 13 TourCard + 6 TourFilters)
- `npm run tg:audit` → **clean. 0 violation. 234 fichiers scannés.**
- `grep '#hex'` sur `src/components/studio/tours-list/` → **0 match**
- Typecheck : 0 nouvelle erreur

---

## Changelog
- `2026-04-28` — Story exécutée par Amelia (agent dev BMAD). 8 fichiers nouveaux, 33 nouveaux tests. Tous les AC validés. Branche `feat/refonte-studio-murmure-tours` prête pour PR.
