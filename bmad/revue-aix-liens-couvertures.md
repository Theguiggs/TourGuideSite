# Aix : liens et couvertures — 13 septembre 2026

Statut : corrigé et vérifié sur `http://localhost:3000`, aucun déploiement.

## Diagnostic

- Les trois liens de visites rendaient 404 sur le serveur Next dev existant.
  Les mêmes URL répondaient 200 sur une instance de la version compilée. Un
  simple redémarrage n’a pas suffi ; la mise de côté de `.next/dev`, suivie
  d’une recompilation propre, a rétabli les routes. Aucun slug n’a été modifié.
- Les couvertures étaient des clés S3 privées signées côté navigateur avec
  les droits Cognito anonymes. S3 renvoyait 403 `AccessDenied` sur `GetObject` ;
  Chromium masquait cette réponse XML avec `ERR_BLOCKED_BY_ORB`.
- Les cartes utilisent maintenant `coverUrl` du résolveur de contenu public,
  puis une photo publique de scène. Aucun repli sur une clé privée en panne,
  y compris dans la projection de fiche. Cache partagé et concurrence cinq
  conservés. Aucune permission S3 ni donnée de visite modifiée.

## Vérifications

- 17 tests réussis : mapping serveur et résolution des slugs, URL de couverture
  autorisée, cache, repli photo, panne sans clé privée et récupération.
- TypeScript et lint ciblé : réussis.
- Navigateur Chromium sur localhost3000 : trois images de largeur native
  1536 pixels chargées, FR et EN. Trois clics vers fiches et trois accès directs
  HTTP 200 dans chaque langue ; titres des fiches conformes aux cartes.
- Captures : `docs/verification-aix/catalogue-fr-mobile.png` et version EN.
- Trois relectures indépendantes. Le repli privé de fiche signalé a également
  été supprimé, et les tests de repli/récupération ont été ajoutés.

Le cache de développement précédent reste sauvegardé sous
`.next/dev-aix-backup-20260913122005`. Le serveur local sur le port 3000 reste
lancé pour vérification par l’utilisateur.

Limite de performance : une ville nécessite désormais une lecture de contenu
par couverture à froid, bornée à cinq appels concurrents et mise en cache.
La configuration normale du cache (cinq minutes) reste inférieure à la validité
des signatures (quinze minutes) ; ne pas l’allonger au-delà de cette validité.
