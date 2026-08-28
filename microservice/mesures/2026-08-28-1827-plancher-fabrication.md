# Plancher de fabrication — traduction et synthèse

*Story 8 — Banc de mesure du plancher de fabrication — rapport du 2026-08-28T18:27:29+02:00.*

> **Chaque chiffre porte sa méthode.** *(mesuré)* = chronométré par ce banc sur le
> fournisseur sous contrat. *(constaté)* = lu dans le code ou dans le corpus, sans
> chronomètre. *(estimé)* = calculé à partir d'un tarif ou d'une hypothèse nommée.
> Un chiffre sans méthode n'entre pas à ce rapport.

## Ce que ce banc ne mesure pas

**« paiement confirmé → première Scène écoutable »** — la cible du SPEC (p50 ≤ 30 s, p95 ≤ 60 s).

Ce délai vaut structurellement ZÉRO aujourd'hui : les deux premières Scènes d'une Visite payante sont écoutables sans paiement (FREE_PREVIEW_SCENE_COUNT = 2). S'y ajoute que le pipeline de fabrication n'existe pas encore (stories 9 à 14) et que la chaîne actuelle transite par le navigateur du guide puis par une approbation humaine de durée non bornée. Un chiffre produit ici serait un chiffre trompeur ; ce rapport nomme les postes à la place.

## Conclusion — le plancher face aux cibles du SPEC

Chaîne mesurée : `fr→de`, traduction puis synthèse, en séquentiel.

### Première Scène d'une langue neuve — la chaîne réelle

Scène #0 : traduction 5,47 s *(mesuré)* + synthèse 2,2 s *(mesuré)* = **7,67 s *(mesuré)***.

- Contre la cible p50 ≤ 30 s : **tient**.
- Avec le sondage du portail : 22,67 s *(estimé)* → **tient**.

> somme de deux mesures prises sur la MÊME Scène #0, chaînées comme le ferait une fabrication séquentielle

### Enveloppe par percentile

| Niveau | Traduction | Synthèse | Total | Cible | Verdict | + sondage 15 s | Verdict |
|---|---|---|---|---|---|---|---|
| p50 | 3,99 s *(mesuré)* | 1,55 s *(mesuré)* | 5,54 s *(estimé)* | 30 s *(constaté)* | **tient** | 20,54 s *(estimé)* | **tient** |
| p95 | 5,33 s *(mesuré)* | 2,04 s *(mesuré)* | 7,37 s *(estimé)* | 60 s *(constaté)* | **tient** | 22,37 s *(estimé)* | **tient** |

> somme des p50 de deux postes — ce n'est pas le p50 de la somme, qui demanderait de chaîner les deux mesures Scène par Scène.

### Scène hors norme

Traduction 22,69 s *(mesuré)* + synthèse 2,89 s *(mesuré)* = **25,58 s *(mesuré)*** — contre p50 : **tient de justesse** ; contre p95 : **tient**. Avec le sondage : 40,58 s *(estimé)*.

> une seule Scène, mesurée une fois : une valeur, pas une distribution

## Agrégat — ce que coûte une Visite entière

Périmètre : Visite médiane × 4 langues, en séquentiel.

| Poste | Durée |
|---|---|
| traduction fr→de | 32 s *(mesuré)* |
| traduction fr→en | 31,56 s *(mesuré)* |
| traduction fr→es | 38,3 s *(mesuré)* |
| traduction fr→it | 69,73 s *(mesuré)* |
| **traduction, total** | 171,59 s *(mesuré)* |
| synthèse de | 12,78 s *(mesuré)* |
| synthèse en | 11,52 s *(estimé)* |
| synthèse es | 11,46 s *(estimé)* |
| synthèse it | 11,45 s *(estimé)* |
| **synthèse, total** | 47,21 s *(estimé)* |
| démarrages à froid | 11,42 s *(mesuré)* |
| **TOTAL** | 230,22 s *(estimé)* — soit 3,84 min *(estimé)* |

> traduction mesurée + synthèse mise à l'échelle + démarrages à froid ; hors sondage du portail et hors miroir AppSync, qui s'y ajoutent.
> Les démarrages à froid : coût unique par service démarré, pas par Visite.

## Protocole

- **Séquentiel.** Une requête à la fois. `_INFERENCE_EXECUTOR(max_workers=1)` sérialise toute inférence (local_server.py:136-141) et `GET /v1/jobs/{id}` n'expose ni `created_at` ni `started_at` : le temps d'attente en file n'est pas soustractible de l'extérieur. Toute mesure concurrente mélangerait inférence et file.
- **Résolution de la mesure :** 0,4 s *(constaté)*.
- **Lecture seule.** Quatre routes du microservice seulement. Les routes inscrites plus bas sont OBSERVÉES par un crochet HTTP, pas déclarées. Aucun SDK AWS n'est importé. Les octets audio rendus sont mesurés puis jetés.
- **Corpus source :** `C:\Projects\Bmad\TourGuideWeb\content\translations\source`
- **Corpus traduit :** `C:\Projects\Bmad\TourGuideWeb\content\translations\out`

**Hypothèses que ce rapport porte sans les mesurer :**

- Le plafond de facturation (9000 caractères) est lu dans l'environnement DU BANC, via `services.tts_azure.MAX_BILLABLE_CHARS`. Si le service mesuré tourne avec un autre `AZURE_MAX_CHARS`, c'est le sien qui s'applique, et ce rapport annonce alors un plafond qui n'est pas celui-là.
- Une seconde limite, indépendante, s'applique en amont : `TTSRequest.text` est borné à 10000 caractères BRUTS. Sur un texte sans balisage, c'est elle qui se déclenche la première.
- Le tarif de synthèse (16 $/M) n'est pas mesuré : il vient de l'addendum du PRD §2, tarif relevé le 2026-08-22.

## Les deux cibles

Corpus : 101 *(constaté)* Visites, 762 *(constaté)* Scènes.

| Distribution | min | médiane | max |
|---|---|---|---|
| par Scène | 922 car. *(constaté)* | 1 148 car. *(constaté)* | 7 308 car. *(constaté)* |
| par Visite | 5 975 car. *(constaté)* | 8 968 car. *(constaté)* | 44 857 car. *(constaté)* |

> c'est cette distribution-là, et non celle par Scène, qui porte le coût de fabrication d'une Visite.

### Visite médiane — Reims — La ville-manifeste, reconstruite en Art déco

`seed-100-reims-art-deco-renaissance` — Reims, 8 *(constaté)* Scènes, 8 968 car. *(constaté)*.

**Médianité vérifiée :** `True` — rang 50 *(constaté)* sur 101 *(constaté)* Visites (50 % *(constaté)*), pour une médiane de corpus de 8 968 car. *(constaté)*, soit 1 × *(constaté)*. La médianité de cette cible est DÉRIVÉE du corpus à chaque exécution, pas recopiée de la story.

### Visite hors norme — Grasse — Les Routes du Parfum

`78e3f3cc-7c1d-4a88-a274-8690e9411fc2` — Grasse, 7 *(constaté)* Scènes, 44 857 car. *(constaté)* — soit 5 × *(constaté)* la Visite médiane.

Scène mesurée : `5476cf5b-ce08-4fd3-9ea1-67cef1335b58`, 7 308 car. *(constaté)* — 6,4 × *(constaté)* la Scène médiane du corpus, soit 81,2 % *(constaté)* du plafond de 9 000 car. *(constaté)*.

**Singularité.** Ce n'est PAS « une Visite ordinaire avec une Scène longue ». Ses Scènes les plus longues lui appartiennent toutes, c'est la seule Visite hors seed du corpus, et la VISITE elle-même pèse plusieurs fois la Visite médiane (voir l'écart ci-dessus). Ce qu'elle mesure ne se généralise pas au catalogue. Hors seed : `True` — 1 *(constaté)* Visite(s) hors seed dans tout le corpus. Possède les 7 *(constaté)* Scènes les plus longues du corpus : `True`. La plus longue Scène qui ne lui appartient pas fait 2 327 car. *(constaté)*.

> une seule des 7 Scènes de cette Visite est mesurée : le coût de la Visite entière ne s'en déduit pas par simple multiplication.

## Profil par langue — corpus, pas chronomètre

| Langue | Visite médiane | Expansion | Coût synthèse | Scène hors norme | Part du plafond | Traduisible | Synthétisable |
|---|---|---|---|---|---|---|---|
| fr (source) | 8 968 car. *(constaté)* | 1 *(constaté)* | 0,14 USD *(estimé)* | 7 308 car. *(constaté)* | 81,2 % *(constaté)* | `True` | `True` |
| en | 8 743 car. *(constaté)* | 0,97 *(constaté)* | 0,14 USD *(estimé)* | 6 986 car. *(constaté)* | 77,6 % *(constaté)* | `True` | `True` |
| es | 8 700 car. *(constaté)* | 0,97 *(constaté)* | 0,14 USD *(estimé)* | 6 978 car. *(constaté)* | 77,5 % *(constaté)* | `True` | `True` |
| de | 9 704 car. *(constaté)* | 1,08 *(constaté)* | 0,16 USD *(estimé)* | 7 596 car. *(constaté)* | 84,4 % *(constaté)* | `True` | `True` |
| it | 8 697 car. *(constaté)* | 0,97 *(constaté)* | 0,14 USD *(estimé)* | 6 959 car. *(constaté)* | 77,3 % *(constaté)* | `True` | `True` |
| nl | 9 238 car. *(constaté)* | 1,03 *(constaté)* | 0,15 USD *(estimé)* | 7 107 car. *(constaté)* | 79 % *(constaté)* | `False` | `True` |

> Les deux API du microservice n'acceptent pas les mêmes langues. Traduction : ['de', 'en', 'es', 'fr', 'it']. Synthèse : ['de', 'en', 'es', 'fr', 'it', 'ja', 'ko', 'nl', 'ru', 'zh']. `nl` est donc synthétisable mais PAS traduisible par ce service — son corpus vient d'ailleurs. `ja`, `ko` et `zh` sont synthétisables et absents du corpus ; le jour où ils y entreront, la règle des idéogrammes comptés double (voir `billed_characters`) doublera leur ligne de coût.

> **Coût :** Azure Neural standard, 16 $/M caractères (addendum du PRD §2, tarif relevé le 2026-08-22). Coût de la synthèse SI cette langue était fabriquée — la série n'a mesuré qu'une seule langue.

## Postes mesurés

Fournisseur : `azure`. Avant la série — jobs en vol 0 *(mesuré)*, cache 0 *(mesuré)*. Après — jobs en vol 0 *(mesuré)*, cache 0 *(mesuré)*. Contre-pression 429 : 0 *(mesuré)*. Erreurs 5xx : 0 *(mesuré)*. Soumissions abandonnées : 0 *(mesuré)*.

**Cache de traduction : neutralisé.** 972 *(mesuré)* phrases distinctes soumises pour un delta de 0 entrées *(mesuré)*. Le cache n'a rien retenu : `TRANSLATION_CACHE_MAX=0` a bien été posé. Chaque phrase a payé son inférence.

Routes appelées (observées) : `GET /health`, `GET /v1/jobs/{id}`, `POST /v1/translate/batch`, `POST /v1/tts/generate`. Aucune écriture DynamoDB, aucune écriture S3 — le banc ne connaît aucune autre adresse.

**Amorçage écarté :** 13,95 s *(mesuré)* sur `fr→de`. Éveil du processus (imports paresseux, pool d'inférence). Jeté : il n'appartient ni au démarrage à froid d'une paire ni à la série.

### Démarrage à froid — exclu de tout percentile

Premier appel d'une paire, modèles non chargés. Poste DISTINCT, EXCLU de tout percentile. Une paire pivotée fait charger deux modèles. Un amorçage jeté précède la boucle : sans lui, la première paire payait l'éveil du processus et sortait du lot d'un facteur trois ou quatre.

| Paire | Pivot | Modèles chargés par cet appel | Durée |
|---|---|---|---|
| fr→de | — | — | 0,44 s *(mesuré)* |
| fr→en | — | fr-en | 3,22 s *(mesuré)* |
| fr→es | — | fr-es | 3,67 s *(mesuré)* |
| fr→it | en | en-it | 4,09 s *(mesuré)* |

### Poste 1 — Traduction *(provisoire)*

Moteur : MarianMT (local_server.py — MARIAN_MODELS). La story 4 remplace ce moteur par un modèle de langue. Cette mesure vaut pour le moteur du jour où elle a été prise. Mesure prise le 2026-08-28.

**Paire directe fr→de — Visite médiane**

| Grandeur | Valeur |
|---|---|
| p50 s | 3,99 s *(mesuré)* |
| p95 s | 5,33 s *(mesuré)* |
| max s | 5,47 s *(mesuré)* |
| ms par caractere | 3,57 ms/car. *(mesuré)* |
| chars total | 8 968 car. *(constaté)* |
| total s | 32 s *(mesuré)* |
| taux aboutissement | 100 % *(mesuré)* |
| n abouties | 8 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

- *ms par caractere* : somme des durées / somme des caractères de la base ci-dessus
- *n limites* : plafond atteint — limite, pas panne
- **Réserve :** n = 8, chaque Scène mesurée une seule fois. Les percentiles décrivent la variation de LONGUEUR des Scènes, pas la dispersion des latences du fournisseur — qui demanderait des répétitions.

**Paire directe fr→de — Scène hors norme**

| Grandeur | Valeur |
|---|---|
| p50 s | 22,69 s *(mesuré)* |
| p95 s | 22,69 s *(mesuré)* |
| max s | 22,69 s *(mesuré)* |
| ms par caractere | 3,1 ms/car. *(mesuré)* |
| chars total | 7 308 car. *(constaté)* |
| total s | 22,69 s *(mesuré)* |
| taux aboutissement | 100 % *(mesuré)* |
| n abouties | 1 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

- *ms par caractere* : somme des durées / somme des caractères de la base ci-dessus
- *n limites* : plafond atteint — limite, pas panne
- **Réserve :** n = 1 : p50, p95 et max sont la même et unique mesure. Ce n'est pas une distribution.

**Paire directe fr→en — Visite médiane**

| Grandeur | Valeur |
|---|---|
| p50 s | 3,78 s *(mesuré)* |
| p95 s | 5,44 s *(mesuré)* |
| max s | 5,86 s *(mesuré)* |
| ms par caractere | 3,52 ms/car. *(mesuré)* |
| chars total | 8 968 car. *(constaté)* |
| total s | 31,56 s *(mesuré)* |
| taux aboutissement | 100 % *(mesuré)* |
| n abouties | 8 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

- *ms par caractere* : somme des durées / somme des caractères de la base ci-dessus
- *n limites* : plafond atteint — limite, pas panne
- **Réserve :** n = 8, chaque Scène mesurée une seule fois. Les percentiles décrivent la variation de LONGUEUR des Scènes, pas la dispersion des latences du fournisseur — qui demanderait des répétitions.

**Paire directe fr→en — Scène hors norme**

| Grandeur | Valeur |
|---|---|
| p50 s | 23,45 s *(mesuré)* |
| p95 s | 23,45 s *(mesuré)* |
| max s | 23,45 s *(mesuré)* |
| ms par caractere | 3,21 ms/car. *(mesuré)* |
| chars total | 7 308 car. *(constaté)* |
| total s | 23,45 s *(mesuré)* |
| taux aboutissement | 100 % *(mesuré)* |
| n abouties | 1 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

- *ms par caractere* : somme des durées / somme des caractères de la base ci-dessus
- *n limites* : plafond atteint — limite, pas panne
- **Réserve :** n = 1 : p50, p95 et max sont la même et unique mesure. Ce n'est pas une distribution.

**Paire directe fr→es — Visite médiane**

| Grandeur | Valeur |
|---|---|
| p50 s | 4,63 s *(mesuré)* |
| p95 s | 6,28 s *(mesuré)* |
| max s | 6,72 s *(mesuré)* |
| ms par caractere | 4,27 ms/car. *(mesuré)* |
| chars total | 8 968 car. *(constaté)* |
| total s | 38,3 s *(mesuré)* |
| taux aboutissement | 100 % *(mesuré)* |
| n abouties | 8 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

- *ms par caractere* : somme des durées / somme des caractères de la base ci-dessus
- *n limites* : plafond atteint — limite, pas panne
- **Réserve :** n = 8, chaque Scène mesurée une seule fois. Les percentiles décrivent la variation de LONGUEUR des Scènes, pas la dispersion des latences du fournisseur — qui demanderait des répétitions.

**Paire directe fr→es — Scène hors norme**

| Grandeur | Valeur |
|---|---|
| p50 s | 26,05 s *(mesuré)* |
| p95 s | 26,05 s *(mesuré)* |
| max s | 26,05 s *(mesuré)* |
| ms par caractere | 3,56 ms/car. *(mesuré)* |
| chars total | 7 308 car. *(constaté)* |
| total s | 26,05 s *(mesuré)* |
| taux aboutissement | 100 % *(mesuré)* |
| n abouties | 1 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

- *ms par caractere* : somme des durées / somme des caractères de la base ci-dessus
- *n limites* : plafond atteint — limite, pas panne
- **Réserve :** n = 1 : p50, p95 et max sont la même et unique mesure. Ce n'est pas une distribution.

**Paire pivotée fr→it (pivot : en) — Visite médiane**

| Grandeur | Valeur |
|---|---|
| p50 s | 8,18 s *(mesuré)* |
| p95 s | 12,12 s *(mesuré)* |
| max s | 13 s *(mesuré)* |
| ms par caractere | 7,78 ms/car. *(mesuré)* |
| chars total | 8 968 car. *(constaté)* |
| total s | 69,73 s *(mesuré)* |
| taux aboutissement | 100 % *(mesuré)* |
| n abouties | 8 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

- *ms par caractere* : somme des durées / somme des caractères de la base ci-dessus
- *n limites* : plafond atteint — limite, pas panne
- **Réserve :** n = 8, chaque Scène mesurée une seule fois. Les percentiles décrivent la variation de LONGUEUR des Scènes, pas la dispersion des latences du fournisseur — qui demanderait des répétitions.

**Paire pivotée fr→it — Scène hors norme**

| Grandeur | Valeur |
|---|---|
| p50 s | 51,22 s *(mesuré)* |
| p95 s | 51,22 s *(mesuré)* |
| max s | 51,22 s *(mesuré)* |
| ms par caractere | 7,01 ms/car. *(mesuré)* |
| chars total | 7 308 car. *(constaté)* |
| total s | 51,22 s *(mesuré)* |
| taux aboutissement | 100 % *(mesuré)* |
| n abouties | 1 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères source |

- *ms par caractere* : somme des durées / somme des caractères de la base ci-dessus
- *n limites* : plafond atteint — limite, pas panne
- **Réserve :** n = 1 : p50, p95 et max sont la même et unique mesure. Ce n'est pas une distribution.

> Chronométrée À PART des paires directes : deux inférences au lieu d'une, la comparer aux directes serait comparer deux choses.

**Détail par Scène**

*fr→de*

| Scène | Caractères | Durée | Issue |
|---|---|---|---|
| #0 | 1 516 car. *(constaté)* | 5,47 s *(mesuré)* | aboutie |
| #1 | 1 021 car. *(constaté)* | 4,19 s *(mesuré)* | aboutie |
| #2 | 977 car. *(constaté)* | 2,53 s *(mesuré)* | aboutie |
| #3 | 998 car. *(constaté)* | 3,8 s *(mesuré)* | aboutie |
| #4 | 1 013 car. *(constaté)* | 3,38 s *(mesuré)* | aboutie |
| #5 | 980 car. *(constaté)* | 4,2 s *(mesuré)* | aboutie |
| #6 | 1 008 car. *(constaté)* | 3,38 s *(mesuré)* | aboutie |
| #7 | 1 455 car. *(constaté)* | 5,06 s *(mesuré)* | aboutie |
| #1 | 7 308 car. *(constaté)* | 22,69 s *(mesuré)* | aboutie |

*fr→en*

| Scène | Caractères | Durée | Issue |
|---|---|---|---|
| #0 | 1 516 car. *(constaté)* | 5,86 s *(mesuré)* | aboutie |
| #1 | 1 021 car. *(constaté)* | 3,8 s *(mesuré)* | aboutie |
| #2 | 977 car. *(constaté)* | 2,97 s *(mesuré)* | aboutie |
| #3 | 998 car. *(constaté)* | 3,78 s *(mesuré)* | aboutie |
| #4 | 1 013 car. *(constaté)* | 3,77 s *(mesuré)* | aboutie |
| #5 | 980 car. *(constaté)* | 3,78 s *(mesuré)* | aboutie |
| #6 | 1 008 car. *(constaté)* | 2,95 s *(mesuré)* | aboutie |
| #7 | 1 455 car. *(constaté)* | 4,66 s *(mesuré)* | aboutie |
| #1 | 7 308 car. *(constaté)* | 23,45 s *(mesuré)* | aboutie |

*fr→es*

| Scène | Caractères | Durée | Issue |
|---|---|---|---|
| #0 | 1 516 car. *(constaté)* | 6,72 s *(mesuré)* | aboutie |
| #1 | 1 021 car. *(constaté)* | 5,08 s *(mesuré)* | aboutie |
| #2 | 977 car. *(constaté)* | 3,78 s *(mesuré)* | aboutie |
| #3 | 998 car. *(constaté)* | 4,2 s *(mesuré)* | aboutie |
| #4 | 1 013 car. *(constaté)* | 4,2 s *(mesuré)* | aboutie |
| #5 | 980 car. *(constaté)* | 5,06 s *(mesuré)* | aboutie |
| #6 | 1 008 car. *(constaté)* | 3,8 s *(mesuré)* | aboutie |
| #7 | 1 455 car. *(constaté)* | 5,45 s *(mesuré)* | aboutie |
| #1 | 7 308 car. *(constaté)* | 26,05 s *(mesuré)* | aboutie |

*fr→it*

| Scène | Caractères | Durée | Issue |
|---|---|---|---|
| #0 | 1 516 car. *(constaté)* | 13 s *(mesuré)* | aboutie |
| #1 | 1 021 car. *(constaté)* | 8,83 s *(mesuré)* | aboutie |
| #2 | 977 car. *(constaté)* | 6,73 s *(mesuré)* | aboutie |
| #3 | 998 car. *(constaté)* | 7,97 s *(mesuré)* | aboutie |
| #4 | 1 013 car. *(constaté)* | 7,58 s *(mesuré)* | aboutie |
| #5 | 980 car. *(constaté)* | 8,39 s *(mesuré)* | aboutie |
| #6 | 1 008 car. *(constaté)* | 6,73 s *(mesuré)* | aboutie |
| #7 | 1 455 car. *(constaté)* | 10,5 s *(mesuré)* | aboutie |
| #1 | 7 308 car. *(constaté)* | 51,22 s *(mesuré)* | aboutie |

### Poste 2 — Synthèse

Fournisseur : `azure`. Langue synthétisée : `de` — le texte de la langue cible, celui qu'une fabrication réelle envoie au fournisseur.

**Visite médiane**

| Grandeur | Valeur |
|---|---|
| p50 s | 1,55 s *(mesuré)* |
| p95 s | 2,04 s *(mesuré)* |
| max s | 2,2 s *(mesuré)* |
| ms par caractere | 1,32 ms/car. *(mesuré)* |
| facteur temps reel | 49,89 × *(mesuré)* |
| audio total ms | 637 695 ms *(mesuré)* |
| chars total | 9 704 car. *(constaté)* |
| total s | 12,78 s *(mesuré)* |
| taux aboutissement | 100 % *(mesuré)* |
| n abouties | 8 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères facturés |

- *ms par caractere* : somme des durées / somme des caractères de la base ci-dessus
- *facteur temps reel* : millisecondes d'audio produites par milliseconde de fabrication — au-dessus de 1, la fabrication va plus vite que l'écoute
- *n limites* : plafond atteint — limite, pas panne
- **Réserve :** n = 8, chaque Scène mesurée une seule fois. Les percentiles décrivent la variation de LONGUEUR des Scènes, pas la dispersion des latences du fournisseur — qui demanderait des répétitions.

**Scène hors norme**

| Grandeur | Valeur |
|---|---|
| p50 s | 2,89 s *(mesuré)* |
| p95 s | 2,89 s *(mesuré)* |
| max s | 2,89 s *(mesuré)* |
| ms par caractere | 0,38 ms/car. *(mesuré)* |
| facteur temps reel | 192,62 × *(mesuré)* |
| audio total ms | 556 865 ms *(mesuré)* |
| chars total | 7 596 car. *(constaté)* |
| total s | 2,89 s *(mesuré)* |
| taux aboutissement | 100 % *(mesuré)* |
| n abouties | 1 *(constaté)* |
| n echecs | 0 *(constaté)* |
| n limites | 0 *(constaté)* |
| base de normalisation | caractères facturés |

- *ms par caractere* : somme des durées / somme des caractères de la base ci-dessus
- *facteur temps reel* : millisecondes d'audio produites par milliseconde de fabrication — au-dessus de 1, la fabrication va plus vite que l'écoute
- *n limites* : plafond atteint — limite, pas panne
- **Réserve :** n = 1 : p50, p95 et max sont la même et unique mesure. Ce n'est pas une distribution.

**Détail par Scène**

*Visite médiane*

| Scène | Caractères | Durée | Audio | Issue |
|---|---|---|---|---|
| #0 | 1 649 car. *(mesuré)* | 2,2 s *(mesuré)* | 109 935 ms *(mesuré)* | aboutie |
| #1 | 1 118 car. *(mesuré)* | 1,38 s *(mesuré)* | 75 800 ms *(mesuré)* | aboutie |
| #2 | 1 097 car. *(mesuré)* | 1,31 s *(mesuré)* | 73 755 ms *(mesuré)* | aboutie |
| #3 | 1 095 car. *(mesuré)* | 1,75 s *(mesuré)* | 69 553 ms *(mesuré)* | aboutie |
| #4 | 1 094 car. *(mesuré)* | 1,33 s *(mesuré)* | 68 720 ms *(mesuré)* | aboutie |
| #5 | 1 088 car. *(mesuré)* | 1,34 s *(mesuré)* | 69 598 ms *(mesuré)* | aboutie |
| #6 | 1 007 car. *(mesuré)* | 1,72 s *(mesuré)* | 66 627 ms *(mesuré)* | aboutie |
| #7 | 1 556 car. *(mesuré)* | 1,75 s *(mesuré)* | 103 707 ms *(mesuré)* | aboutie |

*Scène hors norme*

| Scène | Caractères | Durée | Audio | Issue |
|---|---|---|---|---|
| #1 | 7 596 car. *(mesuré)* | 2,89 s *(mesuré)* | 556 865 ms *(mesuré)* | aboutie |

Coût de la série : 0,28 USD *(estimé)*.

## Postes constatés — réels, non mesurables aujourd'hui

Ces coûts domineraient le vécu du visiteur bien avant le temps fournisseur. Les taire
produirait un plancher rassurant et faux ; les mesurer est impossible aujourd'hui. Les
nommer avec leur anchor est ce qui fait de ce rapport une donnée de conception.

### Sondage du portail — plancher dur de 15 s — 15 s *(constaté)*

`TourGuideWeb/src/lib/stores/tts-store.ts:7` (vérifié)

- **Lecture du chiffre :** `startPolling` arme un `setInterval` SANS appel immédiat (tts-store.ts:62-85) : le premier sondage tombe à t+15 s quoi qu'il arrive. Ce n'est pas une espérance de 7,5 s — c'est un plancher dur, et tout ce qui suit est quantifié par multiples de 15 s.
- **Pourquoi non mesurable :** Purement paramétrique : la valeur ne dépend d'aucun fournisseur et se lit dans le code. La mesurer reviendrait à mesurer une constante.
- **Portée :** Un réglage, pas un chantier. Une fabrication qui aboutit en 9 s est annoncée au visiteur à 15 s ; une qui aboutit en 16 s l'est à 30 s — soit la cible p50 du SPEC consommée en entier par l'attente d'un timer.

### Miroir N Scènes × M langues, en série — 32 allers-retours AppSync *(estimé)*

`TourGuideWeb/src/lib/api/language-purchase.ts:818` (vérifié)

- **Lecture du chiffre :** Reims : 8 Scènes × 4 langues traduites, un `listSegmentsByScene` attendu par Scène et par langue, en série
- **Pourquoi non mesurable :** Le pipeline de fabrication n'existe pas encore (stories 9 à 14) et cette boucle vit dans le portail du guide, pas dans le chemin visiteur. La chronométrer supposerait d'instrumenter du code de production.
- **Portée :** Chaque aller-retour AppSync coûte des dizaines à des centaines de millisecondes ; en série, l'addition est linéaire en N×M.

### Deux Scènes gratuites avant tout paiement — 2 Scènes *(constaté)*

`TourGuideApp/amplify/functions/get-published-tour-content/handler.ts:28` (vérifié)

- **Lecture du chiffre :** écoutables sans achat sur une Visite payante
- **Pourquoi non mesurable :** Ce n'est pas une durée. C'est la RAISON pour laquelle le délai « paiement → première Scène écoutable » vaut structurellement zéro aujourd'hui : le visiteur écoute avant d'avoir payé.
- **Portée :** Tant que cette constante vaut 2, la cible p50 ≤ 30 s ne porte sur rien d'observable. Elle deviendra mesurable quand la fabrication à la demande conditionnera l'écoute.

### Approbation humaine dans la chaîne actuelle — durée NON BORNÉE — aucun majorant n'existe

`TourGuideWeb/src/lib/api/moderation.ts:670` (vérifié)

- **Pourquoi non mesurable :** Une durée humaine n'a pas de p95. La chronométrer produirait la disponibilité d'une personne, pas le coût d'une fabrication. La chaîne actuelle transite par le navigateur du guide, puis attend cette approbation avant qu'une narration soit publiée.
- **Portée :** Le pipeline des stories 9 à 14 retire ce poste par construction.

