# TODO — favicon-512.png

Ce fichier est un **placeholder**. Le binaire `favicon-512.png` réel sera produit par le pipeline d'export Story 3.1.

## Procédure de génération

```bash
cd design-system
npm run tg:export-icons -- --variant light --output-dir ../assets/icons
```

Puis copier `assets/icons/favicon-512.png` vers `TourGuideWeb/public/favicon-512.png`.

## Spec attendue

- Taille : 512×512 px
- Format : PNG opaque
- Usage : icône PWA Android haute résolution + maskable adaptive icon
- Couleurs : grenadine `#C1262A` + paper `#F4ECDD`
- **Safe zone** : 80% central pour le crop maskable Android (`<PinNegatif>` est déjà bien centré par construction Story 2.4)

## Story de référence

`_bmad-output/stories/3-1-export-pipeline.md` (sizes.json `pwa: [192, 512]`)
`_bmad-output/stories/3-4-favicon-manifest.md` (AC 1, AC 4, T1)

Une fois le binaire copié, **supprimer ce fichier `.TODO.md`**.
