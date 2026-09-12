# Story LW-6 : « Écouter » depuis Mes achats, mesure, i18n, accessibilité

Status: draft

<!-- Épopée LW. Dépend de LW-1 et LW-2. Ferme la boucle de valeur. -->

## Story

En tant que **visiteur qui vient d'acheter sur le web**,
je veux **retrouver un bouton « Écouter » sur chacune de mes visites**,
afin de **consommer mon achat en un geste** ; et en tant qu'**éditeur**, je veux **savoir qui écoute sur le web, et quoi**.

## Contexte vérifié (2026-09-12)

- `purchased-tour-card.tsx` et `my-purchases-strip.tsx` pointent vers `/catalogue/[city]/[tourSlug]` sans intention d'écoute.
- Amplitude web est installé (`@amplitude/analytics-browser`). La story obs-1 a fixé la convention : `city_id` sous la **même clé** que dans l'appli, sinon l'entonnoir n'est pas segmentable.
- Pages `/en/my-purchases` et `/mes-achats` : deux locales à tenir.

## Acceptance Criteria

1. **CTA « Écouter »** sur la carte d'achat et la bande Mes achats, vers `/catalogue/[city]/[tourSlug]#ecouter` ; l'ancre ouvre le lecteur et lance (ou propose de reprendre, LW-2) sans second clic superflu.
2. **Événements** — `WEB_LISTEN_START` (tour_id, city_id, language, from: purchases | tour_page | resume), `WEB_SCENE_COMPLETE` (tour_id, city_id, scene_order), `WEB_LISTEN_COMPLETE` (tour_id, city_id). Même `serverZone: 'EU'` et `ipAddress: false` que l'existant. Test sur l'émission.
3. **i18n** — tous les libellés du lecteur, du sélecteur, de la carte et du bandeau PWA en fr et en, via le mécanisme de la page (`copy`), aucune chaîne en dur.
4. **Accessibilité** — lecteur pilotable au clavier (espace, flèches ±10 s), `aria-live` pour l'étape en cours, contrastes DS, focus visible ; passe l'audit a11y existant (`a11y-audit-murmure.md`) sans nouvelle régression.
5. **Épreuves** — tests des deux CTA, des événements, passe axe sur la page visite avec lecteur ouvert.
