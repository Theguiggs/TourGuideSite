# LW-6 — revues et preuves

Date : 12 septembre 2026. Référence avant travaux : `15d36a19`, 275 suites / 2 339 tests verts. Trois relecteurs séparés ont reçu la story et le diff, sans historique de conversation ni rapports des autres.

## Constats traités

| Relecture | Constat | Correction et preuve |
| --- | --- | --- |
| Manques | La provenance achats disparaissait si une reprise était proposée mais que le visiteur recommençait. | Origine d’arrivée séparée du verrou d’autoplay ; test depuis l’ancre avec reprise puis clic principal. |
| Cas limites | L’onglet distant gardait les URLs privées en cache après déconnexion. | Cache et requêtes invalidés, identité abandonnée ; un nouveau clic doit obtenir une nouvelle autorisation serveur, testé avec réponse sans URL. |
| Cas limites | Une reprise créée dans un autre onglet après montage bloquait l’arrivée par ancre. | Actualisation du candidat depuis le stockage lors de l’arrivée ; offre et focus éprouvés. |
| Vérifications | Le test hashchange émettait sur l’audio, hors du listener réel. | Émission sur window, arrivée après montage puis répétition ; unicité et focus vérifiés. |
| Vérifications | Le mock recréait les noms d’événements au lieu de vérifier le contrat réel. | Vraies constantes conservées ; épreuve du transport jusqu’au SDK mocké, noms, propriétés, EU et IP vérifiés. |
| Contre-relecture cas limites | Une restauration d’identité tardive pouvait reconnecter après déconnexion distante. | Génération de session invalidant les résolutions anciennes ; test avec profil différé. |
| Contre-relecture sans audio | `settled=false` après échec pouvait laisser un chargement permanent. | Message d’indisponibilité, distinct d’une absence d’audio avérée ; épreuve avec redemande refusée. |

Les deux premières contre-relectures ont confirmé leurs corrections sans nouveau constat. La relecture des cas limites a successivement révélé les deux dernières courses ci-dessus, corrigées et testées. Les textes des cartes ont aussi été extraits dans une copie fr/en ; la définition de « visite terminée » est explicitée dans la story.

## Résultats

Résultats finaux : `npm test` — **277 suites / 2 372 tests réussis**, 29,815 s ; `npm run typecheck` — **0 erreur** ; `npm run lint` — **0 problème**. `git diff --check` sans anomalie sur les fichiers de la story.

Playwright public : **3/3 réussis en 48,8 s**, lecteur fr/en, clavier, reprise. Axe sur les contrôles : zéro violation ; comparaison de page avant/après ouverture : zéro nouvelle violation WCAG A/AA. Le média du test est un WAV silencieux avec prise en charge des requêtes HTTP Range ; aucun remplacement du composant lecteur ni de `play()` dans le navigateur.

Commande reproductible : `npx playwright test --config playwright.player.config.ts --reporter=list`. La fiche publique est choisie à Nice par défaut ; `LW6_TOUR_PATH` permet de fixer un parcours précis. Les données du catalogue restent une dépendance de cette passe en lecture seule.

La suite Playwright standard reste non validée : le setup Cognito refuse les identifiants administrateur et le teardown manque de cible `APPSYNC_API_ID`. La première fiche choisie à Grasse renvoyait aussi une 404 ; la passe publique a été exécutée sur une fiche disponible de Nice. Aucun changement de compte, de backend ou de contenu pour contourner ces difficultés.

L’audit `TourGuideApp/bmad/a11y-audit-murmure.md` est une matrice mobile. Les essais appareil, écran verrouillé et lecteurs d’écran restent non exécutés. Aucun résultat Chromium ne les remplace.
