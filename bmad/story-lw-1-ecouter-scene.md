# Story LW-1 : écouter une scène déverrouillée sur la page visite

Status: ready-for-review

<!-- Implémentée le 2026-09-12 d'après spec-lw-1-ecouter-scene.md (source de
     vérité), puis corrigée après revue le même jour. Les ACs et le contexte
     ci-dessous sont alignés sur ce qui est livré.
     Reste à faire à la main : `npm run dev` sur une visite gratuite. -->

<!-- Épopée LW (epic-lw-lecteur-web.md). Périmètre : TourGuideWeb. -->

## Story

En tant que **visiteur qui a acheté une visite (ou qui regarde l'aperçu gratuit)**,
je veux **écouter chaque étape directement sur la page de la visite**,
afin de **profiter de ce que j'ai payé sans installer l'appli**.

## Contexte vérifié (2026-09-12)

- La réponse de `getPublishedTourContent` porte déjà, par scène servie (achat actif, abonnement, guide propriétaire, ou aperçu gratuit), `audioUrl` (langue de base) et `translatedAudioUrls`, signés 15 min, plus `mediaExpiresAt`.
- `mapScenesToPois` (`src/lib/catalogue/scene-pois.ts`) tourne AUSSI au rendu serveur (`tours-server.ts`) : ce qu'elle projette finit dans le HTML. Elle ne projette donc qu'un booléen `hasAudio` (présence d'`audioKey`) — jamais l'URL signée. Les URLs sont demandées par le navigateur au premier clic (`useSceneAudio`), renouvelées à l'expiration, jamais persistées.
- CSP `media-src` : bucket déjà autorisé. Rien à toucher.
- Politique d'autoplay des navigateurs : un `<audio>` ne joue qu'après un geste utilisateur. Un **seul** élément `<audio>` partagé, débloqué au premier clic, permet ensuite de changer de `src` sans nouveau geste (indispensable pour LW-2).

## Acceptance Criteria

1. **La narration est annoncée, l'URL ne traverse pas** — `POI` porte `hasAudio?: boolean` ; `mapScenesToPois` le pose depuis `audioKey` et ne projette aucune URL signée (le HTML rendu serveur n'en porte pas) ; `maskLockedPois` le remet à `false` sur les étapes masquées. Les URLs sont obtenues côté navigateur au premier clic. Test unitaire.
2. **Un bouton « Écouter » par étape servie** — visible seulement quand la scène a une URL audio ; les étapes floutées n'en ont pas et n'en affichent pas. Icônes lucide `Play`/`Pause`, libellé i18n fr/en.
3. **Un seul lecteur à la fois** — cliquer sur une autre étape arrête la précédente. L'étape en cours est marquée (état visuel + `aria-current`).
4. **Barre de progression et durée** — position et durée lisibles, glissière pour se déplacer. Composant `ScenePlayer` dans `src/components/catalogue/scene-player/`, `<audio>` natif, aucune bibliothèque.
5. **Expiration gérée** — si `mediaExpiresAt` est dépassé au moment du clic, le lecteur redemande `getPublishedTourContent` avant de lancer, sans casser la liste affichée (`useSceneAudio`, source propre au lecteur, invalidée sur les mêmes signaux que `useServedContent` : visite, identité, achats). Une erreur média réseau / source (403 après expiration en cours de piste) déclenche la même redemande, une seule fois par tentative, puis un message ; un chargement interrompu (`MEDIA_ERR_ABORTED`) ne compte pas, un fichier illisible (`MEDIA_ERR_DECODE`) affiche directement.
6. **Message « Téléchargez Murmure »** — reformulé : l'écoute est ici, l'appli apporte le guidage GPS et le hors-ligne (`page.tsx:45` et `:52`).
7. **Épreuves** — tests du mappage, du composant (lecture, pause, exclusivité, expiration), `tsc` à 0, suite verte.

## Hors périmètre

- Enchaînement automatique, contrôles écran verrouillé (LW-2).
- Choix de langue (LW-3) : cette story joue `audioUrl`, la langue de base.

## File List

- `src/types/tour.ts` (M) — `POI.hasAudio?: boolean`
- `src/lib/catalogue/scene-pois.ts` (M) — `mapScenesToPois` pose `hasAudio`, jamais l'URL
- `src/lib/catalogue/__tests__/scene-pois.test.ts` (M) — présent/absent, aucune URL signée dans la projection
- `src/components/catalogue/scene-player/use-scene-audio.ts` (A) — source d'URLs, fraîcheur (`mediaExpiresAt` − 30 s ; absent → 10 min ; déjà passé → 60 s), une requête en vol, invalidation sur visite/identité/achats avec relance unique d'une réponse en vol, garde `shouldUseStubs()`
- `src/components/catalogue/scene-player/scene-player.tsx` (A) — `ScenePlayer` (unique `<audio>`, contexte, position/durée par abonnement hors contexte), `SceneListenControl` (Play/Pause, `aria-busy`, glissière `step=1` déplacée au relâchement, `m:ss`, messages « indisponible » / « touchez à nouveau »), `useScenePlayer` ; arrêt quand le contrôle courant disparaît ou au démontage
- `src/components/catalogue/scene-player/index.ts` (A) — barrel
- `src/components/catalogue/scene-player/__tests__/scene-player.test.tsx` (A) — lecture, chargement, pause/reprise (verrou), exclusivité (même nœud), dédoublonnage en vol, expiration (une redemande), repli court, erreur média réseau (une redemande puis message), ABORTED / DECODE, pause pendant relance, NotAllowedError / AbortError, réponse sans URL, échec requête, fin de piste, glissière, en, changement de visite, contrôle disparu
- `src/components/catalogue/scene-player/__tests__/use-scene-audio.test.tsx` (A) — `computeExpiresAt`, mode bouchons, génération périmée (relance unique), partage de requête
- `src/app/catalogue/[city]/[tourSlug]/itinerary-list.tsx` (M) — liste enveloppée dans `ScenePlayer`, `SceneListenControl` si `!locked && hasAudio`, `aria-current` + marque visible (bordure accent, fond `paperSoft`) sur le `<li>` en cours
- `src/app/catalogue/[city]/[tourSlug]/__tests__/itinerary-listen.test.tsx` (A) — gratuite/anonyme, payante/anonyme (2 boutons), payante/acheteur (tous après l'accord), invalidation après achat, déconnexion pendant l'écoute, redemande refusée, HTML sans URL
- `src/app/catalogue/[city]/[tourSlug]/page.tsx` (M) — texte `download` fr/en
- `src/app/aide/_content.ts` (M) et `src/app/en/help/_content.ts` (M) — FAQ « Comment écouter » : l'écoute est sur la page, l'appli ajoute GPS et hors-ligne
- `src/__mocks__/appsync-client-mock.ts` (M) — stub par défaut de `getPublishedTourContent` (`{ ok: false }`)
- `e2e/tests/catalogue-pois.spec.ts` (M) — l'assertion suit le nouveau libellé (« Écoutez ici »)
