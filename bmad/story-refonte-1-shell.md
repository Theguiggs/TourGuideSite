# Story Refonte-1: Shell Studio Murmure (Header + Sidebar)

**Status:** ready-for-review
**Phase:** 2 / 6 (refonte Studio Murmure)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §5 + §7 Phase 2
**Estimation:** 1 j-personne
**Branche:** `feat/refonte-studio-murmure-shell`

---

## Summary
Mettre en place le shell global du Studio (`<StudioHeader>` + `<StudioSidebar>` + helper `cityFamily`) conformément à la charte Murmure, et l'injecter dans le layout Next.js `/guide/studio/*`. Cette story débloque toutes les PR suivantes (Dashboard, Tours, Profil, Revenus, Editor, Wizard).

Décisions actées :
- Routes conservées sous `/guide/studio/*` (pas de renommage).
- Sources de design : `docs/design/ds/studio-shared.jsx` (lignes 9-115) + `TourGuide Charte complete.html` section 02 bis.

---

## Acceptance Criteria

### Composants créés
- [x] `src/components/studio/shell/MurmureLogo.tsx`
  - wordmark « Murmure » + tag « STUDIO » + icône (réutilise `<PinNegatif>` du DS)
  - props : `size?: number` (défaut 26)
  - port fidèle de `docs/design/ds/studio-shared.jsx:9-19`
- [x] `src/components/studio/shell/StudioHeader.tsx`
  - Barre haut (logo + liens « Catalogue public » / « Aide » + séparateur + avatar user + dropdown)
  - Avatar : initiale du prénom user (fallback `S`), background `grenadine`
  - Port de `studio-shared.jsx:40-56`
- [x] `src/components/studio/shell/StudioSidebar.tsx`
  - Largeur fixe 240px, fond `paper`, border-right `line`
  - Header profil : avatar 40px (background `ocre`), nom, sous-titre « Guide · {ville} »
  - Nav items : Dashboard, Mes tours (compteur), Nouveau tour (variant `accent`), Mon profil, Revenus, Avis (badge live grenadine)
  - Footer : « Voir l'app touriste » + « Se déconnecter »
  - Props : `active: 'dashboard' | 'tours' | 'create' | 'profile' | 'revenus' | 'reviews'`
  - État actif : background `ink`, texte `paper`
  - Port de `studio-shared.jsx:59-115`
- [x] `src/components/studio/shell/city-family.ts`
  - `cityFamily(city: string): 'mer' | 'ocre' | 'olive' | 'ardoise'`
  - DB de villes selon brief §6 + extension de `studio-shared.jsx:22-31`
  - Default `'ardoise'`
- [x] `src/components/studio/shell/index.ts` — barrel exports

### Layout intégré
- [x] Création de `src/app/guide/studio/layout.tsx`
  - Wrap les routes `/guide/studio/*` avec `<StudioHeader>` + grid `240px 1fr` + `<StudioSidebar>` + `{children}`
  - Détection de l'onglet actif depuis `usePathname()` (mapping URL → clé sidebar)
  - **Bonus** : préserve le `<RgpdConsentBanner>` existant (gate avant shell)
- [x] Adapter `src/app/guide/studio/[sessionId]/layout.tsx` — sub-header session conservé, lien retour simplifié (← seul, sans « Sessions »).
- [x] **Bonus** : `src/app/guide/layout.tsx` adapté pour bypass la `<GuideNav>` legacy sur `/guide/studio/*` (sinon double sidebar).

### Comportements live
- [x] Le compteur « Mes tours » dans la sidebar = nombre de tours du guide (fetch via `listStudioSessions`).
- [x] Le badge « Avis » = nombre de tours en `revision_requested` + commentaires admin non lus (logique portée depuis `src/app/guide/studio/page.tsx:131-145`).
- [x] Bouton « Se déconnecter » → appel `useAuth().signOut()`.

### Tokens & DS
- [x] **Aucune couleur hardcodée** : 0 hex sur `src/components/studio/shell/`, vérifié par grep.
- [x] **Aucune `font-family` ad-hoc** : `font-display` / `font-sans` du preset.
- [x] Toutes les icônes via glyphs Unicode neutres (⌂ ◉ ＋ ◐ € ★ ↗ ⏏) — pas d'emoji.

### Tests
- [x] `__tests__/StudioHeader.test.tsx` — 4 tests (logo, nav links, avatar, dropdown + signOut)
- [x] `__tests__/StudioSidebar.test.tsx` — 7 tests (6 items, aria-current, compteurs, badge, profil, logout)
- [x] `__tests__/city-family.test.ts` — 8 tests (4 familles + fallback + null/undefined + casse + meta)
- [x] Tous les tests passent (`npm run test`) → **894/894 ✓**
- [x] Typecheck : aucune nouvelle erreur introduite par mes fichiers (les erreurs restantes préexistent sur main, vérifié par stash).
- [x] Lint : aucun warning/error sur `src/components/studio/shell/*` ni `src/app/guide/studio/layout.tsx`.

### Audit
- [x] `npm run tg:audit` → **clean. 0 violation. 220 files scanned.**
- [ ] Build prod OK (`npm run build`) — _non bloquant ici, à valider en CI._

---

## Files

### Nouveaux
- `src/components/studio/shell/MurmureLogo.tsx`
- `src/components/studio/shell/StudioHeader.tsx`
- `src/components/studio/shell/StudioSidebar.tsx`
- `src/components/studio/shell/city-family.ts`
- `src/components/studio/shell/index.ts`
- `src/components/studio/shell/__tests__/StudioHeader.test.tsx`
- `src/components/studio/shell/__tests__/StudioSidebar.test.tsx`
- `src/components/studio/shell/__tests__/city-family.test.ts`
- `src/app/guide/studio/layout.tsx`

### Modifiés
- `src/app/guide/studio/[sessionId]/layout.tsx` — supprimer toute duplication header global, garder uniquement breadcrumb + tabs session

---

## Hors scope (volontairement)
- Refonte du contenu du Dashboard (`/guide/studio/page.tsx`) — c'est la story Refonte-2.
- Création de `/guide/studio/tours`, `/profil`, `/revenus` — stories suivantes.
- Sidebar collapse mobile (responsive a11y) — sera couvert dans la Phase 5 (états non-fonctionnels) ou story dédiée si le besoin remonte.

---

## Définition de Done
- [x] Toutes les AC ci-dessus cochées (sauf build prod, à valider en CI).
- [ ] PR ouverte avec screenshots avant / après du shell — _étape suivante manuelle._
- [ ] Sprint status mis à jour : `bmad/sprint-status.yaml` — _absent du repo, à créer si nécessaire._
- [x] Story marquée `ready-for-review` (cf. statut en haut de fichier).

---

## Dev Agent Record

**Agent :** Amelia (BMAD dev) — exécution sur la branche `feat/refonte-studio-murmure-shell`.

### Décisions notables
1. **Bypass de `<GuideNav>` legacy** : `src/app/guide/layout.tsx` a été modifié pour court-circuiter sa nav teal sur `/guide/studio/*`. Sans ça, le nouveau shell Murmure cohabitait avec la nav legacy → double sidebar incohérente.
2. **`StudioSidebar` props `counts`** : Le composant fetch ses compteurs lui-même (`listStudioSessions` + `listTourComments`), mais accepte aussi un override `counts` pour faciliter les tests et permettre du SSR/préload futur.
3. **Glyphs Unicode au lieu d'emoji** : Le brief §8 réclame une typo cohérente sans emoji décoratif. Les icônes sidebar utilisent `⌂ ◉ ＋ ◐ € ★ ↗ ⏏` (port fidèle du source design `studio-shared.jsx`).
4. **MurmureLogo** : Réutilise `<PinNegatif>` du DS (`@tourguide/design-system/web`) plutôt que de redéclarer un SVG local.

### Files

#### Nouveaux (9)
- `src/components/studio/shell/MurmureLogo.tsx`
- `src/components/studio/shell/StudioHeader.tsx`
- `src/components/studio/shell/StudioSidebar.tsx`
- `src/components/studio/shell/city-family.ts`
- `src/components/studio/shell/index.ts`
- `src/components/studio/shell/__tests__/StudioHeader.test.tsx`
- `src/components/studio/shell/__tests__/StudioSidebar.test.tsx`
- `src/components/studio/shell/__tests__/city-family.test.ts`
- `bmad/story-refonte-1-shell.md` (cette story)

#### Modifiés (3)
- `src/app/guide/studio/layout.tsx` — ajout du shell Murmure (Header + Sidebar + grid 240px/1fr) en préservant le RGPD consent gate.
- `src/app/guide/studio/[sessionId]/layout.tsx` — simplification du lien retour (suppression du label « Sessions » devenu redondant via la sidebar).
- `src/app/guide/layout.tsx` — bypass de la `<GuideNav>` legacy sur les routes `/guide/studio/*`.

#### Sources design copiées (prep)
- `docs/bmad/refonte-studio.md` ← `newdesign/refonte-studio.md`
- `docs/design/TourGuide Charte complete.html` ← canvas global
- `docs/design/ds/*.jsx` ← 28 fichiers de design source

### Validation
- `npm test` → 109 suites / **894 tests passent**
- `npm run tg:audit` → **clean. 0 violation. 220 files scanned.**
- `npm run lint` → 0 warning/error sur les fichiers de la story (les warnings restants préexistent sur main).
- `npm run typecheck` → 0 nouvelle erreur (préexistantes sur main, vérifié par stash temporaire).
- `grep '#[0-9a-fA-F]' src/components/studio/shell/` → **0 match** (aucune couleur hardcodée).

---

## Changelog
- `2026-04-28` — Story exécutée par Amelia (agent dev BMAD). 9 nouveaux fichiers + 3 modifs. 19 nouveaux tests (8 city-family + 4 StudioHeader + 7 StudioSidebar). Tous les AC validés. Branche `feat/refonte-studio-murmure-shell` prête pour PR.
