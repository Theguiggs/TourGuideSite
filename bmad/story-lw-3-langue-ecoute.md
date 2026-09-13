# Story LW-3 : choix de la langue d'écoute

Status: done

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

## Livraison (12–13 septembre 2026)

- Sélecteur fr/en dans le lecteur, inventaire issu uniquement des URLs accordées par le serveur ; langue source inconnue nommée « Langue d’origine ». Mention de voix synthétique partagée avec la fiche.
- Préférence par visite, locale par défaut, repli source compté et annoncé. Une langue choisie reste affichée si ses traductions disparaissent au renouvellement ; aucun passage silencieux vers une autre traduction. Une préférence absente de l’aperçu peut revenir après achat.
- Même audio pour scène isolée et séquence. Changer de langue redémarre la scène à zéro, en conservant lecture ou pause. Les reprises portent la langue réellement jouée ; anciennes reprises compatibles, secondes conservées uniquement dans la même langue.
- Cache multilingue en mémoire, manifeste préparé côté navigateur sans téléchargement audio avant clic. Invalidation sur identité, achat et déconnexion ; demandes en vol partagées, relance unique conservée. Stockage facultatif et purge après 90 jours/déconnexion.
- START mesure la langue réellement jouée ; changement explicite mesuré après lecture effective, sans doublon de reprise ni de relance.

Spécification écrite avant code : `_bmad-output/implementation-artifacts/spec-lw-3-langue-ecoute.md` dans le workspace parent. Trois revues indépendantes et résultats détaillés dans [revue-lw-3.md](revue-lw-3.md).

La mutualisation du manifeste avec le chargement d’itinéraire reste une optimisation différée. Les essais Android/iOS physiques et écran verrouillé restent non exécutés.
