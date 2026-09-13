# LW-3 — revues et preuves

Travaux des 12–13 septembre 2026. Référence avant travaux : `86f801a3`, 277 suites / 2 372 tests verts. Spécification écrite avant code dans le workspace parent. Trois relecteurs indépendants ont reçu la story et le diff, sans historique de conversation ni rapports des autres.

## Constats traités

| Relecture | Constat | Correction et preuve |
| --- | --- | --- |
| Manques | Retrait de la dernière traduction au renouvellement : autre langue ou repli silencieux. | Intention d’écoute conservée pour la session, option maintenue et repli compté. Test de → fr avec en encore disponible, position zéro, reprise fr et START unique. |
| Manques et cas limites | Le bouton de relance des langues ne redemandait rien après échec média avec cache frais. | Redemande explicite, test de trois appels et sortie de l’erreur. |
| Cas limites | Pause pendant relance puis reprise conservait un marqueur de pause, arrêtant le son au changement de langue. | Marqueur réinitialisé à la reprise, pause initialisée selon l’intention ; scénario complet testé. |
| Cas limites et contre-relecture | Ancienne génération créant une troisième demande après achat, même si la nouvelle demande avait déjà abouti. | Réutilisation de la demande courante ou de son cache frais ; deux ordres de réponse testés, exactement deux appels, traduction courante conservée. |
| Vérifications | Achat, traduction retirée, requête différée et traduction seule insuffisamment éprouvés. | Scénarios intégrés ajoutés : préférence réapparue/choix explicite, repli et langue de reprise, purge pendant manifeste différé, traduction sans original puis indisponibilité. |
| Vérifications | Absence de play() ne prouvait pas l’absence de téléchargement. | Comptage des requêtes média avant clic dans les essais navigateur fr/en. |

Les contre-relectures des cas limites et des preuves ne signalent plus de défaut concret dans leurs périmètres. Elles ont relu les changements et assertions ; les exécutions ci-dessous sont celles de l’agent principal.

## Validation

`npm test -- --runInBand` : **278 suites / 2 418 tests réussis** (117,316 s). `npm run typecheck` : **0 erreur**. `npm run lint` : **0 problème**. `git diff --check` : aucune anomalie sur les fichiers livrés.

Passe navigateur finale complète : **3 réussis / 1 échec** (3,1 min). Réussis : lecteur français/clavier/axe, arrivée avec reprise, changement de langue/source/position/pause et persistance au rechargement. Axe français : zéro violation sur les contrôles et zéro nouvelle violation de page. Aucune requête média avant interaction. Le scénario anglais a reçu une page **404 avant le lecteur** ; son résultat est distingué de ceux du composant.

Relance ciblée anglaise par accès direct à la même fiche, avec `LW6_TOUR_PATH=/catalogue/nice/nice-nissa-la-bella` et `--grep 'axe.*en'` : **1/1 réussi** (23,5 s), axe et absence de téléchargement avant clic compris. Les quatre scénarios sont donc validés sur les deux exécutions ; la 404 intermittente du parcours catalogue reste documentée.

Commande navigateur : `npx playwright test --config playwright.player.config.ts --reporter=list`. Fiche publique de Nice, lecture seule ; source sonore WAV silencieuse avec HTTP Range. Le scénario multilingue injecte une traduction dans la réponse de test des seules scènes audio publiques servies, car la fiche actuelle n’expose pas de traduction anglaise. Le composant et HTMLAudioElement restent réels ; aucune donnée distante modifiée.

La première passe a révélé une dépendance à une traduction absente des données publiques et un délai de chargement lors d’un rechargement à chaud pendant les corrections. Le scénario multilingue utilise désormais un manifeste contrôlé ; la passe finale est exécutée sans modifications concurrentes de code.

Les limites LW-6 restent valables : setup E2E standard bloqué par les identifiants Cognito et sa configuration de teardown, non relancé ici. Chromium avec user-agent mobile ne valide aucun appareil physique, lecteur d’écran, ni contrôle écran verrouillé. Ces essais restent non exécutés.
