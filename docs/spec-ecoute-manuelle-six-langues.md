# Écoute à chaque étape et six langues

Demande du 13 septembre 2026 : le visiteur lance chaque audio à son arrivée.
Cette décision remplace explicitement l’enchaînement LW-2. Un seul élément
audio reste utilisé. Les commandes manuelles suivant/précédent restent des gestes.
L’ancre d’entrée ne doit plus démarrer la lecture seule.

## Écoute : critères

- Fin d’une étape : arrêt, aucune ouverture ou lecture de la suivante.
- Clic sur une autre étape : lecture uniquement de celle-ci.
- Bouton de visite, reprise sauvegardée et commandes Media Session : même règle.
- Fin d’aperçu : restrictions serveur et lien d’achat conservés.
- Fin de dernière étape : message de fin conservé, aucune répétition automatique.
- Entrée par lien : focus sur le lecteur, aucun son sans clic.
- Expliquer que chaque étape se lance sur place, en français et en anglais.
- Tester arrêt, clic suivant, reprise, langue, ancre et commandes écran verrouillé
  simulées. Ne pas présenter ces simulations comme des essais sur téléphone.

Code : `src/components/catalogue/scene-player/scene-player.tsx` (événement
`ended`, entrée par ancre), `tour-play-control.tsx` (consigne), tests du lecteur.

## Langues : périmètre confirmé

Le visiteur demande les menus et pages aussi : français, anglais, espagnol,
allemand, italien et néerlandais (`TourGuideApp/src/i18n/index.ts`). Les langues
des narrations restent limitées aux contenus réellement disponibles. Pas de
traduction fictive d’un audio absent. La migration doit couvrir navigation,
compte, catalogue, fiches, lecteur, achats, aide et pages publiques annexes,
avec routes, métadonnées, retours de connexion et conservation des filtres.

## Stripe : vérification sans mutation

Vérifier présence/type de clé publique sans afficher les valeurs. Distinguer
intégration du code, configuration locale et activation réelle du déploiement.
Une absence de Stripe ne change jamais les droits accordés par le serveur.
Aucun paiement ni déploiement autorisé par cette vérification.
