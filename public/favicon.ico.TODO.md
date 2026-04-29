# TODO — favicon.ico (legacy fallback)

Ce fichier est un **placeholder**. Le binaire `favicon.ico` réel sera généré post-Story 3.1.

## Procédure de génération

1. D'abord exécuter le pipeline Story 3.1 pour produire `favicon-32.png` :
   ```bash
   cd design-system
   npm run tg:export-icons -- --variant light --output-dir ../assets/icons
   ```

2. Convertir `favicon-32.png` → `favicon.ico` :
   ```bash
   npx png-to-ico assets/icons/favicon-32.png > TourGuideWeb/public/favicon.ico
   ```
   Alternative : utiliser un convertisseur en ligne (https://favicon.io/favicon-converter/).

## Spec attendue

- Format : ICO multi-résolution (16×16 + 32×32)
- Usage : fallback legacy IE/anciens navigateurs + safety net
- Couleurs : grenadine `#C1262A` + paper `#F4ECDD`

## Note importante

`TourGuideWeb/src/app/favicon.ico` (Next.js auto-detect) a été **supprimé** dans Story 3.4 pour éviter le conflit avec `public/favicon.ico` déclaré explicitement via `metadata.icons` dans `layout.tsx`.

## Story de référence

`_bmad-output/stories/3-4-favicon-manifest.md` (AC 3, AC 7, T2)

Une fois le binaire copié, **supprimer ce fichier `.TODO.md`**.
