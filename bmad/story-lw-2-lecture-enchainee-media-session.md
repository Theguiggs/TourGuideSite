# Story LW-2 : lecture enchaînée, contrôles écran verrouillé, reprise

Status: draft

<!-- Épopée LW. Dépend de LW-1. -->

## Story

En tant que **visiteur qui écoute une visite entière**,
je veux **que les étapes s'enchaînent, que je puisse les piloter écran verrouillé, et reprendre là où j'en étais**,
afin d'**écouter en marchant ou en cuisinant sans garder le téléphone en main**.

## Contexte vérifié (2026-09-12)

- Media Session API : disponible sur Chrome Android et Safari iOS ; donne titre, image, précédent/suivant sur l'écran verrouillé et les écouteurs.
- Le `<audio>` unique de LW-1 est la condition pour enchaîner sans geste utilisateur.
- iOS coupe la lecture en fond si le changement de `src` n'est pas déclenché par un événement média : enchaîner depuis `ended` fonctionne, précharger la piste suivante aide.

## Acceptance Criteria

1. **Bouton « Écouter la visite »** en tête d'itinéraire : lance la première étape servie, puis enchaîne sur `ended`. La liste suit (défilement doux vers l'étape en cours).
2. **Media Session** — `metadata` (titre de l'étape, titre de la visite, couverture `coverUrl`), actions `play`, `pause`, `previoustrack`, `nexttrack`, `seekto`. Vérifié sur Android Chrome et iOS Safari (protocole manuel joint à la story à la livraison).
3. **Reprise** — l'étape et la position en cours sont mémorisées dans `localStorage` (clé par `tourId`), avec try/catch ; au retour sur la page, une pastille « Reprendre à l'étape N » les propose. Purge à la fin de la visite.
4. **Fin d'aperçu gratuit** — quand la dernière scène servie se termine et que d'autres restent floutées, le lecteur s'arrête sur un message qui pointe le bouton d'achat existant, pas sur un silence.
5. **Renouvellement des URLs** — l'enchaînement redemande le contenu si `mediaExpiresAt` tombe avant la fin de la piste suivante (une visite de 40 min dépasse les 15 min de signature). Test unitaire sur la décision de renouvellement.
6. **Épreuves** — tests du séquenceur (ordre, fin d'aperçu, reprise), `tsc` à 0.

## Hors périmètre

- Lecture hors-ligne. Vitesse de lecture. Minuterie de sommeil.
