# `tg:export-icons` — Pipeline d'export `<PinNegatif>`

> Story 3.1 — Génère toutes les tailles iOS / Android / favicon / PWA / OG d'app icon TourGuide à partir du composant React `<PinNegatif>` (single source of truth visuelle).

## TL;DR

```bash
cd design-system
npm install                                          # une fois — installe @resvg/resvg-js + tsx
npm run tg:export-icons -- --variant light           # génère light dans ../assets/icons/
npm run tg:export-icons -- --variant dark            # idem dark
npm run tg:export-icons -- --variant tinted          # idem tinted (alpha PNG, iOS/Android only)
```

Le run complet (3 variants) produit ~22 PNG par variant côté light + ~16 (iOS+Android only) côté dark/tinted + 1 SVG source = **~50 fichiers en < 30 s**.

## Tech : pourquoi `@resvg/resvg-js`

| Critère | `@resvg/resvg-js` (retenu) | Puppeteer (fallback) |
|---|---|---|
| Poids install | ~2 MB (binaire Rust prebuilt) | ~200 MB (Chromium) |
| Startup | < 100 ms (stateless) | ~2-3 s (browser launch) |
| Fonts custom | Limité (mais `<PinNegatif>` n'a pas de texte) | Full CSS |
| Disponibilité Windows | `@resvg/resvg-js-win32-x64-msvc` | `puppeteer-core` |

**Décision** : `@resvg/resvg-js` couvre 100 % du besoin Story 3.1 (PinNegatif = formes géométriques pures, pas de typographie). Le fallback Puppeteer reste documenté en cas d'échec d'install du binaire natif (CI Linux musl, Surface Pro X, etc.).

Activer le fallback (non implémenté en Story 3.1 — placeholder) :

```bash
EXPORT_USE_PUPPETEER=1 npm run tg:export-icons -- --variant light
```

## CLI

```
Usage : tsx scripts/export-pinnegatif.ts [options]

  --variant     light | dark | tinted        (default: light)
  --output-dir  <path>                       (default: <repo>/assets/icons)
  --config      <path-to-sizes.json>         (default: ./scripts/sizes.json)
```

Avec `npm run` il faut le `--` séparateur d'args :

```bash
npm run tg:export-icons -- --variant dark --output-dir ./tmp-icons
```

## Variants

| Variant | bg | fg | Bg PNG | Cible |
|---|---|---|---|---|
| `light` (default) | `#C1262A` (grenadine) | `#F4ECDD` (paper) | opaque RGB | iOS/Android/favicon/PWA/OG |
| `dark` | `#5B0F12` (grenadineDark — hex inline, token DS prévu Phase B) | `#F4ECDD` (paper) | opaque RGB | iOS/Android only |
| `tinted` | transparent (alpha 0) | `#9CA3AF` (gris neutre) | RGBA alpha | iOS/Android only |

`favicon`, `pwa` et `og` ne sont générés QUE pour `light` (décision Phase 0 Q5 — dark/tinted reportés Phase B).

## Output (matrice de fichiers)

Pour `--variant light` (avec `sizes.json` par défaut) :

| Plateforme | Tailles | Fichiers |
|---|---|---|
| iOS | 1024, 180, 152, 120, 87, 80, 60, 58, 40 | `app-icon-light.png` (1024 = pas de suffixe), `app-icon-light-180.png`, … |
| Android | 512, 192, 144, 96, 72, 48, 36 | `app-icon-light-android-512.png`, … |
| Favicon | 32, 192, 512 | `favicon-32.png`, `favicon-192.png`, `favicon-512.png` |
| PWA | 180 | `pwa-180.png` |
| OG | (vide par défaut, Story 3.5 wire) | `og-default.png` 1200×630 (si configuré) |
| SVG source | — | `app-icon.svg` (vectoriel, viewBox 0 0 220 220) |

Pour `--variant dark` ou `--variant tinted` : suffixe `-dark` / `-tinted` sur les fichiers iOS+Android, **pas** de favicon/PWA/OG, **pas** de SVG.

## Risques et limitations

- **`@resvg/resvg-js` binaire prebuilt manquant pour la plateforme** (Linux musl, Surface Pro X, …) → fallback Puppeteer (env `EXPORT_USE_PUPPETEER=1`). Implémentation Puppeteer déférée — Story 3.1 livre uniquement le placeholder explicite.
- **`borderRadius` iOS** : non appliqué dans le SVG natif (PinNegatif gère via wrapper `<div>` strippé pour l'export). Story 3.2 utilisera `Images.xcassets/AppIcon.appiconset/Contents.json` qui s'occupe du masque iOS au build.
- **`tinted` sur iOS Tinted appearance** : le PNG livré a `bg=transparent + fg=#9CA3AF`. Le rendu final dépend du masque système iOS (pas de preview parfait possible hors device). Story 3.2 validera sur device.
- **Fragilité du strip wrapper** : `renderSvg()` extrait `<svg>...</svg>` via regex sur le markup React. Si `<PinNegatif>` change son wrapper interne, adapter la regex (commenté `@fragility` dans le script).
- **OG image** : implémentation Story 3.1 = SVG composé `<rect bg> + Pin centré`. Pour des OG dynamiques avec texte (Story 3.5), passer à `@vercel/og` (Satori) côté route Edge — outil différent, contexte différent.
- **Idempotence** : 2 runs successifs produisent des bytes identiques (resvg est déterministe, pas de timestamp embarqué).
- **Budget perf** : run complet < 30 s sur machine dev moyenne. Si dépassement, paralléliser via `Promise.all` sur la boucle de tailles (resvg est CPU-bound mais multi-thread safe).

## Troubleshooting

### `Cannot find module '@resvg/resvg-js'`

Le binaire natif n'est pas installé. `cd design-system && npm install` doit le résoudre via `optionalDependencies` (`@resvg/resvg-js-win32-x64-msvc`, `@resvg/resvg-js-linux-x64-gnu`, etc.). Si l'install échoue : vérifier la plateforme (`node -p "process.platform + '-' + process.arch"`), puis fallback Puppeteer.

### `Unable to extract <svg> from PinNegatif markup`

Le composant `<PinNegatif>` a changé son rendu interne (wrapper `<div>` retiré ou modifié). Adapter le regex dans `renderSvg()` ou rouvrir Story 2.4.

### Tests Jest échouent avec `Cannot find module '@resvg/resvg-js'`

Le mock test utilise `jest.mock(..., {virtual: true})` — vérifier la présence du flag `virtual: true` dans la factory.

## Files (Story 3.1)

- `design-system/scripts/export-pinnegatif.ts` — script principal (~250 lignes)
- `design-system/scripts/sizes.json` — matrice de tailles par défaut
- `design-system/scripts/__tests__/export-pinnegatif.test.ts` — 24 tests Jest
- `design-system/EXPORT-PINNEGATIF.md` — ce fichier
- `design-system/package.json` — `+scripts.tg:export-icons`, `+devDeps {@resvg/resvg-js, tsx}`
- `design-system/jest.config.js` — `+testMatch scripts/__tests__/`
- `design-system/.gitignore` — `+assets/icons/`, `+*.png`

## Stories aval

- **3.2** (App icon iOS+Android) : consomme `app-icon-light*.png`, `app-icon-dark*.png`, `app-icon-tinted*.png`, `app-icon.svg`
- **3.3** (Splash) : consomme PNG haute résolution
- **3.4** (Favicon + apple-touch-icon + manifest.json) : consomme `favicon-*.png`, `pwa-*.png`, `app-icon.svg`
- **3.5** (OG static) : consomme `og-default.png` 1200×630
