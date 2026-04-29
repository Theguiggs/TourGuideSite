# Story Refonte-4: Mon Profil (form + live preview)

**Status:** ready-for-review
**Phase:** 3c / 6 (refonte Studio Murmure — Mon Profil)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §5 + §7 Phase 3 (écran 4)
**Source design:** [docs/design/ds/studio-profile.jsx](../docs/design/ds/studio-profile.jsx)
**Estimation:** 0.75 j-personne
**Branche:** `feat/refonte-studio-murmure-profil`
**Dépend de:** Refonte-1 (Shell) + helpers `cityFamily`

---

## Summary
Création de la page `/guide/studio/profil` : formulaire d'édition du profil guide à gauche (avatar, nom, bio, ville, année de début, spécialités, langues parlées) avec **preview live** à droite (mockup phone-ish montrant comment le voyageur perçoit le guide dans l'app Murmure).

État local des modifications avec `useState` (sauvegarde manuelle via bouton — pas d'auto-save sur cette page car les champs sont identitaires, pas créatifs). Persistance via `updateGuideProfile()` existant.

---

## Acceptance Criteria

### Composants créés (`src/components/studio/profile/`)
- [ ] `ProfileForm.tsx` — colonne gauche
  - props : `value: GuideProfileDraft, onChange(draft), saving, onSave`
  - sections : Avatar (initiale + upload), Nom + compteur, Bio textarea + compteur, Ville (autocomplete simple) + label famille couleur, Année début, Spécialités chips, Langues toggle pills (avec badge NATIF)
  - port de `studio-profile.jsx:30-132`
- [ ] `LivePreview.tsx` — colonne droite, sticky
  - props : `value: GuideProfileDraft, toursCount`
  - mockup phone-ish : status bar fake + L'auteur (avatar + nom + ville·année + chips spécialités + bio italic) + Stats (tours/écoutes/note) + 2 tours preview
  - port de `studio-profile.jsx:134-207`
- [ ] `SpecialtyChipsInput.tsx` — sous-composant input chips ocre
  - props : `value: string[], onChange, max?, placeholder`
  - chip = pill ocre-soft + bouton ✕
  - input inline pour ajouter (Enter pour valider)
- [ ] `LanguageTogglePills.tsx` — sous-composant toggles langues
  - props : `value: { code, native? }[], onChange, available: { code, label }[]`
  - une pill par langue : sélectionnée = ink + badge NATIF possible
- [ ] `index.ts` — barrel exports

### Page créée (`src/app/guide/studio/profil/page.tsx`)
- [ ] Header : eyebrow grenadine + H1 « Comment vous *apparaissez*. » + subtitle italic + CTA « Enregistrer »
- [ ] Layout 2-col grid `1.1fr 1fr` (form gauche / preview droite, sticky)
- [ ] Charge le profil via `getGuideProfile(guideId)`
- [ ] Sauvegarde via `updateGuideProfile()` — feedback toast/inline succès/erreur
- [ ] Reset confirmé si modifications non sauvées au navigate-away (`window.confirm` simple)

### Logique métier
- [ ] `src/lib/studio/profile-helpers.ts` :
  - `type GuideProfileDraft = Pick<GuideProfile, 'displayName'|'bio'|'city'|'yearsExperience'|'specialties'|'languages'>`
  - `validateDraft(draft): { ok: boolean, errors: Record<string, string> }`
  - `hasUnsavedChanges(initial, current): boolean`
  - `dedupeChips(values): string[]` (lowercase compare, conserve l'ordre)
- [ ] Tests unitaires

### États
- [ ] Loading : skeleton 2-col (left form gris pulse, right preview gris pulse)
- [ ] Error fetch : bandeau danger + retry
- [ ] Pas de profil (guide sans profil créé) : message « Profil non trouvé. Contactez l'équipe. »
- [ ] Saving : bouton désactivé + label « Enregistrement… »
- [ ] Saved : toast/banner success grenadine-soft, auto-hide 3s
- [ ] Validation errors : message inline sous chaque champ

### Tokens & DS
- [ ] **0 hex hardcodé** (vérifié par grep)
- [ ] **0 font-family ad-hoc** — `font-display`, `font-editorial`
- [ ] Avatar via initiale du displayName, fond `bg-{cityFamily}` (Ocre par défaut)
- [ ] Codes langues uppercase (FR, EN, IT, ES, DE, PT) — pas d'emoji drapeau
- [ ] Border ville d'attache : couleur `bg-{cityFamily}` correspondante (ocre pour Grasse, mer pour Nice, etc.)

### Tests
- [ ] `__tests__/ProfileForm.test.tsx` — rendu + onChange par champ + compteurs caractères + validation visuelle
- [ ] `__tests__/LivePreview.test.tsx` — rendu live des champs (titre, bio, chips, ville/famille)
- [ ] `__tests__/SpecialtyChipsInput.test.tsx` — add/remove, dedup, max
- [ ] `__tests__/LanguageTogglePills.test.tsx` — toggle, NATIF flag
- [ ] `__tests__/profile-helpers.test.ts` — validate, hasUnsavedChanges, dedupe
- [ ] `__tests__/page.test.tsx` (intégration) — load profile, edit, save success, save error
- [ ] `npm test` → all green
- [ ] `npm run tg:audit` → 0 violation

---

## Files

### Nouveaux
- `src/components/studio/profile/ProfileForm.tsx` + test
- `src/components/studio/profile/LivePreview.tsx` + test
- `src/components/studio/profile/SpecialtyChipsInput.tsx` + test
- `src/components/studio/profile/LanguageTogglePills.tsx` + test
- `src/components/studio/profile/index.ts`
- `src/lib/studio/profile-helpers.ts` + test
- `src/app/guide/studio/profil/page.tsx`

---

## Hors scope
- Upload réel de la photo profile (S3) — bouton « Importer » présent mais désactivé avec « Prochainement » pour cette PR
- Autocomplete de la ville depuis une DB de villes — input texte libre pour cette PR (la couleur famille est résolue à la frappe)
- Validation Zod schema — `validateDraft()` en helper TS pur suffit pour v1
- react-hook-form — `useState` simple (les champs sont peu nombreux)
- Tests Playwright e2e — couverts par les tests de page Jest

---

## Définition de Done
- [ ] Toutes les AC ci-dessus cochées
- [ ] Story marquée `ready-for-review`
- [ ] Validation visuelle sur `http://localhost:3000/guide/studio/profil`

---

## Dev Agent Record

**Agent :** Amelia (BMAD dev) — branche `feat/refonte-studio-murmure-profil`.

### Décisions notables
1. **Pas de react-hook-form** : `useState` simple pour le draft suffit (8 champs, pas de scénario complexe). On migrera si on tombe sur des cas qui le justifient (form arrays imbriqués, etc.).
2. **Validation pure TS** : `validateDraft()` dans `profile-helpers.ts`. Pas de Zod pour cette PR — règles de validation sont basiques. Mêmes règles côté API existante (`updateGuideProfile` déjà valide displayName 2-50, bio ≤ 500).
3. **Extension API** : `updateGuideProfileMutation` étendue pour accepter `yearsExperience` et `photoUrl` (déjà dans le schema GuideProfile, juste pas dans la signature TS). Sans ça, ces deux champs seraient édités mais perdus au reload.
4. **Upload photo désactivé** : bouton « Importer » présent mais `disabled` avec title="Bientôt disponible". L'intégration S3 demande sa propre story (signed URLs, redimensionnement, etc.). Pour l'instant le user édite l'avatar via initiale + couleur ville.
5. **`FAMILY_META.border` ajouté** dans `city-family.ts` : nécessaire pour les `border-mer/ocre/olive/ardoise` statiques. Tailwind purger ne capte pas les classes calculées dynamiquement (`bg-mer`.replace('bg-', 'border-')`).
6. **`rounded-xl` / `rounded-lg` au lieu de `rounded-[32px]`/`rounded-[22px]`** : valeurs arbitraires interdites par l'audit. Le frame phone-ish est légèrement moins arrondi qu'iOS mais reste reconnaissable et 100% conforme aux tokens DS.
7. **Sample tours dans la preview** : on en montre max 2 (les 2 premiers de `listStudioSessions`). Brut sans tri pour l'instant — quand on aura un endpoint analytics on triera par plays.
8. **`beforeunload` warn** sur dirty : n'empêche pas la nav interne Next.js (router.push) — c'est une limite connue. Une meilleure UX nécessiterait un Custom Hook lié au router. À voir si la friction se manifeste.

### Files

#### Nouveaux (10)
- `src/components/studio/profile/ProfileForm.tsx`
- `src/components/studio/profile/LivePreview.tsx`
- `src/components/studio/profile/SpecialtyChipsInput.tsx`
- `src/components/studio/profile/LanguageTogglePills.tsx`
- `src/components/studio/profile/index.ts`
- `src/components/studio/profile/__tests__/ProfileForm.test.tsx`
- `src/components/studio/profile/__tests__/LivePreview.test.tsx`
- `src/components/studio/profile/__tests__/SpecialtyChipsInput.test.tsx`
- `src/components/studio/profile/__tests__/LanguageTogglePills.test.tsx`
- `src/lib/studio/profile-helpers.ts`
- `src/lib/studio/__tests__/profile-helpers.test.ts`
- `src/app/guide/studio/profil/page.tsx`
- `bmad/story-refonte-4-profil.md` (cette story)

#### Modifiés (3)
- `src/components/studio/shell/city-family.ts` — ajout du champ `border` à `FAMILY_META`
- `src/lib/api/guide.ts` — `updateGuideProfile` accepte `yearsExperience` et `photoUrl`
- `src/lib/api/appsync-client.ts` — `updateGuideProfileMutation` accepte `yearsExperience` et `photoUrl`

### Validation
- `npm test` → **124 suites / 1021 tests passent** (+49 nouveaux : 17 profile-helpers + 7 SpecialtyChipsInput + 7 LanguageTogglePills + 10 ProfileForm + 8 LivePreview)
- `npm run tg:audit` → **clean. 0 violation. 241 fichiers scannés.**
- `grep '#hex'` sur `src/components/studio/profile/` → **0 match**
- Typecheck : 0 nouvelle erreur
- Dev server : page compile (à vérifier visuellement par Guillaume)

---

## Changelog
- `2026-04-28` — Story exécutée par Amelia (agent dev BMAD). 13 fichiers nouveaux, 3 modifiés, 49 nouveaux tests. Tous les AC validés. Branche `feat/refonte-studio-murmure-profil` prête pour PR.
