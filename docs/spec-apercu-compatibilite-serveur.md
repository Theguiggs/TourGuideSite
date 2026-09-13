# Aperçu : compatibilité avec le serveur encore à deux étapes

Signalement du 13 septembre 2026 : visite « Places et portes », compte connecté,
deux premières étapes lisibles et aucune étape floutée.

Cause identifiée dans le code : le serveur déployé sert encore deux étapes
d’aperçu. Le nouveau Web affiche une étape mais utilise aussi cette limite pour
inférer un droit complet : la deuxième description devient à tort une preuve
d’achat. La réception d’un ancien aperçu déverrouille donc toute la liste.

Séparer la limite d’affichage (une étape) du seuil conservateur de compatibilité
de lecture des anciennes réponses (deux étapes). Les médias/texte de l’ancien
aperçu ne prouvent aucun droit ; un contenu reçu au-delà prouve que le serveur
a accordé davantage. Ne jamais utiliser la simple connexion comme droit.

Tester réponse ancienne à deux étapes pour connecté sans achat, y compris
cas où le client croit avoir un achat, réponse actuelle à une étape, contenu
complet accordé, et flou/audio dès étape 2. L’accès serveur effectif à un seul
audio exige toujours le déploiement du backend : aucun déploiement ici.

Limite conservatrice : une réponse d’une visite de deux étapes
ne distingue pas achat et aperçu. Sans verdict explicite du serveur, on ne
déverrouille pas cette réponse ambiguë. Un futur contrat d’accès explicite
résoudra cette ambiguïté sans heuristique. La limite subsiste même après
déploiement du backend à une étape tant que ce verdict explicite est absent.

## Validation

Trois relectures indépendantes. 51 tests sur trois suites réussis : projection,
droits d’itinéraire et lecteur intégré. Les nouveaux cas couvrent le connecté
sans droit, le faux droit client, le flou de la deuxième étape et l’absence de
son bouton d’écoute. La frontière positive scène 3 avec audio traduit est aussi
couverte. TypeScript et lint ciblé réussis.

Vérification Chromium locale anonyme de « Places et portes » : une étape
lisible, cinq étapes verrouillées et floutées, un seul bouton d’écoute.
Le cas connecté a été reproduit et validé par tests avec ancienne réponse
serveur ; aucun compte réel ni paiement créé pour cette vérification.
