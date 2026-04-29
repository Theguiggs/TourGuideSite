# TODO — favicon-32.png

Ce fichier est un **placeholder**. Le binaire `favicon-32.png` réel sera produit par le pipeline d'export Story 3.1.

## Procédure de génération

```bash
cd design-system
npm run tg:export-icons -- --variant light --output-dir ../assets/icons
```

Puis copier `assets/icons/favicon-32.png` vers `TourGuideWeb/public/favicon-32.png`.

## Spec attendue

- Taille : 32×32 px
- Format : PNG opaque (pas d'alpha)
- Couleurs : grenadine `#C1262A` + paper `#F4ECDD`

## Story de référence

`_bmad-output/stories/3-1-export-pipeline.md` (sizes.json `favicon: [32, 192, 512]`)
`_bmad-output/stories/3-4-favicon-manifest.md` (AC 1, T1)

Une fois le binaire copié, **supprimer ce fichier `.TODO.md`**.
