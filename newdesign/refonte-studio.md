# BMAD Brief — Refonte TourGuide Studio
## Mise à jour visuelle du site sur la nouvelle charte « Murmure »

> Document d'entrée pour Claude Code · v1.1 · à coller dans `docs/bmad/refonte-studio.md`

---

## 1. Contexte

L'app TourGuide a été redesignée. La charte s'appelle **Murmure** (cartographic color-block + voix éditoriale). Tous les écrans existent en maquette dans le canvas `TourGuide Charte complete.html`, sections 02, 02 bis et **02 ter** (le wizard de création).

Cette mission concerne **uniquement le site web Studio** (back-office des guides-auteurs). L'app mobile et la landing publique seront traitées dans des PR séparées.

---

## 2. Périmètre — 11 écrans à livrer

### A. Studio principal — section 02 bis (5 écrans)
1. `/studio` — **Dashboard** (hero "Reprendre" + 4 KPIs + top tours + avis)
2. `/studio/tours` — **Mes tours** (cards bande couleur ville, filtres, tri)
3. `/studio/revenus` — **Revenus** (hero olive + histogramme 12 mois + détail)
4. `/studio/profil` — **Mon Profil** (form + preview live)
5. `/studio/tours/:id/scenes` — **Studio Editor** (timeline + carte + éditeur ProseMirror)

### B. Wizard création/édition d'un tour — section 02 ter (6 écrans)
Chaque étape partage le même `WizardShell` (header + sidebar + breadcrumb + tabs) :

6. `/studio/tours/:id` — **01 · Accueil** (vue d'ensemble + quota transcription)
7. `/studio/tours/:id/general` — **02 · Général** (méta : photo, titre, ville, thèmes, etc.)
8. `/studio/tours/:id/itineraire` — **03 · Itinéraire** (carte + POIs ordonnés)
9. `/studio/tours/:id/scenes` — **04 · Scènes** (sidebar scènes + tabs langues + sous-tabs POI/Photos/Texte/Audio)
10. `/studio/tours/:id/preview` — **05 · Preview** (vue Studio / vue Catalogue + Écouter tout)
11. `/studio/tours/:id/publication` — **06 · Publication** (statut + actions + journal modération + langues)

---

## 3. Sources de vérité — fichiers à fournir à Claude Code

À copier dans le repo cible sous `docs/design/` :

```
TourGuide Charte complete.html       ← le canvas global (preview)
ds/tokens.jsx                        ← tokens TG.color, TG.font, TG.radius, TG.space
ds/components.jsx                    ← TGButton, TGCard, TGChip, TGPin, TGEyebrow, TGNumber
ds/pin-negatif.jsx                   ← logo Murmure
ds/map.jsx                           ← TGMap (placeholder carte stylisée)

ds/studio-shared.jsx                 ← StudioHeader + StudioSidebar + FAM + cityFamily()
ds/studio-dashboard.jsx              ← écran 1
ds/studio-tours.jsx                  ← écran 2
ds/studio-revenus.jsx                ← écran 3
ds/studio-profile.jsx                ← écran 4
ds/studio-editor.jsx                 ← écran 5

ds/wizard-shared.jsx                 ← WizardShell + WIZARD_TABS + StepNav + HintCard
ds/wizard-1-accueil.jsx              ← écran 6
ds/wizard-2-general.jsx              ← écran 7  (+ exporte WizField, WizInput, WizSelect)
ds/wizard-3-itineraire.jsx           ← écran 8
ds/wizard-4-scenes.jsx               ← écran 9
ds/wizard-5-preview.jsx              ← écran 10
ds/wizard-6-publication.jsx          ← écran 11

ds/handoff-page.jsx                  ← rappel des règles + plan de migration
```

---

## 4. Tokens — règles non-négociables

```ts
// @tourguide/design-system/tokens.ts
export const color = {
  // Surfaces
  paper: '#FBF7EF',         // fond principal
  paperDeep: '#F2EBDB',     // fond secondaire (zones bandeau, headers de table)
  card: '#FFFFFF',
  ink: '#1A1A1F',           // texte principal
  ink80: '#2D2D33',
  ink60: '#6B6B72',
  ink40: '#9A9AA0',
  ink20: '#D4D4D8',
  line: '#E8E2D4',
  lineSoft: '#F0EBDF',

  // Marque
  grenadine: '#C44A6E',     // accent principal · CTA · sélection · marque
  grenadineSoft: '#FAEBE8',

  // Couleurs ville (cf §6)
  mer: '#1F4E6B',     merSoft: '#E0EAF0',
  ocre: '#C77D3E',    ocreSoft: '#F7E8D6',
  olive: '#5C6E3C',   oliveSoft: '#E8EBDB',
  ardoise: '#4A4E5A', ardoiseSoft: '#E5E6EB',

  // Sémantique
  success: '#3F7A4D',
  danger: '#B43A3A',
};

export const font = {
  display: '"DM Serif Display", Georgia, serif',   // h1, hero
  editorial: '"Fraunces", Georgia, serif',         // citations, italiques, taglines
  sans: '"Söhne", "Inter", system-ui, sans-serif', // UI
  mono: '"JetBrains Mono", "SF Mono", monospace',  // chiffres, GPS, code
};

export const radius = { sm: 4, md: 8, lg: 14, xl: 22, pill: 999 };
export const space  = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48 };
```

**Règles** (cf `handoff-page.jsx`) :
1. Ne jamais hardcoder une couleur, taille, rayon → toujours via tokens.
2. Grenadine = UNE couleur, pas une famille. Pas de `#FF5722` ni `#E94B40`.
3. Pas de `font-family: Arial` en fallback.
4. Renommer une prop = breaking → bump major.
5. Composer, pas forker.

---

## 5. Composants à packager

### Shell Studio (déjà conçus)
- `<StudioHeader>` — barre haut (logo Murmure + nav globale + user)
- `<StudioSidebar active>` — nav latérale 240px (Dashboard / Mon Studio / Mes Parcours / Mon Profil / Revenus / Déconnexion)

### Wizard (déjà conçus)
- `<WizardShell active children sidebar? breadcrumb status lang>` — wrapper des 6 étapes
- `<StepNav prev next prevLabel nextLabel>` — boutons navigation séquentielle
- `<HintCard color icon>` — encart de conseil (♪ Mer / 💡 Olive)
- `<WizField label required hint children>` — wrapper de champ
- `<WizInput value placeholder>` / `<WizSelect value>` — inputs

### Studio (à compléter côté dev)
- `<KpiCard label value delta color icon>` — stats dashboard
- `<TourCard city title plays rating status thumb>` — card "Mes tours"
- `<ScenesTimeline scenes activeId onReorder>` — sidebar scènes éditeur
- `<SceneEditor scene onChange onGenerateVoice>` — bloc d'écriture (Tiptap)

### Génériques
- `<Button variant size iconLeft fullWidth>` — variants : `primary | accent | ghost`, sizes : `sm | md | lg`
- `<Card elevation bleed>` / `<Chip color active iconLeft>` / `<Pin size color>` / `<Eyebrow color>`

---

## 6. Couleur ville — règle d'attribution automatique

```ts
// @tourguide/design-system/cityFamily.ts
const DB: Record<string, 'mer'|'ocre'|'olive'|'ardoise'> = {
  // Mer — côte, port, eau
  nice: 'mer', cannes: 'mer', marseille: 'mer', 'saint-tropez': 'mer', menton: 'mer',
  // Ocre — terres chaudes, parfum, pierre
  grasse: 'ocre', avignon: 'ocre', arles: 'ocre', uzès: 'ocre',
  // Olive — nature, montagne, sentier
  vence: 'olive', autran: 'olive', gordes: 'olive', annecy: 'olive',
  // Ardoise — pierre froide, urbain
  paris: 'ardoise', lyon: 'ardoise', strasbourg: 'ardoise',
};
export function cityFamily(city: string) {
  return DB[city.toLowerCase().trim()] || 'ardoise';
}
```

**Le champ "Ville" du formulaire Général déclenche automatiquement la couleur ville.** Aucune intervention manuelle de l'auteur.

---

## 7. Tâches techniques pour Claude Code

### Phase 0 · Prep (½ j)
- [ ] Créer un package interne `@tourguide/design-system` (workspace pnpm).
- [ ] Y ajouter `tokens.ts`, `tokens.css` (CSS variables auto-générées), `tailwind.preset.js`.
- [ ] Importer `tokens.css` dans le layout root du Studio.
- [ ] Charger les fonts : DM Serif Display, Fraunces, Söhne (ou Inter en fallback), JetBrains Mono.

### Phase 1 · Composants génériques (2 j)
- [ ] Porter `<Button>`, `<Card>`, `<Chip>`, `<Pin>`, `<Eyebrow>`, `<NumberMark>`, `<PullQuote>` en TSX strict.
- [ ] Storybook minimal avec une story par variant.

### Phase 2 · Shell Studio (1 j)
- [ ] `<StudioHeader>` + `<StudioSidebar>` câblés sur le router (Next/Remix/RR selon stack actuelle).
- [ ] Layout `/studio/*` qui injecte ce shell.
- [ ] Badge "X nouveaux avis" sur sidebar = fetch live.

### Phase 3 · 5 écrans Studio principal (5 j)
- [ ] Dashboard : KPIs, top tours, derniers avis, suggestion contextuelle.
- [ ] Mes tours : liste filtrable + tri + recherche.
- [ ] Revenus : histogramme 12 mois (Recharts ou D3), versement, calcul transparent.
- [ ] Mon Profil : form + preview live (split 50/50).
- [ ] Studio Editor : carte (Mapbox GL ou MapLibre, style custom), timeline, éditeur **Tiptap** (gras / italique / lien / surlignage grenadine, c'est tout).

### Phase 4 · Wizard 6 étapes (4-5 j)
- [ ] `<WizardShell>` partagé + routes nested.
- [ ] Step 01 — Accueil : vue d'ensemble.
- [ ] Step 02 — Général : form + accordéon "Session terrain".
- [ ] Step 03 — Itinéraire : carte interactive (drag-and-drop POIs), reordering.
- [ ] Step 04 — Scènes : sidebar scènes + 4 langues + 4 sous-tabs (POI/Photos/Texte/Audio).
- [ ] Step 05 — Preview : toggle Studio/Catalogue, lecture séquentielle audio.
- [ ] Step 06 — Publication : actions, journal modération (chat temps réel), tableau langues.

### Phase 5 · États non-fonctionnels (1 j)
- [ ] États empty (aucun tour, aucun avis, aucun message).
- [ ] États loading (skeletons cohérents, pas de spinner par défaut).
- [ ] États erreur (offline, sauvegarde KO, conflit) — bandeau danger en haut, retry inline.
- [ ] Toast de succès en grenadine soft, position bottom-right.

### Phase 6 · Audit (½ j)
- [ ] Aucune couleur hardcodée (`grep -r "#" src/ | grep -v var(--`).
- [ ] Aucune `font-family` qui n'est pas un token.
- [ ] Tous les boutons utilisent `<Button>`, pas de `<button>` natif stylé.
- [ ] Tous les chips utilisent `<Chip>`.

**Total estimé : 13-15 jours-personne.**

---

## 8. Comportements clés à conserver / corriger

### À conserver depuis le Studio actuel
- Auto-save à chaque modification de scène (debounce 1s).
- 4 langues (FR + DE + ES + EN), FR = source.
- Soumission par langue (pas tout-ou-rien).
- Les screenshots de référence sont dans `docs/design/screenshots-existant/`.

### À corriger
- ❌ Le Quota transcription est une simple ligne barrée — ✅ **devient une jauge avec reste calculé**.
- ❌ Les statuts "Brouillon / Soumis / Finalisé" ont la même couleur — ✅ **codés couleur** (Ocre / Mer / Vert).
- ❌ Le tab "Publier" est un radio bouton fade — ✅ **bandeau Mer plein avec icône et flèche**.
- ❌ La couleur ville n'apparaît nulle part — ✅ **partout** (badge, bande latérale des cards, pins de carte).
- ❌ Pas de hiérarchie typo (tout en système) — ✅ **DM Serif Display sur titres, Fraunces italique sur citations**.
- ❌ Le bandeau Brouillon est un long paragraphe gris — ✅ **bandeau ocre concis avec V1**.

---

## 9. Tech stack recommandée

| Besoin | Reco |
|---|---|
| Carte interactive | **Mapbox GL** (style custom selon tokens) ou MapLibre si OSS uniquement |
| Éditeur de texte | **Tiptap** (sur ProseMirror) |
| Charts (Revenus) | **Recharts** ou **Visx** |
| Drag-and-drop POIs | **dnd-kit** |
| State (tour en cours) | **Zustand** ou **Jotai** |
| Form | **react-hook-form** + zod |
| i18n langues UI | **next-intl** ou **react-i18next** |

---

## 10. Definition of Done

- [ ] Les 11 écrans matchent visuellement les artboards (à 5% près).
- [ ] Aucune erreur console, aucune erreur a11y axe-core sévère.
- [ ] Lighthouse Performance ≥ 85, Accessibility ≥ 95 sur Dashboard et Editor.
- [ ] Build prod < 350 Ko gzip pour le bundle Studio.
- [ ] Storybook accessible avec au moins 1 story par composant DS.
- [ ] PR scindées par phase pour reviewability (6 PRs max).

---

## 11. Pour démarrer côté Claude Code

```bash
# Dans le repo TourGuide
git checkout -b feat/refonte-studio-murmure

# Copier les fichiers de design
cp -r ../canvas-charte/ds docs/design/ds
cp ../canvas-charte/"TourGuide Charte complete.html" docs/design/

# Lire le brief
cat docs/bmad/refonte-studio.md  # ce document

# Bootstraper le DS
mkdir -p packages/design-system/src
# … suivre Phase 0 ci-dessus
```

**Premier prompt à Claude Code :**
> Lis `docs/bmad/refonte-studio.md` et `docs/design/TourGuide Charte complete.html`. Démarre la **Phase 0** : crée le package `@tourguide/design-system` avec les tokens TS + CSS variables + Tailwind preset. Reproduis exactement les valeurs du §4 du brief. Fais une PR.
