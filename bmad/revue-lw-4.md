# LW-4 — revues et validation

13 septembre 2026, base dc72b75f. Spécification préalable dans le workspace parent. Trois revues indépendantes sans historique : manques, cas limites, preuves.

Corrections : appel du bon hook lecteur, restitution du tracé authentifié, cadrage incluant les détours du tracé, annonce GPS dans une région permanente, observer installé lorsque des coordonnées arrivent après montage. Tests Canvas distincts du conteneur : polyline, cadrage, actif/proche, protection du clic verrouillé. Tests position : permission au clic, refus/absence, nettoyage, page masquée, réponse tardive ; tests distance, égalité, coordonnées manquantes et véritable 0,0. La contre-relecture des cas limites a confirmé les corrections puis demandé la région live permanente, appliquée.

Suite complète : 280 suites / 2 427 tests verts (118,038 s), avant ajout d’un test supplémentaire distinguant absence GPS et 0,0. Passe LW-4 ciblée finale : 10/10 verts. TypeScript et ESLint sans erreur. Validation consolidée après LW-5 : 282 suites / 2 450 tests verts.

Playwright réel sur la fiche publique Nice : 1/1 vert (26,9 s). Vérifie absence de GPS au chargement, carte Leaflet chargée, position/étape proche, absence d’autoplay, clic qui joue dans l’audio unique et arrêt du suivi. Le média est un WAV de test et la position est simulée par Chromium. Le premier essai a laissé expirer le suivi simulé pendant l’attente réseau audio ; l’arrêt explicite se vérifie maintenant avant cette attente. Aucun résultat sur appareil physique ou écran verrouillé revendiqué.
