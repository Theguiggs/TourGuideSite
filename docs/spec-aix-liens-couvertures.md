# Aix-en-Provence : fiches et couvertures

Signalement local du 13 septembre 2026 : trois fiches en 404 depuis
`http://localhost:3000/catalogue/aix-en-provence` et couvertures absentes.

Reproduction : les trois fiches échouent sur le serveur Next dev actuel ; la
même fiche répond 200 sur un serveur frais de la version compilée. Redémarrer
uniquement le serveur de développement identifié du projet, puis revérifier
les trois liens FR/EN avant de modifier la génération des slugs.

Couvertures : les cartes envoient les clés S3 privées à `S3Image`, qui les signe
avec les droits Cognito du visiteur anonyme. S3 refuse `GetObject` (403) et le
navigateur masque la réponse XML par ORB. Le résolveur public sait déjà signer
la couverture avec les droits du backend. Utiliser `coverUrl` de ce résolveur,
puis une photo de scène publique ; ne pas ouvrir les permissions S3 ni renvoyer
la clé privée au navigateur en cas d’échec.

Critères : cartes conservées même si média indisponible, cache et concurrence
bornée conservés, aucune URL audio signée dans la projection serveur ; couvertures
réellement chargées (`naturalWidth > 0`) et trois fiches sans 404 sur localhost,
en FR et EN. Tests du mapping, relectures et commit local. Aucun déploiement cloud.
