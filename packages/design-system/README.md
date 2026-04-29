# @tourguide/design-system

Le design system officiel de **TourGuide**. Tokens, composants React, Tailwind preset.

Toutes les valeurs (couleurs, typo, espacements, rayons, ombres) viennent d'une source unique. Si vous avez besoin d'une couleur ou d'une taille qui n'est pas dans le DS, parlez-en à l'équipe design avant d'inventer une variante.

---

## Installation

Le package vit à la racine du repo TourGuide (`C:\Projects\Bmad\design-system\`) et est consommé par les apps via `file:../design-system` (subtree, pas de monorepo Turborepo, pas de registre npm privé).

```jsonc
// TourGuideWeb/package.json — ou TourGuideApp/package.json
{
  "dependencies": {
    "@tourguide/design-system": "file:../design-system"
  }
}
```

```bash
# Bootstrap (une fois, ou après pull qui change les deps du DS) :
cd design-system && npm install   # produit node_modules avec @babel/runtime + types React
cd ../TourGuideWeb && npm install  # crée le symlink (Windows) vers ../design-system
cd ../TourGuideApp && npm install
```

---

## Sub-exports

Le package expose **6 entry points** distincts. Choisir selon le contexte d'exécution :

| Entry | Contenu | Web | RN | Usage |
|---|---|:-:|:-:|---|
| `@tourguide/design-system` | tokens TS uniquement | ✅ | ✅ | Import par défaut, sûr partout |
| `@tourguide/design-system/tokens` | tokens TS uniquement | ✅ | ✅ | Alias explicite tokens-only |
| `@tourguide/design-system/web` | composants React DOM (`<button>`, `<svg>`…) + tokens | ✅ | ❌ | Apps Web Next.js, Vite, etc. |
| `@tourguide/design-system/rn` | (Story 2.x) composants RN miroir (Pressable, View) + tokens | ❌ | ✅ | Apps React Native |
| `@tourguide/design-system/css` | variables CSS | ✅ | — | `import` global Web |
| `@tourguide/design-system/tailwind` | preset Tailwind | ✅ | — | `tailwind.config.js` |

> ⚠️ **Web vs RN** : les composants `/web` utilisent du HTML brut (`<button>`, `<div>`, `<svg>`) qui n'existe **pas** en React Native. Ne **jamais** faire `import { Button } from '@tourguide/design-system'` ou `'@tourguide/design-system/web'` dans une app RN — ça compile chez Jest puis crashe Hermes au runtime. Importer **uniquement** depuis `/tokens` côté RN, en attendant les composants miroir Story 2.x sous `/rn`.

---

## Consumer setup

### Source-only package — bundler required

Ce package **livre du TS source** (pas de build step, `exports` map pointe vers `.ts`). Les consumers **doivent** utiliser un bundler capable de transpiler TypeScript+JSX :

- **Next.js** : ajouter `@tourguide/design-system` dans `transpilePackages` (voir snippet TourGuideWeb plus bas).
- **Metro / React Native** : whitelister `@tourguide` dans `transformIgnorePatterns` du Babel/Jest config (voir snippet TourGuideApp plus bas).
- **Node.js sans transpilation** : **non supporté** — un `require('@tourguide/design-system')` direct depuis Node échouera car les fichiers `.ts` ne sont pas transpilés.

Une éventuelle étape de build (tsc → `dist/`) pourra être ajoutée plus tard si on publie sur un registre npm. Tant que la consommation reste `file:..` interne au monorepo, le source-only suffit.

### TourGuideWeb (Next.js 16)

```ts
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@tourguide/design-system'],
};

export default nextConfig;
```

```tsx
// app/page.tsx — imports
import { tg } from '@tourguide/design-system';                  // tokens (sûr)
import { Button, Card, Pin } from '@tourguide/design-system/web'; // composants Web
```

### TourGuideApp (React Native 0.83 + Hermes)

```js
// jest.config.js — whitelist du package dans transformIgnorePatterns
module.exports = {
  // ...
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|react-native-.*|@react-native-.*|react-native-reanimated|@gorhom|aws-amplify|@aws-amplify|@tourguide)/)',
  ],
};
```

```ts
// src/screens/SomeScreen.tsx — imports
import { tg } from '@tourguide/design-system/tokens';
// ⚠️ NE PAS importer depuis '@tourguide/design-system/web' — Story 2.x livrera '/rn'
```

### Métro / Hermes bundler

Le package suit le format CommonJS-compatible (TS source, transpilé à la volée par le bundler). Aucun build step explicite côté DS. `@babel/runtime` est en `dependencies` pour permettre à Jest et Metro de transformer les composants sans erreur `Cannot find module '@babel/runtime/helpers/...'`.

---

## Usage

### 1. CSS variables (apps Web vanilla, Vue, Next.js sans Tailwind)

```ts
// _app.tsx ou layout.tsx
import '@tourguide/design-system/css';
```

```css
.my-cta {
  background: var(--tg-color-grenadine);
  color: var(--tg-color-paper);
  border-radius: var(--tg-radius-pill);
  padding: var(--tg-space-3) var(--tg-space-5);
  font-family: var(--tg-font-sans);
  transition: transform var(--tg-duration-fast) var(--tg-ease-out);
}
```

### 2. Tailwind preset (TourGuideWeb)

```js
// tailwind.config.js
import tgPreset from '@tourguide/design-system/tailwind';

export default {
  presets: [tgPreset],
  content: ['./src/**/*.{ts,tsx}'],
};
```

```tsx
<button className="bg-grenadine text-paper rounded-pill px-5 py-3 font-semibold shadow-accent">
  Écouter
</button>
```

### 3. Composants React Web (TourGuideWeb uniquement)

> ⚠️ Composants Web non utilisables en RN. Voir Story 2.x pour composants RN miroir sous `@tourguide/design-system/rn`.

```tsx
import { Button, Card, Chip, Pin, Player, Eyebrow, NumberMark } from '@tourguide/design-system/web';

export function TourCard({ tour }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <NumberMark n={tour.index} />
        <div style={{ flex: 1 }}>
          <Eyebrow>{tour.city} · {tour.duration} min</Eyebrow>
          <h3 className="tg-display" style={{ fontSize: 22, margin: '4px 0 0' }}>
            {tour.title}
          </h3>
        </div>
        <Pin color="var(--tg-color-grenadine)" size={28} />
      </div>
    </Card>
  );
}
```

### 4. Tokens TS (cas avancés, calculs dynamiques)

```ts
import { tg } from '@tourguide/design-system';

const accent = tg.colors.grenadine;          // '#C1262A'
const radius = tg.radius.lg;                 // 18
const easing = tg.ease.out;                  // 'cubic-bezier(...)'
```

---

## Composants disponibles

| Composant       | Variantes                                  | Usage principal                          |
|-----------------|--------------------------------------------|------------------------------------------|
| `<Button>`      | `primary` · `accent` · `ghost` × `sm/md/lg`| Toute action — éviter `<button>` brut    |
| `<Card>`        | `flat` · `sm` · `md` · `lg`                | Surfaces de contenu                      |
| `<Chip>`        | `default` · `grenadine` · `ocre` · `mer` · `olive` | Tags, filtres, catégories       |
| `<Pin>`         | —                                          | Marqueur de carte, icône                 |
| `<PinNegatif>`  | —                                          | App icon, favicon, splash                |
| `<Player>`      | `mini` · `full`                            | Lecteur audio (l'écran le plus important)|
| `<Eyebrow>`     | —                                          | Surtitre éditorial avant un H            |
| `<PullQuote>`   | `sm` · `md` · `lg`                         | Citation italique                        |
| `<NumberMark>`  | —                                          | Numérotation éditoriale (01, 02…)        |

### Iconographie (Story 3.6)

Set de **23 icônes** SVG (viewBox 24×24, stroke 1.5, `currentColor`) — tree-shakable via sub-export dédié. Sources Lucide (MIT) + 4 hand-authored (`SkipForward15`, `SkipBack15`, `Downloaded`, `Gps`).

```tsx
// Web (Next.js / Vite / etc.)
import { IconHome, IconPlay, IconChevron } from '@tourguide/design-system/icons';

<IconHome size={24} aria-label="Accueil" />
<IconPlay color="var(--tg-color-grenadine)" size={32} />

// React Native
import { IconHome, IconPlay } from '@tourguide/design-system/icons-rn';

<IconHome size={24} color={tg.colors.ink} accessibilityLabel="Accueil" />
```

| Groupe          | Icônes                                                                        |
|-----------------|-------------------------------------------------------------------------------|
| **Navigation (7)** | Home · Catalog · Profile · Search · Settings · Back · Close                |
| **Lecture (6)**    | Play · Pause · SkipForward15 · SkipBack15 · Download · Downloaded          |
| **État (6)**       | Check · Lock · Alert · Info · Gps · Offline                                |
| **UI (5)**         | Heart · Share · More · Chevron · Plus                                      |

> ⚠️ Les icônes **n'incluent pas** de hit target (44 pt). Wrap dans `<IconButton>` (Story 3.7) ou un `<button>` / `<Pressable>` avec `minHeight: 44`. Min usage 16 px, optimal 20-24 px.

> ⚠️ RN : `currentColor` n'est pas natif `react-native-svg`. Si `color` n'est pas passé, fallback sur `tgColors.ink` (#102A43). Passer explicitement `color={tg.colors.grenadine}` etc. selon contexte.

---

## Règles d'usage

### Couleurs
- **Grenadine** = action principale et marque. **N'inventez pas une nuance** : utilisez `grenadine` ou `grenadineSoft`.
- Les couleurs ville (ocre, mer, olive) **n'apparaissent jamais à plus de deux** sur un même écran.
- Texte en `ink` ou `ink60` ; jamais d'autre noir.

### Typographie
- **DM Serif Display** uniquement pour les titres ≥ 22 px.
- **DM Serif Text italique** pour citations et accroches éditoriales.
- **Manrope** pour tout le reste (UI, body, meta).
- **Eyebrow** : 11 px, MAJUSCULES, letter-spacing 0.18em, 700 — toujours au-dessus des H1/H2.

### Spacing
- Grille 4 pt : utilisez les tokens `space-1` à `space-20`. Ne tapez pas `padding: 13px`.
- Spacing entre sections de page : `space-12` (48 px) ou `space-16` (64 px).

### Rayons
- Boutons et chips : `pill`.
- Cartes et inputs : `md` (12 px).
- Surfaces hero, modales : `lg` (18 px) ou `xl` (28 px).
- **Pas d'autres valeurs.**

### Ombres
- Standard : `sm` pour les cards reposant sur paper, `md` pour les cards qui flottent, `lg` pour modales.
- Le bouton accent porte naturellement `shadow-accent` (lueur grenadine).

---

## Migration depuis l'ancien code

| Ancien                        | Nouveau                              |
|-------------------------------|--------------------------------------|
| `#FF5722`, `#E94B40`, `#D43A38` (variantes "rouge") | `tg.colors.grenadine` (#C1262A) |
| `Inter`, `Helvetica Neue`     | `tg.fonts.sans` (Manrope)            |
| `Playfair Display`            | `tg.fonts.display` (DM Serif Display)|
| `border-radius: 4px / 8px`    | `tg.radius.sm` / `tg.radius.md`      |
| Bouton custom inline-styled   | `<Button variant="accent">`          |

Audit : tournez `pnpm dlx @tourguide/audit src/` (à venir) pour repérer les divergences.

---

## Versioning

- **Major** = breaking change (rename de prop, suppression de variante).
- **Minor** = nouvelle variante, nouveau composant.
- **Patch** = bugfix, ajustement visuel mineur.

Toute modification de tokens passe par PR review équipe design + équipe core.

---

## Resources

- 🎨 **Charte visuelle complète** : `TourGuide Charte complete.html` (canvas exploratoire)
- 📐 **Tokens canvas** : section 01
- 🧩 **Composants canvas** : section 02
- 📱 **App icon** : section 07

---

## Metro / React Native — config requise (Story 1.1 T7 — découvert sur device)

**Sans cette config, Metro échoue silencieusement à résoudre le package via `file:..`.**

Dans `TourGuideApp/metro.config.js` :

```js
const config = {
  resolver: {
    // ...autres options
    unstable_enableSymlinks: true,        // suit les symlinks file:..
    unstable_enablePackageExports: true,  // active sub-exports /tokens, /web, /rn
  },
  watchFolders: [path.resolve(__dirname, '..', 'design-system')],
};
```

**Pourquoi nécessaire :**
- `npm install @tourguide/design-system file:../design-system` crée un **symlink** dans `node_modules/`. Metro RN ignore les symlinks par défaut.
- Le `package.json` exports map (`./tokens`, `./web`, `./rn`) requiert le flag `unstable_enablePackageExports`.
- `watchFolders` fait connaître à Metro le dossier source pour la résolution + fast refresh.

Sans ces 3 lignes, l'erreur observée au bundle Metro : `Unable to resolve module @tourguide/design-system from .../*.tsx`.

## Storybook playground (Story 2.7)

Le DS embarque un **Storybook 8.x** (Vite builder) hébergé directement dans le package — autonome, déployable indépendamment, pas de pollution `TourGuideWeb`.

### Activation (à faire une fois)

Les devDependencies Storybook sont déclarées dans `design-system/package.json` mais **ne sont pas installées par défaut** (~200 MB). Pour activer le playground :

```bash
cd design-system
npm install              # installe Storybook + Vite + addons (premier run uniquement)
npm run storybook        # http://localhost:6006
npm run build-storybook  # produit storybook-static/ déployable
```

### Contenu

| Section sidebar | Contenu | Fichier source |
|---|---|---|
| **Foundations / Tokens** | Palette couleurs (4 surfaces, ink ×5, line, 4 villes ×soft, 4 états), échelle typo (11 niveaux), spacings (11 valeurs grille 4pt), radius (5), shadows (5) | `Tokens.stories.tsx` |
| **Composants / Button** | 9 variants (3 variantes × 3 tailles) + disabled + iconLeft | `components/Button.stories.tsx` |
| **Composants / Card** | 4 niveaux d'ombre (flat/sm/md/lg) + compound (Header/Body/Footer) | `components/Card.stories.tsx` |
| **Composants / Chip** | 5 couleurs × 2 états (default + active) + iconLeft | `components/Chip.stories.tsx` |
| **Pin** | 4 couleurs villes + hex littéral + label + sizes | `components/Pin.stories.tsx` |
| **PinNegatif** | 4 fonds × 3 modes rounded (false/true/0.5) + sizes app-icon | `components/PinNegatif.stories.tsx` |
| **Player** | mini default + full default + full custom map slot | `components/Player.stories.tsx` |
| **Eyebrow** | 3 couleurs (ink60 default, grenadine, mer) au-dessus d'un h2 | `components/Eyebrow.stories.tsx` |
| **PullQuote** | 3 tailles (sm/md/lg = h6/h5/h4) | `components/PullQuote.stories.tsx` |
| **NumberMark** | série 01-05 + 3 tailles + couleurs ville | `components/NumberMark.stories.tsx` |

### Convention

- **Format** : CSF 3 (`*.stories.tsx`), co-localisé avec le composant sous `components/`.
- **Types** : tant que Storybook n'est pas installé, `Meta`/`StoryObj` sont fallback locaux dans `.storybook/types.ts`. Une fois `npm install` lancé, il est possible de migrer ces imports vers `@storybook/react` (API identique).
- **Couleur de fond default** : `tg.colors.paper` via `.storybook/preview.ts` — backgrounds preset pour basculer.

### Ajouter un variant à un composant

1. Ouvrir le `*.stories.tsx` correspondant.
2. Ajouter une nouvelle export const : `export const MonVariant: Story = { name: '...', render: () => <Component /> };`
3. Optionnel : description FR via `parameters.docs.description.story`.

### RN Storybook (Phase B post-V1.0)

Le placeholder `rn/index.ts` est vide. Les composants miroir RN seront ajoutés dans une story dédiée (Story 2.x), puis **un Storybook RN on-device** sera scaffoldé en Phase B via `@storybook/react-native`. Les stories Web actuelles ne sont **pas** réutilisables telles quelles — elles utilisent `<div>`, `<svg>`, etc.

### Déploiement statique (best-effort)

- **Vercel** : `vercel deploy --prod design-system/storybook-static/` — TODO, dépend de la création d'un projet Vercel dédié.
- **GitHub Pages** : workflow `pages.yml` à créer si CI Actions activée — TODO.
- Pour V1.0, le playground tourne en local (`npm run storybook`) — déploiement reporté Phase B.

---

## Notes & known limitations

- **`@babel/runtime` duplication** : `@babel/runtime` is declared as dep for Jest support in TourGuideApp (POC Issue 4); RN already ships its own copy via react-native — duplicate resolution observed in node_modules but harmless. ✅ Confirmed harmless via Story 1.1 T7 device validation (no runtime issue).

— *L'équipe Design TourGuide*
