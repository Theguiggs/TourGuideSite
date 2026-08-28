# Plancher de fabrication — traduction et synthèse

*Story 8 — Banc de mesure du plancher de fabrication — rapport du 2026-08-28T09:08:23+02:00.*

> ### ⚠ Réserves ajoutées après coup — lire avant les chiffres
>
> - ADDENDUM du 2026-08-28, ajouté après la revue adversariale de l'étape 4. Ce rapport a été produit AVANT les correctifs de cette revue ; son générateur ne portait ni la section « Conclusion », ni l'agrégat par Visite, ni le facteur temps réel, ni le contrôle de provenance du cache. Les mesures brutes, elles, sont inchangées et restent valides — voir la réserve suivante.
> - PROVENANCE DU CACHE, vérifiée après coup. Le service n'avait PAS été démarré avec TRANSLATION_CACHE_MAX=0 : `cache_size` passe de 0 à 972 pendant la série. Le contrôle ajouté depuis (`_provenance_du_cache`) a été rejoué sur ce corpus : la série a soumis exactement 972 phrases DISTINCTES pour un delta de 972 entrées. Aucune phrase n'est donc revenue du cache, et les durées de traduction publiées ici tiennent. En revanche le cache est resté ARMÉ : une seconde série contre ce même service aurait été faussée. État qualifié par le banc corrigé : « armé, sans succès observé ».
> - FACTEUR TEMPS RÉEL, calculé après coup sur les données de ce rapport : 637 695 ms d'audio produits en 39,27 s de fabrication, soit ~16,2 × le temps réel sur la Visite médiane. Le générateur corrigé le publie désormais dans le résumé de chaque poste ; il ne figurait ici que dans le détail par Scène du .json.
> - DÉMARRAGE À FROID. `fr→de` affiche 14,06 s contre 3,89 / 4,47 / 4,61 s pour les trois autres paires : cet écart est l'éveil du processus, payé par la première paire de la boucle et non le prix de son modèle. Le banc corrigé fait précéder la boucle d'un amorçage jeté, et ce poste n'apparaîtra plus.
> - SONDAGE DU PORTAIL. La lecture « 0 à 15 s, espérance 7,5 s » de la section « Postes constatés » est FAUSSE, et dans le sens rassurant : `startPolling` arme un `setInterval` sans appel immédiat (tts-store.ts:62-85), donc le premier sondage tombe à t+15 s inconditionnellement. C'est un plancher dur, pas une espérance.
> - Une nouvelle mesure sous protocole propre — cache neutralisé, amorçage écarté — relève d'une décision humaine et n'a pas été relancée : elle se facture.
>
> *Ces réserves ont été ajoutées le 2026-08-28 après la revue adversariale de l'étape 4. Les mesures brutes du rapport n'ont pas été modifiées.*

> **Chaque chiffre porte sa méthode.** *(mesuré)* = chronométré par ce banc sur le
> fournisseur sous contrat. *(constaté)* = lu dans le code ou dans le corpus, sans
> chronomètre. *(estimé)* = calculé à partir d'un tarif ou d'une hypothèse nommée.
> Un chiffre sans méthode n'entre pas à ce rapport.

## Ce que ce banc ne mesure pas

**« paiement confirmé → première Scène écoutable »** — la cible du SPEC (p50 ≤ 30 s, p95 ≤ 60 s).

Ce délai vaut structurellement ZÉRO aujourd'hui : les deux premières Scènes d'une Visite payante sont écoutables sans paiement (FREE_PREVIEW_SCENE_COUNT = 2). S'y ajoute que le pipeline de fabrication n'existe pas encore (stories 9 à 14) et que la chaîne actuelle transite par le navigateur du guide puis par une approbation humaine de durée non bornée. Un chiffre produit ici serait un chiffre trompeur ; ce rapport nomme les postes à la place.

## Protocole

- **Séquentiel.** Une requête à la fois. `_INFERENCE_EXECUTOR(max_workers=1)` sérialise toute inférence (local_server.py:136-141) et `GET /v1/jobs/{id}` n'expose ni `created_at` ni `started_at` : le temps d'attente en file n'est pas soustractible de l'extérieur. Toute mesure concurrente mélangerait inférence et file.
- **Résolution de la mesure :** 0,40 s *(constaté)*.
- **Lecture seule.** Quatre routes du microservice seulement : /health, /v1/translate/batch, /v1/tts/generate, /v1/jobs/{id}. Aucun SDK AWS n'est importé. Les octets audio rendus sont mesurés puis jetés.
- **Corpus source :** `C:\Projects\Bmad\TourGuideWeb\content\translations\source`
- **Corpus traduit :** `C:\Projects\Bmad\TourGuideWeb\content\translations\out`

## Les deux cibles

Corpus : 101 *(constaté)* Visites, 762 *(constaté)* Scènes, Scène médiane 1 148,00 car. *(constaté)*, min 922 car. *(constaté)*, max 7 308 car. *(constaté)*.

### Visite médiane — Reims — La ville-manifeste, reconstruite en Art déco

`seed-100-reims-art-deco-renaissance` — Reims, 8 *(constaté)* Scènes, 8 968 car. *(constaté)*.

### Visite hors norme — Grasse — Les Routes du Parfum

`78e3f3cc-7c1d-4a88-a274-8690e9411fc2` — Grasse, 7 *(constaté)* Scènes, 44 857 car. *(constaté)*.

Scène mesurée : `5476cf5b-ce08-4fd3-9ea1-67cef1335b58`, 7 308 car. *(constaté)* — 6,40 × *(constaté)* la médiane du corpus. Facturables en français : 7 308 car. *(constaté)*, soit 81,20 % *(constaté)* du plafond de 9 000 car. *(constaté)*.

**Singularité.** Ce n'est PAS « une Visite ordinaire avec une Scène longue » : ses Scènes les plus longues lui appartiennent toutes, et c'est la seule Visite hors seed du corpus. Ce qu'elle mesure ne se généralise pas au catalogue. Hors seed : `True` — 1 *(constaté)* Visite(s) hors seed dans tout le corpus. Possède les 7 *(constaté)* Scènes les plus longues du corpus : `True`. La plus longue Scène qui ne lui appartient pas fait 2 327 car. *(constaté)*.

## Profil par langue — corpus, pas chronomètre

| Langue | Visite médiane | Expansion vs fr | Coût synthèse | Scène hors norme (facturables) | Part du plafond |
|---|---|---|---|---|---|
| fr (source) | 8 968 car. *(constaté)* | — | 0,14 USD *(estimé)* | — | — |
| en | 8 743 car. *(constaté)* | 0,97 *(constaté)* | 0,14 USD *(estimé)* | 6 986 car. *(constaté)* | 77,60 % *(constaté)* |
| es | 8 700 car. *(constaté)* | 0,97 *(constaté)* | 0,14 USD *(estimé)* | 6 978 car. *(constaté)* | 77,50 % *(constaté)* |
| de | 9 704 car. *(constaté)* | 1,08 *(constaté)* | 0,16 USD *(estimé)* | 7 596 car. *(constaté)* | 84,40 % *(constaté)* |
| it | 8 697 car. *(constaté)* | 0,97 *(constaté)* | 0,14 USD *(estimé)* | 6 959 car. *(constaté)* | 77,30 % *(constaté)* |
| nl | 9 238 car. *(constaté)* | 1,03 *(constaté)* | 0,15 USD *(estimé)* | 7 107 car. *(constaté)* | 79,00 % *(constaté)* |

## Postes mesurés

Fournisseur : `azure`. Avant la série — jobs en vol 0 *(mesuré)*, cache 0 *(mesuré)*. Après — jobs en vol 0 *(mesuré)*, cache 972 *(mesuré)*. Contre-pression 429 : 0 *(mesuré)*. Erreurs 5xx : 0 *(mesuré)*.

Routes appelées : `GET /health`, `GET /v1/jobs/{id}`, `POST /v1/translate/batch`, `POST /v1/tts/generate`. Aucune écriture DynamoDB, aucune écriture S3 — le banc ne connaît aucune autre adresse.

### Démarrage à froid — exclu de tout percentile

Premier appel d'une paire, modèles non chargés. Poste DISTINCT, EXCLU de tout percentile. Une paire pivotée fait charger deux modèles.

| Paire | Pivot | Modèles chargés par cet appel | Durée |
|---|---|---|---|
| fr→de | — | fr-de | 14,06 s *(mesuré)* |
| fr→en | — | fr-en | 3,89 s *(mesuré)* |
| fr→es | — | fr-es | 4,47 s *(mesuré)* |
| fr→it | en | en-it | 4,61 s *(mesuré)* |

### Poste 1 — Traduction *(provisoire)*

Moteur : MarianMT (local_server.py — MARIAN_MODELS). La story 4 remplace ce moteur par un modèle de langue. Cette mesure vaut pour le moteur du jour où elle a été prise. Mesure prise le 2026-08-28.

**Paire directe fr→de**

| Grandeur | Valeur |
|---|---|
| p50 s | 3,78 s *(mesuré)* |
| p95 s | 16,52 s *(mesuré)* |
| max s | 23,89 s *(mesuré)* |
| ms par caractere | 3,38 ms/car. *(mesuré)* |
| chars total | 16 276 car. *(constaté)* |
| total s | 55,06 s *(mesuré)* |
| taux aboutissement | 100,00 % *(mesuré)* |
| n abouties | 9 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

**Paire directe fr→en**

| Grandeur | Valeur |
|---|---|
| p50 s | 3,78 s *(mesuré)* |
| p95 s | 16,96 s *(mesuré)* |
| max s | 24,34 s *(mesuré)* |
| ms par caractere | 3,44 ms/car. *(mesuré)* |
| chars total | 16 276 car. *(constaté)* |
| total s | 55,94 s *(mesuré)* |
| taux aboutissement | 100,00 % *(mesuré)* |
| n abouties | 9 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

**Paire directe fr→es**

| Grandeur | Valeur |
|---|---|
| p50 s | 4,64 s *(mesuré)* |
| p95 s | 18,78 s *(mesuré)* |
| max s | 26,83 s *(mesuré)* |
| ms par caractere | 3,93 ms/car. *(mesuré)* |
| chars total | 16 276 car. *(constaté)* |
| total s | 63,91 s *(mesuré)* |
| taux aboutissement | 100,00 % *(mesuré)* |
| n abouties | 9 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

**Paire pivotée fr→it (pivot : en)**

| Grandeur | Valeur |
|---|---|
| p50 s | 8,00 s *(mesuré)* |
| p95 s | 36,18 s *(mesuré)* |
| max s | 51,62 s *(mesuré)* |
| ms par caractere | 7,33 ms/car. *(mesuré)* |
| chars total | 16 276 car. *(constaté)* |
| total s | 119,33 s *(mesuré)* |
| taux aboutissement | 100,00 % *(mesuré)* |
| n abouties | 9 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

> Chronométrée À PART des paires directes : deux inférences au lieu d'une, la comparer aux directes serait comparer deux choses.

### Poste 2 — Synthèse

Fournisseur : `azure`. Langue synthétisée : `de` — le texte de la langue cible, celui qu'une fabrication réelle envoie au fournisseur.

**Visite médiane**

| Grandeur | Valeur |
|---|---|
| p50 s | 4,63 s *(mesuré)* |
| p95 s | 6,36 s *(mesuré)* |
| max s | 6,38 s *(mesuré)* |
| ms par caractere | 4,05 ms/car. *(mesuré)* |
| chars total | 9 704 car. *(constaté)* |
| total s | 39,27 s *(mesuré)* |
| taux aboutissement | 100,00 % *(mesuré)* |
| n abouties | 8 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères facturés |

**Scène hors norme**

| Grandeur | Valeur |
|---|---|
| p50 s | 26,39 s *(mesuré)* |
| p95 s | 26,39 s *(mesuré)* |
| max s | 26,39 s *(mesuré)* |
| ms par caractere | 3,47 ms/car. *(mesuré)* |
| chars total | 7 596 car. *(constaté)* |
| total s | 26,39 s *(mesuré)* |
| taux aboutissement | 100,00 % *(mesuré)* |
| n abouties | 1 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères facturés |

Coût de la série : 0,28 USD *(estimé)*.

## Postes constatés — réels, non mesurables aujourd'hui

Ces coûts domineraient le vécu du visiteur bien avant le temps fournisseur. Les taire
produirait un plancher rassurant et faux ; les mesurer est impossible aujourd'hui. Les
nommer avec leur anchor est ce qui fait de ce rapport une donnée de conception.

### Sondage du portail à 15 s — 15,00 s *(constaté)*

`TourGuideWeb/src/lib/stores/tts-store.ts:7` (vérifié)

- **Pourquoi non mesurable :** Purement paramétrique : la valeur ne dépend d'aucun fournisseur et se lit dans le code. La mesurer reviendrait à mesurer une constante.
- **Portée :** Un réglage, pas un chantier. Le SPEC vise p50 ≤ 30 s ; ce seul poste en consomme la moitié en espérance.

### Miroir N Scènes × M langues, en série — 32 allers-retours AppSync *(estimé)*

`TourGuideWeb/src/lib/api/language-purchase.ts:818` (vérifié)

- **Pourquoi non mesurable :** Le pipeline de fabrication n'existe pas encore (stories 9 à 14) et cette boucle vit dans le portail du guide, pas dans le chemin visiteur. La chronométrer supposerait d'instrumenter du code de production.
- **Portée :** Chaque aller-retour AppSync coûte des dizaines à des centaines de millisecondes ; en série, l'addition est linéaire en N×M.

### Deux Scènes gratuites avant tout paiement — 2 Scènes *(constaté)*

`TourGuideApp/amplify/functions/get-published-tour-content/handler.ts:28` (vérifié)

- **Pourquoi non mesurable :** Ce n'est pas une durée. C'est la RAISON pour laquelle le délai « paiement → première Scène écoutable » vaut structurellement zéro aujourd'hui : le visiteur écoute avant d'avoir payé.
- **Portée :** Tant que cette constante vaut 2, la cible p50 ≤ 30 s ne porte sur rien d'observable. Elle deviendra mesurable quand la fabrication à la demande conditionnera l'écoute.

### Approbation humaine dans la chaîne actuelle — durée NON BORNÉE — aucun majorant n'existe

`TourGuideWeb/src/lib/api/moderation.ts:670` (vérifié)

- **Pourquoi non mesurable :** Une durée humaine n'a pas de p95. La chronométrer produirait la disponibilité d'une personne, pas le coût d'une fabrication. La chaîne actuelle transite par le navigateur du guide, puis attend cette approbation avant qu'une narration soit publiée.
- **Portée :** Le pipeline des stories 9 à 14 retire ce poste par construction.

