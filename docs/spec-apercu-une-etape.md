# Aperçu gratuit : une étape

Demande du 13 septembre 2026 : une seule étape en aperçu des visites payantes.
Le serveur tronque dès la deuxième étape (audio source et traduit, description,
photos). Titres et coordonnées restent disponibles pour montrer le parcours.
Les visites gratuites et les droits déjà acquis conservent leur accès complet.

Modifier la constante partagée du backend (`amplify/shared/preview-scenes.ts`)
et son miroir visuel Web (`src/lib/catalogue/scene-pois.ts`). Les producteurs
d’aperçus et la validation d’ouverture des langues utilisent la même constante.
Aligner également `FREE_PREVIEW_POIS` de `TourDetailScreen` dans l’application.
Adapter les tests du résolveur, de production et d’ouverture de langue, ainsi
que la projection Web et l’itinéraire. Vérifier la fin d’aperçu dès la première
étape et le maintien de l’écoute manuelle.

Les fichiers audio déjà produits ne sont pas supprimés. Les trois relectures
portent sur les manques, les cas de bord et les preuves. Commits locaux ; le
changement de protection effective nécessite ensuite le déploiement du backend.
