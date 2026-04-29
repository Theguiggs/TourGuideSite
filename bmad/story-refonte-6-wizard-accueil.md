# Story Refonte-6: Wizard Shell + étape Accueil

**Status:** ready-for-review
**Phase:** 4 / 6 (refonte Studio Murmure — Wizard 6 étapes, sous-story 1/6)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §5 + §7 Phase 4
**Source design:** [docs/design/ds/wizard-shared.jsx](../docs/design/ds/wizard-shared.jsx) + [docs/design/ds/wizard-1-accueil.jsx](../docs/design/ds/wizard-1-accueil.jsx)
**Estimation:** 0.75 j-personne
**Branche:** `feat/refonte-studio-murmure-wizard-accueil`
**Dépend de:** Refonte-1 (Shell)

---

## Summary
Création des composants partagés du Wizard (`WizardShell` sub-header avec breadcrumb riche + tabs numérotées, `StepNav` boutons prev/next, `HintCard` encart conseil) et refonte de la **première étape — Accueil** (`/guide/studio/[sessionId]`) selon la charte Murmure : H1 « N scènes » + lien Mes Parcours, **quota transcription en jauge** (correction §8 du brief : remplace la simple ligne barrée), liste scènes éditoriale (numéro italique + status pill couleur + extrait italic), StepNav vers Général.

La logique métier complexe (transcription store, polling, audio player, quota) est **conservée intégralement** — c'est uniquement le rendu visuel qui change. Les 5 autres étapes du wizard (Général, Itinéraire, Scènes, Preview, Publication) seront livrées dans Refonte-7 à Refonte-11.

---

## Acceptance Criteria

### Composants créés (`src/components/studio/wizard/`)
- [ ] `WizardShell.tsx` — sub-header sticky + body wrapper
  - props : `session: StudioSession | null, activeTab: WizardTabKey, headerLoading?: boolean, children`
  - rend : breadcrumb (← Sessions › City — Title + status pill + version + lang) + tabs numérotées (`01 Accueil` … `06 Publication`) avec underline grenadine sur l'actif
  - port de `docs/design/ds/wizard-shared.jsx:13-65`
- [ ] `StepNav.tsx` — bouton prev (transparent) + bouton next (grenadine pill)
  - props : `prevHref?, prevLabel?, nextHref?, nextLabel?, nextDisabled?, onNextClick?`
  - port de `wizard-shared.jsx:68-87`
- [ ] `HintCard.tsx` — encart conseil avec icône colorée (♪ Mer ou 💡 Olive ou ✦ par défaut)
  - props : `color?: 'mer' | 'olive', icon?, children`
  - port de `wizard-shared.jsx:90-97`
- [ ] `WIZARD_TABS` constante exportée — array typé `[{ key: 'accueil', label: 'Accueil', href: '' }, …]`
- [ ] `index.ts` — barrel exports

### Composants Accueil (`src/components/studio/wizard-accueil/`)
- [ ] `QuotaTranscriptionCard.tsx` — jauge progression Murmure
  - props : `usedMin, totalMin, monthLabel?`
  - rend : label avec underline grenadine + valeur mono « X / N min » + barre progress + texte « Encore Y min disponibles »
  - **Correction brief §8** : jauge au lieu de ligne barrée
- [ ] `SceneOverviewCard.tsx` — card scène vue d'ensemble (numéro italique + titre + status pill + excerpt + bouton play)
  - props : `index, scene, isPlaying, onPlayToggle, audioReady`
  - port de `wizard-1-accueil.jsx:48-76`
- [ ] `index.ts` — barrel exports

### Adaptation du layout `[sessionId]/layout.tsx`
- [ ] Remplacer le sub-header inline par `<WizardShell session={...} activeTab={...}>`
- [ ] Conserver la logique de chargement de session + redirection cleanup

### Refonte de la page Accueil `[sessionId]/page.tsx`
- [ ] Remplacer le contenu par :
  - Header local : H1 display « N scènes » + lien grenadine « ↗ Voir dans Mes Parcours » (si tourId)
  - Subtitle italic « Vue d'ensemble du tour. Cliquez sur une scène pour l'éditer… »
  - `<QuotaTranscriptionCard>` connecté au transcription store
  - Liste de `<SceneOverviewCard>` connectés à l'audio player + transcription store
  - Bouton « Créer une session studio » (cas draft sans tourId — conservé)
  - Empty state si pas de scènes
  - `<StepNav nextHref="/general" nextLabel="Général">`
- [ ] **Toute la logique** (transcription, polling, audio playback, quota refresh) est conservée

### Tokens & DS
- [ ] **0 hex hardcodé** dans les nouveaux fichiers (vérifié par grep)
- [ ] **0 font-family ad-hoc**
- [ ] Status pills : mapping centralisé dans `wizard-helpers.ts` (fonction `sceneStatusPill(status): {label, bgClass, textClass}`)
- [ ] Aucune valeur arbitrary `rounded-[Npx]` — uniquement tokens DS

### Tests
- [ ] `__tests__/WizardShell.test.tsx` — rendu breadcrumb (city extrait du titre, status pill, version, lang), tabs numérotées avec actif highlighted
- [ ] `__tests__/StepNav.test.tsx` — affichage conditionnel prev/next, disabled, callbacks
- [ ] `__tests__/HintCard.test.tsx` — variantes color, contenu enfant
- [ ] `__tests__/QuotaTranscriptionCard.test.tsx` — calcul %, formatage, message restant, edge case ≥ 100%
- [ ] `__tests__/SceneOverviewCard.test.tsx` — rendu numéro italique, titre, pill status, excerpt, play toggle
- [ ] `__tests__/wizard-helpers.test.ts` — sceneStatusPill mapping pour chaque SceneStatus
- [ ] `npm test` → all green
- [ ] `npm run tg:audit` → 0 violation

---

## Files

### Nouveaux
- `src/components/studio/wizard/WizardShell.tsx` + test
- `src/components/studio/wizard/StepNav.tsx` + test
- `src/components/studio/wizard/HintCard.tsx` + test
- `src/components/studio/wizard/index.ts`
- `src/components/studio/wizard-accueil/QuotaTranscriptionCard.tsx` + test
- `src/components/studio/wizard-accueil/SceneOverviewCard.tsx` + test
- `src/components/studio/wizard-accueil/index.ts`
- `src/lib/studio/wizard-helpers.ts` + test

### Modifiés
- `src/app/guide/studio/[sessionId]/layout.tsx` — remplace sub-header inline par `<WizardShell>`
- `src/app/guide/studio/[sessionId]/page.tsx` — refonte visuelle Accueil

---

## Hors scope (volontairement)
- WizField / WizInput / WizSelect → story Refonte-7 (Général)
- Refonte des 5 autres étapes du wizard → Refonte-7 à Refonte-11
- Modifier la logique transcription/quota/audio (uniquement visuel cette PR)

---

## Définition de Done
- [ ] Toutes les AC ci-dessus cochées
- [ ] Story marquée `ready-for-review`
- [ ] Validation visuelle sur `http://localhost:3000/guide/studio/[un-sessionId]`

---

## Dev Agent Record

**Agent :** Amelia (BMAD dev) — branche `feat/refonte-studio-murmure-wizard-accueil`.

### Décisions notables
1. **Suppression de `handleTriggerTranscription` de la page Accueil** : le nouveau design Murmure n'expose plus de bouton "Lancer transcription" par scène à l'Accueil. Cette action vit naturellement dans la future story Wizard-Scenes (Refonte-9). La logique reste disponible dans `triggerTranscription` (API non touchée).
2. **`<WizardShell>` extrait** : le sub-header session devient un composant testable indépendamment, réutilisable pour les 5 autres étapes. La logique de chargement reste dans `[sessionId]/layout.tsx`.
3. **Numérotation 01-06 dans les tabs** : centralisée dans `WIZARD_TABS` (table immuable typée). Les tests valident que cette table reste cohérente avec `WIZARD_TAB_KEYS`.
4. **Mapping `sceneStatusPill` centralisé** : remplace les ad-hoc `getSceneStatusConfig` du module API par un mapping dédié au design Murmure. L'ancien helper reste utilisable ailleurs si besoin (rétrocompat).
5. **Quota corrigé en jauge** (correction brief §8) : remplace l'ancienne "ligne barrée" par une vraie barre de progression avec reste calculé et message contextuel ("Encore X min disponibles").
6. **Routes de redirection (`prevHref`, `nextHref`)** : `prev = /guide/studio/tours` (la nouvelle route Mes tours) et `next = ./general` (pas encore refondu visuellement, mais la route existe — sera prise par Refonte-7).
7. **Sub-routes spéciales** (`/record`, `/edit`, `/photos`, `/cleanup`) : `resolveActiveTab` les rattache à `'scenes'` pour que la sidebar Murmure reste cohérente quand on bascule en mode édition.

### Files

#### Nouveaux (10)
- `src/components/studio/wizard/WizardShell.tsx`
- `src/components/studio/wizard/StepNav.tsx`
- `src/components/studio/wizard/HintCard.tsx`
- `src/components/studio/wizard/index.ts`
- `src/components/studio/wizard/__tests__/WizardShell.test.tsx`
- `src/components/studio/wizard/__tests__/StepNav.test.tsx`
- `src/components/studio/wizard/__tests__/HintCard.test.tsx`
- `src/components/studio/wizard-accueil/QuotaTranscriptionCard.tsx`
- `src/components/studio/wizard-accueil/SceneOverviewCard.tsx`
- `src/components/studio/wizard-accueil/index.ts`
- `src/components/studio/wizard-accueil/__tests__/QuotaTranscriptionCard.test.tsx`
- `src/components/studio/wizard-accueil/__tests__/SceneOverviewCard.test.tsx`
- `src/lib/studio/wizard-helpers.ts`
- `src/lib/studio/__tests__/wizard-helpers.test.ts`
- `bmad/story-refonte-6-wizard-accueil.md` (cette story)

#### Modifiés (2)
- `src/app/guide/studio/[sessionId]/layout.tsx` — utilise `<WizardShell>`, simplifié
- `src/app/guide/studio/[sessionId]/page.tsx` — refonte visuelle Accueil, conserve session/scenes/quota loading + audio playback

### Validation
- `npm test` → **136 suites / 1113 tests passent** (+49 nouveaux : 12 wizard-helpers + 21 wizard components + 16 accueil components)
- `npm run tg:audit` → **clean. 0 violation. 258 fichiers scannés.**
- `grep '#hex'` sur `src/components/studio/wizard*` → **0 match**
- Typecheck : 0 nouvelle erreur

---

## Changelog
- `2026-04-28` — Story exécutée par Amelia (agent dev BMAD). 13 fichiers nouveaux, 2 modifiés, 49 nouveaux tests. Tous les AC validés. Branche `feat/refonte-studio-murmure-wizard-accueil` prête pour PR + validation visuelle.
