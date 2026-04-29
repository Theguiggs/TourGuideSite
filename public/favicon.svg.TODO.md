# TODO — favicon.svg

Ce fichier est un **placeholder**. Le binaire `favicon.svg` réel sera produit par le pipeline d'export Story 3.1.

## Procédure de génération

```bash
cd design-system
npm run tg:export-icons -- --variant light --output-dir ../assets/icons
```

Puis copier `assets/icons/app-icon.svg` vers `TourGuideWeb/public/favicon.svg`.

## Spec attendue

- Format : SVG vectoriel
- Source : `<PinNegatif>` (Story 2.4) — grenadine `#C1262A` + paper `#F4ECDD`
- ViewBox : `0 0 220 220`
- Pas de wrapper `<div>` — uniquement `<svg>` avec `<rect>` + `<path>`

## Story de référence

`_bmad-output/stories/3-1-export-pipeline.md` (T4 — SVG source export)
`_bmad-output/stories/3-4-favicon-manifest.md` (AC 1, T1)

Une fois le binaire copié, **supprimer ce fichier `.TODO.md`**.
