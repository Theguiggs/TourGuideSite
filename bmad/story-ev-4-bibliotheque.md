# EV-4 — Mes visites et reprise

Statut : implémenté localement ; recette consolidée dans EV-6. Aucun push ni déploiement.

La bibliothèque distingue les reprises sur cet appareil des autres achats, conserve date/montant et gère les visites retirées. Les cartes n’affichent durée/distance que si disponibles. Un changement de compte remonte la bibliothèque ; une réponse tardive de l’ancien compte est ignorée. Un rejet réseau donne une nouvelle tentative. La purge du stockage retire immédiatement les reprises proposées.

Fichiers : `src/components/catalogue/mes-visites-content.tsx`, `purchased-tour-card.tsx`, `use-library-resumes.ts`, test `__tests__/mes-visites-content.test.tsx`. Le lecteur existant revérifie scène, langue et droits serveur, sans nouvelle instance audio ni URL signée persistée.

Spécification : [EV-4](../docs/spec-ev-4-mes-visites.md). Trois revues indépendantes n’ont relevé aucun défaut bloquant supplémentaire sur ce lot. Les cas changement de compte, réponse tardive, rejet et purge sont testés. Rapport : [recette EV-6](revue-ev-6.md).
