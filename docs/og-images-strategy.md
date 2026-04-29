# OG Images — Stratégie hybride (Story 3.5)

**Phase 0 décision Q4 = D (hybride)**

## TL;DR

| Pages | Stratégie | Source |
|---|---|---|
| `/`, `/pricing`, `/about`, `/journal` (index) | Static | `/og-default.png` 1200×630 (Story 3.1 pipeline) |
| `/catalogue/[city]/[tourSlug]` | Edge dynamique | `/og/tour/[city]/[tourSlug]` (Satori) |
| `/journal/[slug]` (Phase B) | Edge dynamique | `/og/journal/[slug]` (stub Phase A → réel Phase B / Story 6.6) |

## Pourquoi hybride

- **Static** pour les pages fixes : 1 fichier servi en CDN, performance maximale, identité de marque cohérente, coût zéro.
- **Dynamique** pour les pages tour : preview riche (titre du tour, ville, teaser éditorial) qui multiplie le CTR partage par 3-5×. Coût quasi-nul via Vercel Edge free tier (100k invocations/mois).

## Routes Edge — implémentation

### `/og/tour/[city]/[tourSlug]`

Fichier : `src/app/og/tour/[city]/[tourSlug]/route.tsx`.

- `runtime = 'edge'` (Vercel Edge runtime, ~50ms cold start)
- Composition JSX inline-style (Satori — pas de Tailwind)
- Color-block ville : `grenadine` (Aix), `mer` (Marseille), `ocre` (Avignon/Arles), `olive` (Provence/Luberon). Mapping géré côté `pickAccent(citySlug)` dans la route — TODO : extraire dans `src/lib/og/city-colors.ts`.
- Eyebrow : `${VILLE} · ${DURÉE} MIN` (Manrope Bold 18px tracking 0.18em)
- Titre tour : DM Serif Display 64px (fallback `serif` system tant que TTF non bundled)
- Pullquote teaser : DM Serif Text Italic 28px
- Pin signature SVG inline bottom-left
- `Cache-Control: public, max-age=31536000, immutable` (1 an)
- Fallback : `try/catch` global → redirect 302 vers `/og-default.png` si Satori crash ou tour absent.

### `/og/journal/[slug]`

Fichier : `src/app/og/journal/[slug]/route.tsx`.

Stub Phase A — fond paper, eyebrow `Journal TourGuide`, titre humanisé depuis le slug, excerpt placeholder. **Story 6.6 (Phase B)** raccorde la vraie API journal via `getArticleBySlug(slug)`.

## Limitations Satori (à respecter impérativement)

1. **Pas de classes Tailwind** — uniquement `style={{...}}` inline.
2. **CSS subset** : flexbox OK, grid limité, pas d'animations, pas de `::before`/`::after`.
3. **Polices** : doivent être chargées explicitement en ArrayBuffer (`fonts: [{ name, data, style, weight }]`). `font-family: 'DM Serif Display'` ne marche pas par magie.
4. **SVG inline** : OK pour formes simples (Pin). Éviter `<use>` ou références externes.
5. **Pas de fetch externe images** sans CORS — préférer images bundlées ou `data:image/png;base64,...`.
6. **Truncation** : pas de truncation auto sur texte long → gérer côté code (`slice` + ellipsis).

## TODO V1.0 — Polices DM Serif Display + Manrope

État actuel : fallback `font-family: serif/sans-serif` system. À faire :

1. Télécharger TTF depuis Google Fonts : `DMSerifDisplay-Regular.ttf`, `DMSerifText-Italic.ttf`, `Manrope-Bold.ttf`.
2. Placer dans `src/assets/fonts/` (PAS `public/fonts/` — les routes Edge utilisent `import.meta.url` qui résout depuis le bundle).
3. Charger en ArrayBuffer en haut du module Edge :
   ```ts
   const dmSerifDisplay = await fetch(
     new URL('../../../../../../assets/fonts/DMSerifDisplay-Regular.ttf', import.meta.url)
   ).then((r) => r.arrayBuffer());
   ```
4. Passer dans `ImageResponse({ fonts: [{ name: 'DM Serif Display', data: dmSerifDisplay, style: 'normal', weight: 400 }, ...] })`.
5. Bundle total ~1.2 MB acceptable (chargé une fois par cold start, pas par requête).

## TODO V1.0 — Fetch tour data réel

État actuel : stub `humanize(tourSlug)` pour titre + ville. À remplacer par :

```ts
import { getTourBySlug } from '@/lib/api/tours-server';
const tour = await getTourBySlug(citySlug, tourSlug);
if (!tour) return Response.redirect(new URL('/og-default.png', '...'), 302);
```

**Risque** : le client AppSync server lit des cookies → potentiellement incompatible avec Edge runtime. À tester. Mitigation : créer un endpoint REST cache-friendly `/api/og-tour/[city]/[slug]` qui retourne JSON minimal `{title, city, duration, shortDescription}` consommable depuis Edge.

## Tests locaux

```bash
cd TourGuideWeb
npm run dev
# Ouvrir dans le navigateur :
open http://localhost:3000/og/tour/aix/aix-cezanne
open http://localhost:3000/og/journal/portrait-marie-d
```

Les routes Edge servent directement le PNG dans le navigateur (Content-Type: image/png).

## Validateurs sociaux (manuel — Guillaume)

Une fois déployé sur preview Vercel :

- **Twitter Card Validator** : https://cards-dev.twitter.com/validator
- **LinkedIn Post Inspector** : https://www.linkedin.com/post-inspector/
- **Facebook Sharing Debugger** : https://developers.facebook.com/tools/debug/
- **Slack Unfurl** : coller l'URL dans un workspace test

URLs à tester :
- `https://<preview>.vercel.app/` (static `og-default.png`)
- `https://<preview>.vercel.app/catalogue/aix/aix-cezanne` (dynamique)

Note : les validateurs caching agressivement — utiliser le bouton « Refresh / Re-scrape » de chaque outil après modification.

Screenshots → `docs/story-3-5-validators.md` (à créer).

## Performance

- **Cold start Edge** : ~50ms (Vercel infra) + ~30ms (Satori render) + ~50ms (font load première fois) = ~130ms typique
- **Warm** (cache Next + Edge) : ~10-30ms
- **Cible AC 7** : < 500ms cold, < 100ms warm — large marge

## Coût Vercel

- Free tier : 100k Edge invocations/mois → couvre largement V1.0.
- Tipping point ~1M reqs/mois = passage plan paid (~$20/mois). À surveiller via Vercel Analytics post-launch.

## Cohérence cross-Story

- **Story 3.1** (pipeline export PinNegatif) → produit `public/og-default.png` (état actuel : pending, voir `public/og-default-TODO.md`).
- **Story 6.4** (Phase B — partage social mobile) → le bouton mobile partage `tourguide.app/catalogue/{city}/{slug}?from=share`. Le crawler hit la route Edge → preview riche.
- **Story 6.6** (Phase B — OG articles) → consomme `/og/journal/[slug]` avec vraie API journal.
- **Story 1.3** : `next/font` Google fonts pour le rendu HTML — DIFFÉRENT du runtime Edge OG qui charge les TTF en ArrayBuffer (Satori ne réutilise pas next/font).
