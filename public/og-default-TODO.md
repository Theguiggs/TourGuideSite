# TODO — `og-default.png` (Story 3.1 dependency)

**Status** : pending — fichier `public/og-default.png` à générer.

## Contexte

Story 3.5 (OG images hybrides) configure les metadata `openGraph.images` et `twitter.images`
dans `src/app/layout.tsx` pour pointer vers `/og-default.png` (1200×630, fond grenadine,
PinNegatif paper centré, slogan « Le monde a une voix. »).

Le fichier image lui-même est produit par le pipeline d'export de la **Story 3.1**
(`pnpm tg:export-icons` ou variante `pnpm tg:export-og` selon implémentation finale).

## Spécifications cibles

- **Dimensions** : 1200 × 630 px (ratio Twitter Card / Open Graph standard)
- **Fond** : grenadine `#C1262A` (token `tg.colors.grenadine`)
- **Composition** :
  - `<PinNegatif>` paper centré, ~280×280 px
  - Sous le pin : `TourGuide` en DM Serif Display 96px, color paper
  - Sous le wordmark : `Le monde a une voix.` en DM Serif Text italique 36px, color paper
- **Poids cible** : < 200 KB (PNG optimisé via `sharp` ou `imagemin`)

## Action (Guillaume)

1. Vérifier que Story 3.1 est `done`.
2. Lancer le script d'export OG (commande exacte fournie par Story 3.1).
3. Output attendu : `C:\Projects\Bmad\TourGuideWeb\public\og-default.png`.
4. Supprimer ce fichier `og-default-TODO.md` une fois `og-default.png` présent.
5. Tester via Twitter Card Validator + LinkedIn Post Inspector + FB Sharing Debugger
   sur l'URL de prod (preview Vercel ou `tourguide.app`).

## Fallback temporaire

Tant que `og-default.png` n'existe pas, les crawlers sociaux qui hit la racine `/`
récupèrent un 404 sur `og:image`. Cela ne casse pas le rendu HTML mais dégrade
la preview de partage (fallback texte uniquement). Pas bloquant pour le déploiement
de Story 3.5 (les routes Edge dynamiques `/og/tour/[city]/[tourSlug]` fonctionnent
indépendamment).
