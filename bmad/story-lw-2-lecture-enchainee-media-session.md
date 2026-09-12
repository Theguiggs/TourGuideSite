# Story LW-2 : lecture enchaînée, contrôles écran verrouillé, reprise

Status: ready-for-review

<!-- Implémentée le 2026-09-12 d'après spec-lw-2-lecture-enchainee-media-session.md
     (source de vérité), puis corrigée le même jour après une revue à trois
     relecteurs (35 correctifs, sections A à G). Les ACs ci-dessous sont alignés
     sur ce qui est livré. Reste à faire à la main : le protocole écran
     verrouillé (Android Chrome, iOS Safari), à cocher par Steff — voir en bas. -->

<!-- Épopée LW. Dépend de LW-1. -->

## Story

En tant que **visiteur qui écoute une visite entière**,
je veux **que les étapes s'enchaînent, que je puisse les piloter écran verrouillé, et reprendre là où j'en étais**,
afin d'**écouter en marchant ou en cuisinant sans garder le téléphone en main**.

## Contexte vérifié (2026-09-12)

- Media Session API : disponible sur Chrome Android et Safari iOS ; donne titre, image, précédent/suivant sur l'écran verrouillé et les écouteurs. Absente de jsdom : tout accès est gardé (`media-session.ts`).
- Le `<audio>` unique de LW-1 est la condition pour enchaîner sans geste utilisateur : la piste suivante est ouverte depuis l'événement `ended` lui-même, seul chemin que Safari iOS accepte en arrière-plan. Pas de second `<audio>` de préchargement (interdit par le spec).
- Les URLs signées valent 15 min ; une visite en dépasse la durée. À chaque frontière de piste, `ensureFresh({ minValidityMs: 5 min })` redemande le contenu si la validité restante ne couvre pas une narration.
- Le `logger` web n'a pas de niveau `debug` : les échecs silencieux (stockage, Media Session) passent par `logger.info` (console en développement seulement).

## Acceptance Criteria

1. **Bouton « Écouter la visite »** en tête d'itinéraire (`TourPlayControl`) : lance la première étape servie et narrée, puis enchaîne sur `ended` en réutilisant l'unique `<audio>`. « Pause » / « Reprendre la visite » pendant la séquence. La liste suit (défilement gardé, et **`prefers-reduced-motion` honoré**). Un clic « Écouter » isolé reste LW-1 (pas d'enchaînement) ; un clic sur une étape pendant la séquence la fait continuer depuis elle. **`nexttrack` / `previoustrack` activent aussi la séquence** — piloter depuis les écouteurs, c'est écouter la visite — **et disent la frontière** (fin d'aperçu / visite terminée) au lieu de l'avaler.
2. **Media Session** — `metadata` (titre de l'étape, titre de la visite, `coverUrl` de la réponse s'il existe), actions `play`, `pause`, `previoustrack`, `nexttrack`, `seekto`, **`seekbackward` / `seekforward` (± 10 s)** ; `playbackState` suit la lecture ; **`setPositionState` à chaque durée connue et à chaque saut**, sans quoi l'écran verrouillé n'affiche ni curseur ni durée et `seekto` reste inatteignable. Tout est retiré au démontage (et donc au changement de visite) **et à la perte d'accès** (`release`). À vérifier sur Android Chrome et iOS Safari (protocole ci-dessous).
3. **Reprise** — `localStorage` clé `murmure.player.resume.<tourId>` → `{ sceneId, position, updatedAt }` (jamais d'URL), écrite au plus toutes les 5 s pendant la lecture, à la pause, **au `pagehide`**, au démontage **et à la perte d'accès** ; lue au montage, **ignorée et purgée passé 90 jours** ; try/catch partout. Pastille « Reprendre à l'étape N » (numéro affiché de l'étape) seulement si la scène mémorisée est dans la liste jouable ; sinon rien, et la clé est purgée — **uniquement sur une liste réellement arrêtée** (`playlistSettled` : contenu accordé, ou personne à attendre ; ni une redemande en vol, ni une session en cours de résolution, ni un échec réseau). **La position de reprise n'est posée qu'à `loadedmetadata` et abandonnée si elle tombe dans la dernière seconde** : une narration republiée plus courte déclencherait sinon `ended` — donc l'enchaînement — sur une piste jamais jouée. Purge quand la dernière étape jouable se termine.
4. **Fin d'aperçu gratuit** — la dernière servie finie et des étapes verrouillées après : la lecture s'arrête sur « Débloquez la visite pour écouter la suite » avec un lien vers `#acheter` (ancre `PURCHASE_ANCHOR_ID`, conteneur focalisable des cartes d'achat). **Le message vient à la vue et prend le focus** — le défilement automatique venait d'emmener la vue sur la dernière étape. Sans étapes verrouillées : « Visite terminée », discret.
5. **Renouvellement des URLs** — `ensureFresh({ minValidityMs })` : périmé si `expiresAt − now < minValidityMs` (défaut 0 = LW-1 inchangé) ; la frontière de piste exige 5 min, **saut manuel compris**. **La validité minimale ne s'applique qu'à une échéance RÉELLE** (`computeExpiry().fromResponse`) : sans `mediaExpiresAt`, le repli local (10 min, ou 60 s) est toujours sous les 5 min, et l'y opposer ferait redemander à chaque piste — chacune démarrant avec sa relance déjà consommée. **Une redemande de frontière qui échoue retombe sur un cache encore valide** plutôt que de tuer la séquence. Une nouvelle piste = une nouvelle tentative (une relance max).
6. **Épreuves** — 43 cas LW-2 dans `scene-player.test.tsx`, 13 dans `resume-store.test.ts`, 14 dans `media-session.test.ts`, 8 dans `itinerary-listen.test.tsx`, 4 dans `purchase-anchor.test.tsx`, 11 dans `use-scene-audio.test.tsx` ; suite complète verte (275 suites, 2339 tests), `tsc` à 0, `lint` à 0.
7. **Accessibilité** — région `aria-live="polite"` annonçant « Étape N sur M : titre » à chaque changement de piste **pendant une séquence** (`aria-current` ne s'annonce pas) ; cible `#acheter` focalisable ; apostrophes typographiques dans la copie française.

## Hors périmètre

- Lecture hors-ligne. Vitesse de lecture. Minuterie de sommeil.
- Sélecteur de langue (LW-3), carte (LW-4).
- Artwork de secours depuis `Tour.imageUrl` quand la réponse n'a pas de `coverUrl` : non fait (optionnel dans le spec).

## File List

- `src/components/catalogue/scene-player/use-scene-audio.ts` (M) — `ensureFresh({ minValidityMs })` ; `computeExpiry` (échéance **et** sa provenance) ; `isStale(expiresAt, now, min, fromResponse)` ; repli sur un cache valide quand la redemande échoue ; `coverUrl` gardé en cache **et conservé** si une réponse ne le porte pas ; `readCoverUrl()`
- `src/components/catalogue/scene-player/scene-player.tsx` (M) — props `playlist` / `lockedAfter` / `tourTitle` / `playlistSettled` ; `openAttempt` (mécanique unique d'une nouvelle scène, `sequence` conservé, garde de démontage) ; `onEnded` enchaîne ou finit (`preview-end` / `complete`) ; `startSequence`, `next`, `previous` (séquence activée, validité minimale, frontière annoncée) ; `seek` borné par la durée + `seekBy` ; reprise posée à `loadedmetadata` avec garde de fin de piste ; Media Session (métadonnées et position par piste, 7 actions, retrait au démontage et à `release`) ; reprise (écriture 5 s / pause / `pagehide` / démontage / `release`, purge) ; `SCENE_PLAYER_COPY` fr/en étendue (apostrophes typographiques) ; `useScenePlayer`, `useTourPlayer` (le contexte ne sort plus du module) ; avertissement de développement si `playlist` manque
- `src/components/catalogue/scene-player/media-session.ts` (A) — `applyMediaSession`, `setMediaSessionPlaybackState`, `setMediaSessionPosition`, `clearMediaSession`, `bindMediaSessionActions` → fonction de retrait ; tout gardé par `'mediaSession' in navigator`, tolérance par action, retrait de ce qui a été lié seulement
- `src/components/catalogue/scene-player/resume-store.ts` (A) — `readResume` / `writeResume` / `clearResume` / `resumeKey` ; validation de forme, valeur illisible ou vieille de plus de `RESUME_MAX_AGE_MS` (90 j) purgée, try/catch partout (accesseur compris)
- `src/components/catalogue/scene-player/tour-play-control.tsx` (A) — `TourPlayControl` : bouton de visite, pastille de reprise, messages de fin (lien `#acheter`, amenés à la vue et focalisés), région `aria-live` de l'étape en cours
- `src/components/catalogue/scene-player/purchase-anchor.ts` (A) — `PURCHASE_ANCHOR` / `PURCHASE_ANCHOR_ID`, module NU (sans `'use client'`) : les deux bouts du contrat, page serveur comprise
- `src/components/catalogue/scene-player/reveal.ts` (A) — `revealElement` / `prefersReducedMotion` : `scrollIntoView` gardé, animation honorant la préférence de mouvement
- `src/components/catalogue/scene-player/index.ts` (M) — barrel : `TourPlayControl`, `useTourPlayer`, `PURCHASE_ANCHOR(_ID)`, `isStale`, types `PlaylistEntry` / `SequenceEnding` / `TourPlayerView` / `EnsureFreshOptions` (la reprise, interne au lecteur, n'y est plus)
- `src/components/catalogue/scene-player/__tests__/scene-player.test.tsx` (M) — harnais étendu (`TourPlayControl`, `playlist`, faux `navigator.mediaSession` avec `setPositionState`, stockage vidé) + 43 cas LW-2 : séquence (même nœud), fin d'aperçu, fin de visite + purge + relance depuis la première, frontières (< 5 min → redemande, ≥ 5 min → non, repli → non, échec → cache), URL absente → séquence arrêtée, clic isolé, clic pendant la séquence, pause / reprise du bouton, pause pendant une relance puis mode visite, Media Session (métadonnées, position, 7 actions, retrait, next / previous / seekto / seekbackward / seekforward / pause / play, bout de liste annoncé, changement de visite), perte d'accès (position gardée, session nettoyée), `pagehide` et démontage, démontage pendant le vol, reprise (pastille, position posée à la durée, au-delà de la durée, dernière seconde, numéro d'étape, verrouillée → purge, liste non arrêtée, clé illisible, rythme 5 s / pause, `localStorage` qui lève), message de fin révélé et focalisé, annonce vocale, `playlist` oubliée, en
- `src/components/catalogue/scene-player/__tests__/resume-store.test.ts` (A) — clé, lecture / écriture / purge, position bornée, 8 valeurs illisibles purgées, péremption 90 j (et horloge en arrière), accesseur qui lève, quota
- `src/components/catalogue/scene-player/__tests__/media-session.test.ts` (A) — API absente ou nulle, branche de production `new MediaMetadata(...)`, `metadata` / `playbackState` / `setPositionState` qui lèvent ou manquent, position bornée, action refusée (les autres tiennent, le retrait ne libère que le lié)
- `src/components/catalogue/scene-player/__tests__/use-scene-audio.test.tsx` (M) — `computeExpiry` (provenance), `isStale` (défaut, minimum, repli, échéance passée), frontière (redemande / cache / repli), échec sur cache valide → cache, échec sur cache périmé → rien, `coverUrl` conservé
- `src/app/catalogue/[city]/[tourSlug]/itinerary-list.tsx` (M) — prop `tourTitle` ; `useServedContent` rapporte `settled` (accordé, ou personne à attendre — jamais après un échec, ni pendant la résolution de session) ; `playlist` / `lockedAfter` construits ici (même règle de verrou que la liste) ; `TourPlayControl` au-dessus du `<ol>` ; `revealElement` sur le `<li>` courant en séquence
- `src/app/catalogue/[city]/[tourSlug]/__tests__/itinerary-listen.test.tsx` (M) — payante / anonyme : deux servies enchaînées puis fin d'aperçu (`#acheter`, s4 jamais jouée, défilement) ; gratuite : scène sans narration sautée puis « Visite terminée » ; acheteur : reprise qui attend l'accord, survit à une redemande refusée, et n'est pas purgée pendant la résolution de session (mais l'est pour un anonyme avéré) ; `tourTitle` jusqu'à la Media Session ; mouvement réduit
- `src/app/catalogue/[city]/[tourSlug]/__tests__/purchase-anchor.test.tsx` (A) — l'ancre existe, est focalisable, porte la carte à l'unité ou le forfait, et reste posée sur une visite gratuite comme en anglais
- `src/app/catalogue/[city]/[tourSlug]/page.tsx` (M) — `tourTitle={tour.title}` ; `<div id={PURCHASE_ANCHOR_ID} tabIndex={-1}>` autour des cartes d'achat

## Protocole manuel — écran verrouillé (à cocher par Steff)

Préparation : `npm run dev` (ou le VPS), une visite gratuite de 3 étapes narrées ou plus, téléphone sur le même réseau.

### Android Chrome

- [ ] Ouvrir la fiche, toucher « Écouter la visite » : l'étape 1 joue, le bouton passe à « Pause », l'étape 1 est marquée.
- [ ] Verrouiller l'écran : la lecture continue ; la notification média montre le titre de l'étape, le titre de la visite et la couverture (si la réponse porte `coverUrl`).
- [ ] Attendre la fin de l'étape 1 écran verrouillé : l'étape 2 démarre seule, la notification change de titre.
- [ ] « Suivant » depuis la notification : l'étape 3 démarre. « Précédent » : retour à l'étape 2. Sur l'étape 1, « Précédent » la relance à zéro.
- [ ] Pause / lecture depuis la notification : le bouton de la page suit après déverrouillage.
- [ ] Déverrouiller : la bonne étape est marquée (`aria-current`, fond), la liste a défilé jusqu'à elle.
- [ ] Fermer l'onglet en cours d'écoute, rouvrir la fiche : la pastille « Reprendre à l'étape N » propose la bonne étape ; toucher → reprise à la position (≈ 5 s près), la séquence continue.
- [ ] Visite payante en aperçu (anonyme) : après la 2e étape, le message « Débloquez la visite… » s'affiche, le lien mène au bloc d'achat, rien ne joue.
- [ ] Laisser tourner plus de 15 min (ou réduire la signature) : le passage d'une piste à l'autre ne casse pas (redemande à la frontière).

### iOS Safari

- [ ] Mêmes points que ci-dessus. Point critique : l'enchaînement écran verrouillé (étape 1 → 2 sans toucher) — c'est le chemin `ended` → `play()` que Safari doit accepter en arrière-plan.
- [ ] Centre de contrôle / écran verrouillé : titre, visite, couverture ; « Suivant » / « Précédent » ; glissière de position (`seekto`) — elle n'apparaît que si `setPositionState` a été accepté ; ± 10 s (`seekbackward` / `seekforward`).
- [ ] Si l'enchaînement s'arrête écran verrouillé (Safari refuse `play()`), le noter ici : c'est le cas « Ask First » du spec (préchargement avec un second `<audio>`), à renégocier.
