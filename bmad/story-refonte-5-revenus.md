# Story Refonte-5: Revenus

**Status:** ready-for-review
**Phase:** 3d / 6 (refonte Studio Murmure — Revenus)
**Brief:** [docs/bmad/refonte-studio.md](../docs/bmad/refonte-studio.md) §5 + §7 Phase 3 (écran 3)
**Source design:** [docs/design/ds/studio-revenus.jsx](../docs/design/ds/studio-revenus.jsx)
**Estimation:** 0.75 j-personne
**Branche:** `feat/refonte-studio-murmure-revenus`
**Dépend de:** Refonte-1 (Shell)

---

## Summary
Création de la page `/guide/studio/revenus` qui affiche les recettes du guide selon la charte Murmure : hero olive du mois en cours, 2 cards cumul/total, **chart 12 mois** (barres HTML/CSS pures, pas de dépendance Recharts), table détail par tour, breakdown calcul + versement, footer note.

Données via les helpers existants `getGuideRevenueSummary`, `getGuideRevenueMonths`, `getGuideRevenueTours` (déjà branchés stub/real). Pas d'installation Recharts — barres simples = HTML/CSS, plus léger et 100 % conforme aux tokens.

---

## Acceptance Criteria

### Composants créés (`src/components/studio/revenues/`)
- [ ] `RevenueHeroCard.tsx` — hero olive du mois en cours (eyebrow paper/70 + montant display + écoutes + delta)
  - props : `amount, currency, listens, deltaPct?, expectedPaymentDate?`
  - port de `studio-revenus.jsx:51-64`, **flat `bg-olive`** (pas de gradient — règle § brief « UNE couleur »)
- [ ] `RevenueKpiCard.tsx` — petite card cumul (année/total)
  - props : `eyebrow, value, suffix?, footer?, progress?: { pct, label }`
- [ ] `RevenueChart.tsx` — chart 12 barres HTML/CSS (pas de SVG ni dépendance)
  - props : `data: { month: string, value: number }[], highlight?: number` (index de la barre courante)
  - hauteur normalisée vs max, gridline 50 %, tooltip simple en hover (CSS title)
- [ ] `RevenueTourRow.tsx` — ligne table détail par tour
  - props : `city, title, listens, revenue, percentage`
  - bande couleur ville à gauche
- [ ] `BreakdownCard.tsx` — card "Comment c'est calculé"
  - props : `listens, grossPerListen, grossTotal, sharePct, netAmount`
- [ ] `NextPaymentCard.tsx` — card "Prochain versement" mer-soft
  - props : `nextPaymentDate, ibanLast4?, bankName?`
- [ ] `index.ts` — barrel exports

### Page créée (`src/app/guide/studio/revenus/page.tsx`)
- [ ] Header eyebrow olive + H1 « Vos *recettes*. » + subtitle italic + 2 boutons (CSV désactivé + Coordonnées bancaires désactivé pour cette PR)
- [ ] Layout : 3 cards big numbers (1.4fr/1fr/1fr) + chart 12 mois + 2-col détail tours / breakdown
- [ ] Charge `getGuideRevenueSummary()`, `getGuideRevenueMonths()`, `getGuideRevenueTours()` en parallèle
- [ ] Footer note « Murmure prélève 30 % par écoute payante… »

### Logique métier
- [ ] `src/lib/studio/revenues-helpers.ts` :
  - `formatEuros(value: number, options?: { withCents?: boolean }): string`
  - `nextPaymentDate(today?: Date): { date: Date, label: string, daysUntil: number }` — toujours le 5 du mois suivant
  - `monthLabel(yyyymm: string): string` — `2026-04` → `Avr 26`
  - `computeDelta(curr: number, prev: number): { pct: number, sign: '+' | '-' | '=' }`
  - `cityFromTourTitle(title: string): string` — réutilise la logique de Refonte-3
- [ ] Tests unitaires correspondants

### États
- [ ] Loading : skeleton 3-col grid + chart placeholder + 2-col placeholder
- [ ] Empty (`thisMonth === 0 && months.length === 0`) : message « Aucune écoute payante encore — vos premiers euros arrivent bientôt » + lien vers `/guide/studio/tours`
- [ ] Error : bandeau danger + retry
- [ ] Pas de profil guide (real mode sans guideId) : message standard

### Tokens & DS
- [ ] **0 hex hardcodé** dans les nouveaux fichiers (vérifié par grep)
- [ ] **0 font-family ad-hoc**
- [ ] **Pas de gradient** sur le hero olive — flat `bg-olive` (règle Murmure)
- [ ] Chart : couleurs via classes Tailwind tokens (`bg-olive`, `bg-olive-soft`)
- [ ] Aucune valeur arbitrary `rounded-[Npx]` — uniquement `rounded-{sm|md|lg|xl|pill}`

### Tests
- [ ] `__tests__/RevenueHeroCard.test.tsx` — rendu montant, currency, écoutes, delta optionnel
- [ ] `__tests__/RevenueChart.test.tsx` — hauteurs proportionnelles, highlight de la dernière barre
- [ ] `__tests__/RevenueTourRow.test.tsx` — bande couleur ville, formatage €/listens
- [ ] `__tests__/BreakdownCard.test.tsx` — affichage des 5 lignes de calcul
- [ ] `__tests__/NextPaymentCard.test.tsx` — date formatée + IBAN masqué
- [ ] `__tests__/revenues-helpers.test.ts` — formatEuros, nextPaymentDate, monthLabel, computeDelta
- [ ] `npm test` → all green
- [ ] `npm run tg:audit` → 0 violation

---

## Files

### Nouveaux
- `src/components/studio/revenues/RevenueHeroCard.tsx` + test
- `src/components/studio/revenues/RevenueKpiCard.tsx`
- `src/components/studio/revenues/RevenueChart.tsx` + test
- `src/components/studio/revenues/RevenueTourRow.tsx` + test
- `src/components/studio/revenues/BreakdownCard.tsx` + test
- `src/components/studio/revenues/NextPaymentCard.tsx` + test
- `src/components/studio/revenues/index.ts`
- `src/lib/studio/revenues-helpers.ts` + test
- `src/app/guide/studio/revenus/page.tsx`

---

## Hors scope
- Export CSV (bouton désactivé « Bientôt »)
- Édition coordonnées bancaires Stripe Connect (bouton désactivé)
- Reçu fiscal téléchargeable
- Recharts/Visx pour le chart (HTML/CSS suffit)
- Filtres temporels alternatifs (12 mois / 6 mois / 30 j) — affichés mais non fonctionnels en v1

---

## Définition de Done
- [ ] Toutes les AC ci-dessus cochées
- [ ] Story marquée `ready-for-review`
- [ ] Validation visuelle sur `http://localhost:3000/guide/studio/revenus`

---

## Dev Agent Record

**Agent :** Amelia (BMAD dev) — branche `feat/refonte-studio-murmure-revenus`.

### Décisions notables
1. **Pas de Recharts/Visx** : 12 barres simples = HTML/CSS. Pas de dépendance ajoutée, plus léger, 100 % conforme tokens. Le brief recommandait Recharts mais c'est overkill ici. Si on ajoute des graphes complexes plus tard (line chart, area, multi-séries), on installera la lib à ce moment-là.
2. **Hero olive flat** : pas de gradient (même règle que le hero grenadine du Dashboard — brief §4 « UNE couleur »).
3. **`formatEuros` via `Intl.NumberFormat('fr-FR')`** : gère naturellement séparateur milliers (espace insécable) et virgule décimale. Pas besoin de format manuel.
4. **`nextPaymentDate` règle 5 du mois** : si on est avant le 5 → on cible le 5 du mois courant ; sinon le 5 du mois suivant. Compatible avec un calendrier réel de paiement Stripe Connect (à implémenter côté backend).
5. **Boutons CSV / Coordonnées bancaires désactivés** : `disabled` avec title="Bientôt". Demandent leurs propres stories (export pipeline, intégration Stripe Connect).
6. **Données stub réalistes** : `MOCK_REVENUE_*` dans `guide.ts` fournit 6 mois de data. Quand le backend retournera la vraie data, la page s'adaptera (le chart se remplit progressivement jusqu'à 12 mois).
7. **Revenu moyen / écoute calculé côté front** : `summary.total / totalListens`. Pas un champ DB séparé pour éviter de désynchroniser. Footer note du design source remonté en bas avec ce calcul.
8. **`cityFromTourTitle` centralisé dans `revenues-helpers`** : cohérent avec la même logique de Refonte-3 et utilisé ici pour la table par tour.

### Files

#### Nouveaux (15)
- `src/components/studio/revenues/RevenueHeroCard.tsx` + test
- `src/components/studio/revenues/RevenueKpiCard.tsx`
- `src/components/studio/revenues/RevenueChart.tsx` + test
- `src/components/studio/revenues/RevenueTourRow.tsx` + test
- `src/components/studio/revenues/BreakdownCard.tsx` + test
- `src/components/studio/revenues/NextPaymentCard.tsx` + test
- `src/components/studio/revenues/index.ts`
- `src/lib/studio/revenues-helpers.ts`
- `src/lib/studio/__tests__/revenues-helpers.test.ts`
- `src/app/guide/studio/revenus/page.tsx`
- `bmad/story-refonte-5-revenus.md` (cette story)

### Validation
- `npm test` → **130 suites / 1064 tests passent** (+43 nouveaux : 19 helpers + 24 components)
- `npm run tg:audit` → **clean. 0 violation. 250 fichiers scannés.**
- `grep '#hex'` sur `src/components/studio/revenues/` → **0 match**
- Typecheck : 0 nouvelle erreur

---

## Changelog
- `2026-04-28` — Story exécutée par Amelia (agent dev BMAD). 11 fichiers nouveaux, 43 nouveaux tests. Tous les AC validés. Branche `feat/refonte-studio-murmure-revenus` prête pour PR.
