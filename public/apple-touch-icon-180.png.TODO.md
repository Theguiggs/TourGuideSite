# TODO — apple-touch-icon-180.png

Ce fichier est un **placeholder**. Le binaire `apple-touch-icon-180.png` réel sera produit par le pipeline d'export Story 3.1.

## Procédure de génération

```bash
cd design-system
npm run tg:export-icons -- --variant light --output-dir ../assets/icons
```

Puis copier `assets/icons/apple-touch-icon-180.png` vers `TourGuideWeb/public/apple-touch-icon-180.png`.

## Spec attendue

- Taille : 180×180 px
- Format : PNG **opaque** (pas de canal alpha — iOS rendra un fond noir si transparent)
- Usage : "Add to Home Screen" iOS Safari
- Couleurs : fond plein grenadine `#C1262A` + PinNegatif paper `#F4ECDD` au centre
- iOS applique automatiquement le rounding et le drop shadow

## Story de référence

`_bmad-output/stories/3-1-export-pipeline.md` (sizes.json iOS `[..., 180, ...]`)
`_bmad-output/stories/3-4-favicon-manifest.md` (AC 1, T1 — Apple touch icon — pas de transparence)

Une fois le binaire copié, **supprimer ce fichier `.TODO.md`**.
