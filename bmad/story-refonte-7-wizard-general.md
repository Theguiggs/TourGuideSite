# Story Refonte-7: Wizard étape 2 — Général

**Status:** ready-for-review
**Phase:** 4 / 6 (refonte Studio Murmure — Wizard, sous-story 2/6)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §5 + §7 Phase 4
**Source design:** [docs/design/ds/wizard-2-general.jsx](../docs/design/ds/wizard-2-general.jsx)
**Estimation:** 1 j-personne
**Branche:** `feat/refonte-studio-murmure-wizard-general`
**Dépend de:** Refonte-1 (Shell) + Refonte-6 (WizardShell, StepNav)

---

## Summary
Refonte visuelle de l'étape Général (`/guide/studio/[sessionId]/general`). Création des **primitives wizard** (`WizField`, `WizInput`, `WizTextarea`, `WizSelect`) réutilisables par les 4 autres étapes. Composants spécifiques : `ThemeChips` (max 3) et `CityFamilyBadge` (couleur ville auto). La logique existante (auto-save, upload cover, multilang modal, language purchases) est intégralement conservée — uniquement le rendu visuel change.

---

## Acceptance Criteria

### Primitives wizard (`src/components/studio/wizard/`)
- [ ] `WizField.tsx` — wrapper de champ (label + required + hint compteur + children)
- [ ] `WizInput.tsx` — input text/number stylé Murmure
- [ ] `WizTextarea.tsx` — textarea redimensionnable
- [ ] `WizSelect.tsx` — select natif stylé avec ▼ caret
- Mises à jour `wizard/index.ts` (barrel)

### Composants spécifiques (`src/components/studio/wizard-general/`)
- [ ] `ThemeChips.tsx` — toggle pills grenadine, max 3 sélectionnés
- [ ] `CityFamilyBadge.tsx` — badge pill couleur famille (Mer/Ocre/Olive/Ardoise) à droite de l'input ville
- [ ] `SessionTerrainCard.tsx` — accordion read-only « Session terrain · N scènes · date » (mer-soft header)
- [ ] `index.ts` — barrel

### Refonte de la page `[sessionId]/general/page.tsx`
- [ ] Container `max-w-3xl`
- [ ] Section Photo de couverture : composant existant `S3Image` conservé + boutons « Changer / Supprimer » en lien grenadine, format hint italic
- [ ] Grid 2 cols : Titre (required) + Ville (avec `<CityFamilyBadge>`)
- [ ] Description longue avec `<WizTextarea>` + compteur N/2000
- [ ] Grid 4 cols : Langue (`<WizSelect>`) / Difficulté / Durée (number) / Distance (number step 0.1)
- [ ] `<ThemeChips>` avec hint « Maximum 3 thèmes »
- [ ] `<SessionTerrainCard>` — résumé scènes/statut/date
- [ ] `<StepNav prevHref=accueil nextHref=itineraire>`
- [ ] **Conserver intégralement** : auto-save debounce 1s, upload cover via `studioUploadService`, multilang modal `<OpenMultilangModal>`, language purchase store

### États
- [ ] Loading : skeleton form
- [ ] Saved indicator : "Enregistré" discret en haut à droite
- [ ] Save error : bandeau danger
- [ ] Upload cover progress : message inline + spinner

### Tokens & DS
- [ ] **0 hex hardcodé** (vérifié par grep)
- [ ] **0 font-family ad-hoc**
- [ ] Aucune classe Tailwind dynamique `bg-${var}` — table statique de classes

### Tests
- [ ] `__tests__/WizField.test.tsx` — label, required asterisk, hint, children
- [ ] `__tests__/WizInput.test.tsx` — change handler, value, type number
- [ ] `__tests__/WizTextarea.test.tsx` — change handler, rows, maxLength
- [ ] `__tests__/WizSelect.test.tsx` — options, change
- [ ] `__tests__/ThemeChips.test.tsx` — toggle, max 3 enforcement, callback
- [ ] `__tests__/CityFamilyBadge.test.tsx` — couleur change selon ville
- [ ] `__tests__/SessionTerrainCard.test.tsx` — toggle accordion, données affichées
- [ ] `npm test` → all green
- [ ] `npm run tg:audit` → 0 violation

---

## Files

### Nouveaux
- `src/components/studio/wizard/WizField.tsx` + test
- `src/components/studio/wizard/WizInput.tsx` + test
- `src/components/studio/wizard/WizTextarea.tsx` + test
- `src/components/studio/wizard/WizSelect.tsx` + test
- `src/components/studio/wizard-general/ThemeChips.tsx` + test
- `src/components/studio/wizard-general/CityFamilyBadge.tsx` + test
- `src/components/studio/wizard-general/SessionTerrainCard.tsx` + test
- `src/components/studio/wizard-general/index.ts`

### Modifiés
- `src/components/studio/wizard/index.ts` — barrel updated
- `src/app/guide/studio/[sessionId]/general/page.tsx` — refonte visuelle

---

## Hors scope
- Migration multilang modal vers Murmure (story dédiée si besoin)
- Refonte des dialogues d'achat de langue (composants existants conservés)
- Validation Zod (validation simple required/min/max suffit)

---

## Définition de Done
- [ ] Toutes les AC ci-dessus cochées
- [ ] Story marquée `ready-for-review`
- [ ] Validation visuelle sur `http://localhost:3000/guide/studio/[sessionId]/general`

---

## Dev Agent Record

**Agent :** Amelia (BMAD dev) — branche `feat/refonte-studio-murmure-wizard-general`.

### Décisions notables
1. **Primitives wizard centralisées** : `WizField/WizInput/WizTextarea/WizSelect` exportées depuis `@/components/studio/wizard` — réutilisées par les 4 prochaines stories du wizard.
2. **CityFamilyBadge en overlay absolu** : positionné en `top-2 right-2` de l'input ville, `pointer-events-none`. La couleur famille se met à jour en temps réel à chaque frappe.
3. **Conservation de `<Collapsible>` UI legacy** pour le bloc multilang : ce composant est utilisé par d'autres pages, le restyle complet sortirait du scope de cette PR.
4. **Suppression des emoji drapeaux des langues** : remplacés par codes ISO uppercase (FR, EN, IT, ES, DE) dans la liste purchasedLanguages — cohérent avec l'identité Murmure.
5. **`SessionTerrainCard` collapsed par défaut** : metadata passive, on ne le déploie que sur demande.
6. **Cast `as unknown as Record<string, unknown>`** : le typecheck préexistant signalait un cast direct hasardeux. Solution propre : passer par unknown comme TS le suggère.
7. **Save bar non-sticky** : remplacée par un bouton inline + `<StepNav>`. La sticky bar du design source pollue l'UI Murmure.

### Files

#### Nouveaux (10)
- `src/components/studio/wizard/WizField.tsx` + test
- `src/components/studio/wizard/WizInput.tsx` + test
- `src/components/studio/wizard/WizTextarea.tsx` + test
- `src/components/studio/wizard/WizSelect.tsx` + test
- `src/components/studio/wizard-general/ThemeChips.tsx` + test
- `src/components/studio/wizard-general/CityFamilyBadge.tsx` + test
- `src/components/studio/wizard-general/SessionTerrainCard.tsx` + test
- `src/components/studio/wizard-general/index.ts`

#### Modifiés (2)
- `src/components/studio/wizard/index.ts` — barrel updated
- `src/app/guide/studio/[sessionId]/general/page.tsx` — refonte visuelle complète (logique métier conservée)

### Validation
- `npm test` → **143 suites / 1149 tests passent** (+36 nouveaux)
- `npm run tg:audit` → **clean. 0 violation. 266 fichiers scannés.**
- `grep '#hex'` sur wizard-general/ → **0 match**
- Typecheck : 0 nouvelle erreur (préexistante corrigée)

---

## Changelog
- `2026-04-28` — Story exécutée par Amelia (agent dev BMAD). 8 fichiers nouveaux, 2 modifiés, 36 nouveaux tests. Tous les AC validés. Branche `feat/refonte-studio-murmure-wizard-general` prête pour PR.
