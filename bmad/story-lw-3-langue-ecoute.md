# Story LW-3 : choix de la langue d'écoute

Status: draft

<!-- Épopée LW. Dépend de LW-1. -->

## Story

En tant que **visiteur non francophone**,
je veux **choisir la langue dans laquelle j'écoute la visite**,
afin de **profiter des narrations déjà produites dans ma langue**.

## Contexte vérifié (2026-09-12)

- `translatedAudioUrls: Record<lang, url>` est déjà servi par scène. La page affiche déjà une section « Audio par langue » (`page.tsx:44`) à partir de `GuideTour.languageAudioTypes`.
- Le Studio a `LanguagePreviewPlayer` (ML-6.1) : même logique (sélecteur + alerte scènes sans audio dans la langue), à transposer côté visiteur, pas à importer.
- « Voix de synthèse » se déduit de `languageAudioTypes` ; l'audio de base n'a pas ce marqueur sauf `StudioScene.baseAudioSource`.

## Acceptance Criteria

1. **Sélecteur** dans l'îlot lecteur : langue de base + langues présentes dans `translatedAudioUrls` d'au moins une scène. Défaut : locale de la page (`/en` → `en`) si disponible, sinon langue de base.
2. **Choix mémorisé** par visite (`localStorage`, try/catch) et appliqué à LW-1 et LW-2.
3. **Scènes sans audio dans la langue** — comptées et annoncées (« 2 étapes seront lues en français ») ; l'enchaînement retombe sur `audioUrl` de base pour ces scènes, sans s'arrêter.
4. **Mention « Voix de synthèse »** affichée à côté de la langue quand `languageAudioTypes` l'indique, même wording que la section existante.
5. **Épreuves** — tests du calcul des langues disponibles, du repli, du défaut par locale.
