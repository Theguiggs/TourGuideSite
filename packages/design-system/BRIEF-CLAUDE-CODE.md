# TourGuide — Brief Implémentation pour Claude Code

> **Pour qui** : Claude Code (ou tout dev senior) qui va implémenter la nouvelle charte sur **TourGuideWeb** (Next.js) et **TourGuideApp** (React Native / Expo).
>
> **À lire en premier**. Ce document est exhaustif — vous y trouverez tout : tokens, composants, écrans, icônes, copywriting, plan de migration.

---

## 0 · TL;DR — Ce que vous allez faire

1. **Installer** le package `@tourguide/design-system` (sources fournies dans `handoff/`).
2. **Migrer TourGuideWeb** (apps/web) sur le nouveau Tailwind preset + composants.
3. **Migrer TourGuideApp** (apps/mobile) sur les tokens TS + composants RN équivalents.
4. **Remplacer l'app icon** par `PinNegatif` (grenadine + papier).
5. **Mettre à jour le copywriting** selon la voix éditoriale définie ci-dessous.

Estimation : **~8 jours** dev senior pour une migration complète des deux apps.

---

## 1 · Direction visuelle retenue

**Cartographic + Editorial** — le monde a une voix, raconté avec du papier, de l'encre et une épingle grenadine.

| Principe | Traduction concrète |
|---|---|
| **Le papier comme support** | Fond `#F4ECDD` (papier crème), pas de blanc pur sur les écrans principaux |
| **L'épingle comme ADN** | Pin grenadine présente partout : logo, app icon, marqueurs carte, séparateurs |
| **La voix éditoriale** | DM Serif Display pour les titres, italique DM Serif Text pour les citations/accroches, Manrope pour l'UI |
| **Couleurs ville** | 4 accents : grenadine (sud/CTA), ocre (arrière-pays), mer (côte), olive (nature) — jamais plus de 2 par écran |
| **Pas de gradients, pas d'emojis UI** | On reste sobre, éditorial, intemporel |

---

## 2 · Tokens (source unique de vérité)

### 2.1 Couleurs

```ts
// handoff/tokens.ts
export const tgColors = {
  // Surfaces
  paper:      '#F4ECDD',  // fond principal
  paperSoft:  '#EFE4D0',
  paperDeep:  '#E8DCC4',
  card:       '#FFFFFF',

  // Encre / texte
  ink:        '#102A43',
  ink80:      'rgba(16, 42, 67, 0.8)',
  ink60:      'rgba(16, 42, 67, 0.6)',
  ink40:      'rgba(16, 42, 67, 0.4)',
  ink20:      'rgba(16, 42, 67, 0.2)',
  line:       'rgba(16, 42, 67, 0.10)',

  // Accents ville
  grenadine:      '#C1262A',  grenadineSoft: '#FBE5E2',
  ocre:           '#C68B3E',  ocreSoft:      '#F5E4C7',
  mer:            '#2B6E8A',  merSoft:       '#D7E5EC',
  olive:          '#6B7A45',  oliveSoft:     '#E2E5D2',

  // États
  success: '#4F7942',  warning: '#C68B3E',
  danger:  '#C1262A',  info:    '#2B6E8A',
};
```

### 2.2 Typographie

| Famille | Usage | Source |
|---|---|---|
| **DM Serif Display** | Titres ≥ 22 px | Google Fonts |
| **DM Serif Text** italique | Citations, accroches éditoriales | Google Fonts |
| **Manrope** | UI, body, meta, boutons | Google Fonts |
| **JetBrains Mono** | Time codes, valeurs techniques | Google Fonts |

```ts
export const tgFonts = {
  sans:      'Manrope, Inter, system-ui, sans-serif',
  display:   '"DM Serif Display", "Playfair Display", Georgia, serif',
  editorial: '"DM Serif Text", Georgia, serif',
  mono:      '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
};
```

**Échelle** : eyebrow 11 / meta 12 / caption 13 / body 14 / body-lg 16 / h6 18 / h5 22 / h4 30 / h3 40 / h2 56 / h1 72.

**Eyebrow** (essentiel) : 11 px, MAJUSCULES, letter-spacing 0.18em, 700, posé au-dessus de chaque titre. C'est la signature visuelle du DS.

### 2.3 Espacements (4 pt grid)

`4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80`. Aucune autre valeur.

### 2.4 Rayons

`sm 6 · md 12 · lg 18 · xl 28 · pill 999`. Aucune autre valeur.

### 2.5 Ombres

```ts
sm:     '0 1px 2px rgba(16, 42, 67, 0.06)',
md:     '0 4px 12px rgba(16, 42, 67, 0.08)',
lg:     '0 12px 28px rgba(16, 42, 67, 0.14)',
xl:     '0 24px 60px rgba(16, 42, 67, 0.18)',
accent: '0 12px 28px rgba(193, 38, 42, 0.22)',  // lueur grenadine
```

---

## 3 · Composants

Tous fournis dans `handoff/components/` en TypeScript React. À porter en RN pour mobile (mêmes props, mêmes noms).

| Composant | Variantes | Notes |
|---|---|---|
| `<Button>` | `primary` `accent` `ghost` × `sm` `md` `lg` | Pill, font Manrope 600. Accent porte shadow grenadine. |
| `<Card>` | `flat` `sm` `md` `lg` | + `Card.Header`, `Card.Body`, `Card.Footer`. Bord 1px line. |
| `<Chip>` | `default` `grenadine` `ocre` `mer` `olive` × `active` | Pill, 12px, 600. |
| `<Pin>` | `size` `color` `dot` `label` | SVG. Avec `label` = numéro étape. |
| `<PinNegatif>` | `size` `bg` `fg` `rounded` | Pour app icon, splash, favicon. |
| `<Player>` | `mini` `full` | L'écran le plus important — soin maximum. |
| `<Eyebrow>` | `color` | Surtitre 11px tracking 0.18em uppercase 700. |
| `<PullQuote>` | `sm` `md` `lg` | Italique DM Serif Text. |
| `<NumberMark>` | `n` `color` `size` | Numéros éditoriaux 01/02/03 en DM Serif Display. |

**Règles d'usage** :
- Ne jamais rebuild un Button — toujours passer par `<Button>`.
- Pas de `style={{ color: 'red' }}` — utilisez `tg.colors.grenadine`.
- Pas de fallback caché type `font-family: Arial` — les tokens définissent les fallbacks.

---

## 4 · App icon + Branding

**Décision** : Pin négatif (forme épingle évidée sur fond couleur).

### 4.1 Versions à fournir

| Fichier | Format | Couleurs | Tailles |
|---|---|---|---|
| `app-icon-light.png` | PNG | bg grenadine `#C1262A`, fg paper `#F4ECDD` | 1024×1024 |
| `app-icon-dark.png` | PNG | bg `#5B0F12`, fg `#F4ECDD` | 1024×1024 |
| `app-icon-tinted.png` | PNG (alpha) | forme grise `#9CA3AF` sur transparent | 1024×1024 |
| `app-icon.svg` | SVG | grenadine + paper | vectoriel |
| `favicon.svg` | SVG | identique app-icon | vectoriel |
| `favicon-32.png` | PNG | identique | 32×32 |
| `favicon-192.png` | PNG | identique | 192×192 |
| `favicon-512.png` | PNG | identique | 512×512 |
| `splash-light.png` | PNG | fond grenadine + pin papier inversée | 2048×2732 |
| `splash-dark.png` | PNG | fond `#1A1612` + pin grenadine | 2048×2732 |

Le composant `<PinNegatif>` permet de générer ces assets — voir `handoff/components/Pin.tsx`. Pour exporter, render à 1024 puis screenshot, ou utiliser `react-native-svg` + export.

### 4.2 Splash screen — copy

```
TourGuide
Le monde a une voix.
VERSION 2.4
```

---

## 5 · Iconographie

Set v1 — 23 icônes, **trait 1.5 px, currentColor, coins arrondis**, viewBox 24×24. À implémenter dans `handoff/components/icons/` (un fichier par icône).

| Groupe | Icônes |
|---|---|
| **Navigation** | home, catalog, profile, search, settings, back, close |
| **Lecture** | play, pause, skip-forward-15, skip-back-15, download, downloaded |
| **État** | check, lock, alert, info, gps, offline |
| **UI** | heart, share, more, chevron, plus |

Pin **n'est PAS dans le set d'icônes** — c'est un composant à part (`<Pin>`).

**Règles** :
- Tous en `currentColor` (héritent la couleur du parent).
- Taille minimum d'usage : 16 px. Optimal : 20–24 px.
- Hit target tap (mobile) : 44 × 44 minimum, même si l'icône fait 20 px.

---

## 6 · Imagerie

**Décision** : pas de photos pour l'instant. Imagerie color-block typographique.

### Pattern color-block

Une carte de tour = bloc couleur ville + nom du tour en DM Serif Display + ville/durée en eyebrow.

```tsx
<div style={{ background: tg.colors.ocreSoft, padding: 24, borderRadius: tg.radius.lg }}>
  <Eyebrow color={tg.colors.ocre}>Aix-en-Provence · 38 min</Eyebrow>
  <h3 className="tg-display" style={{ fontSize: 30, marginTop: 8 }}>
    Cézanne, l'atelier des Lauves
  </h3>
</div>
```

**Plus tard** (phase 2) : illustrations au papier + photos argentiques pour les portraits de guides.

---

## 7 · Voix éditoriale (copywriting)

### Ton
- **Cultivé sans être prétentieux** — on dit "place du Cours" pas "place historique du Cours Mirabeau".
- **Sensoriel** — les odeurs, les sons, les matières plutôt que les dates.
- **Court** — un titre tient en 6 mots, une accroche en 12.
- **Impératif doux** — "Écoutez", "Tournez à droite", jamais "Vous devez".

### Lexique
- **Tour** (pas "parcours", pas "circuit")
- **Étape** (pas "point d'intérêt", pas "POI")
- **Guide** (pour la voix narrante)
- **Écouter** (pas "lire", pas "démarrer")
- **Hors-ligne** (pas "offline" en français)

### Exemples concrets

**Titre tour** : `Le vieux Aix, secret`
**Accroche italique** : `*Là où Zola courait, gamin, derrière les grandes herbes.*`
**CTA principal** : `Écouter le tour` (pas "Démarrer", pas "Lancer")
**Empty state offline** : `Pas de réseau. Vos téléchargements sont là.` (constat + solution)
**Notification d'arrivée** : `Vous arrivez Place Saint-François. Le commentaire démarre dans 30 s.`

### Microcopy boutons

| Action | Copy |
|---|---|
| CTA primaire (lecture) | Écouter |
| CTA primaire (achat tour) | Obtenir le tour |
| CTA primaire (premium) | Devenir membre |
| Action carte | Voir sur la carte |
| Téléchargement | Télécharger pour l'avion |
| Partage | Partager ce tour |

---

## 8 · Écrans à livrer

### TourGuideApp (mobile)

| Écran | Statut design | Composants clés |
|---|---|---|
| Onboarding 1/3 | ✅ | Pin animé + DM Serif title + Manrope sub + 3 dots + ghost btn |
| Onboarding 2/3 (offline) | ✅ | Waveform illustration + offline icon |
| Onboarding 3/3 | ⚠️ à finaliser | Permission GPS request |
| Home | ✅ | Hero éditorial + Tour du jour + Carrousel villes + Tab bar |
| Catalogue | ✅ | Filtres pills + cards color-block + tri |
| Recherche | ✅ | Input + récents + suggestions + résultats |
| Fiche tour | ✅ | Hero + meta chips + accroche italique + liste étapes + CTA accent |
| Player mini | ✅ | Sticky bottom 64px |
| Player full | ✅ | Carte position + arrêt en cours + scrubber + transcript |
| Téléchargements | ✅ | Liste + jauge stockage + bouton "tout sup" |
| Création UGC 1/4 | ✅ | Form titre + ville + catégorie |
| Profil | ✅ | Avatar + tours suivis + stats + paramètres |
| Paramètres | ✅ | Liste sections (compte, lecture, langues, à propos) |
| Empty · pas de réseau | ✅ | Illustration + 1 CTA "voir téléchargements" |
| Empty · GPS désactivé | ✅ | Illustration + 1 CTA "activer" |
| ⚠️ Paywall premium | À faire | — |
| ⚠️ Tour terminé / récap | À faire | — |
| ⚠️ Partage social | À faire | — |

### TourGuideWeb

| Écran | Statut |
|---|---|
| Home (landing) | ✅ Hero + sections + footer |
| Catalogue villes | ✅ |
| Fiche tour (web) | ✅ |
| ⚠️ Pricing | À faire |
| ⚠️ Blog / éditorial | À faire |
| ⚠️ À propos | À faire |

---

## 9 · Plan de migration (8 jours dev)

### Jour 1 — Setup
- [ ] Copier `handoff/` dans le monorepo (e.g. `packages/design-system/`).
- [ ] `pnpm add` les peerDeps.
- [ ] Importer `tokens.css` dans `app/layout.tsx` (web) et équivalent RN.
- [ ] Étendre `tailwind.config.js` avec le preset.
- [ ] Charger les Google Fonts (DM Serif Display, DM Serif Text, Manrope, JetBrains Mono).

### Jours 2–3 — Tokens
- [ ] Find/replace toutes les couleurs hardcodées → variables CSS.
- [ ] Find/replace toutes les `font-family` → `var(--tg-font-*)`.
- [ ] Remplacer les rayons/spacings non-grid 4pt par les valeurs DS.
- [ ] Audit visuel : aucune couleur hors palette ne doit rester.

### Jours 4–6 — Composants
- [ ] Remplacer tous les boutons custom par `<Button>`.
- [ ] Remplacer toutes les cards par `<Card>`.
- [ ] Remplacer tags / filtres par `<Chip>`.
- [ ] Implémenter `<Player>` (mini + full) — c'est l'écran le plus important.
- [ ] Remplacer logo / app icon par `<Pin>` / `<PinNegatif>`.

### Jour 7 — Copy + iconographie
- [ ] Mettre à jour tous les CTAs avec le copy de la section 7.
- [ ] Remplacer le set d'icônes existant par le nouveau (23 icônes).

### Jour 8 — QA + audit
- [ ] Test sur device réel iOS + Android.
- [ ] Lighthouse + axe (accessibilité — contraste ratios DS validés WCAG AA).
- [ ] Audit final : aucune valeur hors DS.

---

## 10 · Structure du package `@tourguide/design-system`

```
handoff/
├── package.json          @tourguide/design-system v1.0.0
├── README.md             Doc + table de migration
├── index.ts              Point d'entrée (export *)
├── tokens.css            CSS variables (light + dark mode)
├── tokens.ts             Tokens TS typés
├── tailwind.preset.js    Preset à étendre dans tailwind.config
└── components/
    ├── Button.tsx        primary | accent | ghost × sm/md/lg
    ├── Card.tsx          + Header/Body/Footer
    ├── Chip.tsx          5 couleurs × 2 états
    ├── Pin.tsx           Pin + PinNegatif
    ├── Typography.tsx    Eyebrow, PullQuote, NumberMark
    └── Player.tsx        mini | full
```

**Pour mobile (RN)** : créer `handoff/components-rn/` en miroir, en remplaçant `<div>` par `<View>`, styles inline par `StyleSheet`, SVG par `react-native-svg`. Mêmes noms, mêmes props.

---

## 11 · Assets à générer (checklist livraison)

### Polices (auto-loadées via Google Fonts)
- [x] DM Serif Display 400
- [x] DM Serif Text 400 italic
- [x] Manrope 400, 500, 600, 700
- [x] JetBrains Mono 400, 700

### App icon (à exporter depuis `<PinNegatif>`)
- [ ] iOS : 1024, 180, 152, 120, 87, 80, 60, 58, 40
- [ ] Android : 512, 192, 144, 96, 72, 48, 36
- [ ] Adaptive icon Android : foreground SVG + background color
- [ ] App Store screenshot : avec icône + slogan

### Favicon
- [ ] favicon.svg, favicon-32.png, favicon-192.png, favicon-512.png
- [ ] apple-touch-icon-180.png
- [ ] manifest.json avec icons

### Splash
- [ ] iOS : LaunchScreen.storyboard avec PinNegatif + "TourGuide" + slogan
- [ ] Android : Splash API (Android 12+) — drawable `splash_screen.xml`

### OG images
- [ ] og-default.png 1200×630 — fond grenadine + pin paper + "TourGuide"
- [ ] og-tour.png template — pour partage social d'un tour

---

## 12 · Règles non-négociables

1. **Ne jamais hardcoder une valeur** qui pourrait venir du DS.
2. **Pas de nouvelle nuance** — grenadine est UNE couleur, pas une famille.
3. **Pas de fallback caché** type `color: red`, `font-family: Arial`.
4. **Major = breaking** — renommer une prop = bump major.
5. **Une seule source** : tokens dans `tokens.ts`. Pas de duplication.
6. **Composer, pas forker** — besoin d'un nouveau composant ? Composez avec les briques DS.

---

## 13 · Ressources

| Document | Localisation |
|---|---|
| Charte visuelle complète (interactive) | `TourGuide Charte complete.html` |
| Package design system (sources) | `handoff/` |
| Tokens CSS | `handoff/tokens.css` |
| Tokens TS | `handoff/tokens.ts` |
| Tailwind preset | `handoff/tailwind.preset.js` |
| Composants React | `handoff/components/` |
| README package | `handoff/README.md` |

---

## 14 · Questions ouvertes pour Claude Code

Avant de démarrer, valider avec l'équipe produit :

1. **Onboarding 3/3** : à quel moment demande-t-on la permission GPS ? Au lancement ou à la première carte ?
2. **Paywall** : freemium (3 tours gratuits) ou trial 7 jours ?
3. **Recap fin de tour** : afficher des stats (km marchés, temps écouté) ou juste une page de remerciement ?
4. **Partage social** : OG image générée serveur-side ou template PNG fixe ?
5. **Mode dark** : prio P1 ou P2 ? (les tokens sont prêts, mais aucun écran n'a été designé en dark)

---

**Bon build.** — *L'équipe Design TourGuide*
