# Story Refonte-8: Wizard étape 3 — Itinéraire

**Status:** ready-for-review
**Phase:** 4 / 6 (refonte Studio Murmure — Wizard, sous-story 3/6)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §5 + §7 Phase 4
**Source design:** [docs/design/ds/wizard-3-itineraire.jsx](../docs/design/ds/wizard-3-itineraire.jsx)
**Estimation:** 1 j-personne
**Branche:** `feat/refonte-studio-murmure-wizard-itineraire`
**Dépend de:** Refonte-1 (Shell) + Refonte-6 (Wizard primitives) + Refonte-7 (WizField/WizInput)

---

## Summary
Refonte visuelle de l'étape Itinéraire (`/guide/studio/[sessionId]/itinerary`). Création de `<PoiOverviewCard>` (card POI éditoriale) et `<MapStatsHeader>` (counter compact). La logique extensive existante (geocoding, click-to-place, drag-and-drop reorder, validation POI, archivage, mode carte fullscreen) est **intégralement conservée** — uniquement le rendu visuel change.

Décision actée : on garde **Leaflet stylé** (`<EditableMap>` existant), pas de migration Mapbox GL.

## Acceptance Criteria

### Composants nouveaux (`src/components/studio/wizard-itinerary/`)
- [x] `PoiOverviewCard.tsx` — card POI : numéro éditorial italique grenadine + titre + statut (GPS/Validé) + actions iconBtn (édition/validation/suppression). Boutons reorder ▲▼ verticaux.
- [x] `MapStatsHeader.tsx` — `N POIs · M géolocalisés · K validés` (chiffres en olive pour le validés)
- [x] `index.ts`

### Refonte de la page `[sessionId]/itinerary/page.tsx`
- [x] Header H1 display « Itinéraire » + bouton « ◉ Ouvrir en mode carte »
- [x] `<MapStatsHeader>` sous le header
- [x] Carte wrap rounded-lg DS, légende (lat/lng) en mono dans paper-soft pill
- [x] Liste POIs avec `<PoiOverviewCard>`
- [x] Conserve : éditer inline (`WizField`/`WizInput`), search adresse, click-to-place, archive/restore
- [x] `<StepNav>` prev=Général next=Scènes

### Tokens & DS
- [x] **0 hex hardcodé**
- [x] Aucun gradient (uniformité Murmure)

### Tests
- [x] `__tests__/PoiOverviewCard.test.tsx` — rendu numéro/titre/actions
- [x] `__tests__/MapStatsHeader.test.tsx` — counter affiché

---

## Files

### Nouveaux
- `src/components/studio/wizard-itinerary/PoiOverviewCard.tsx` + test
- `src/components/studio/wizard-itinerary/MapStatsHeader.tsx` + test
- `src/components/studio/wizard-itinerary/index.ts`

### Modifiés
- `src/app/guide/studio/[sessionId]/itinerary/page.tsx` — refonte visuelle

## Dev Agent Record
À remplir après exécution.

## Changelog
À remplir.
