# Synthèse vocale — fournisseur, coût, mode dégradé

## Deux fournisseurs, une frontière

`services/tts_provider.py` choisit, nomme et compte. Deux implémentations
derrière lui :

| | `azure` — sous contrat | `edge` — mode dégradé |
|---|---|---|
| Compte, conditions, licence commerciale | oui | **aucun** |
| SSML | honoré côté serveur | **non honoré** — contourné à la main |
| Appels par Scène | **1** | un par fragment de 2 000 caractères |
| Pauses `<break>` | rendues par le moteur | silences recollés par `pydub` |
| Palier haute définition | disponible | indisponible |

Le mode dégradé n'est pas une alternative : le SPEC le range en pis-aller —
« le service de synthèse gratuit n'est pas un plan de continuité ». Il est
journalisé en avertissement quand il sert, et **déclaré dans chaque réponse**
(`provider`), pour qu'aucune fabrication ne passe pour contractuelle sans l'être.

## Poser la clé

```bash
AZURE_SPEECH_KEY=…        # clé d'une ressource Azure AI Speech
AZURE_SPEECH_REGION=…     # ex. westeurope
TTS_VOICE_TIER=standard   # ou hd
```

Les deux premières suffisent : sans elles, le service démarre quand même, en
mode dégradé, en le disant. Rien ne se bloque — mais rien n'est sous contrat.

`TTS_PROVIDER=edge` force le mode dégradé **même avec une clé valide**. À
n'employer que délibérément, par exemple pendant un incident fournisseur.

## Ce que ça coûte

Chiffres de l'addendum du PRD (§2), sur le corpus réel : 4 207 430 caractères,
101 visites, 5 langues, ~60 h d'audio.

| Moteur | $/1M | Tout regénérer | Par visite (5 langues) |
|---|---:|---:|---:|
| **Azure Neural** (retenu) | 16 | 67 $ | **0,64 $** |
| Azure Neural HD | 22 | 93 $ | 0,88 $ |
| Amazon Polly Neural | 16 | 67 $ | 0,64 $ |
| Google Chirp 3 HD | 30 | 126 $ | 1,20 $ |
| Google Studio | 160 | 673 $ | 6,43 $ |
| ElevenLabs | abonnement | 770 – 990 $ | — |

**Les 67 $ sont un plafond théorique, pas la dépense attendue.** Le modèle est la
fabrication à la demande : une narration n'existe qu'une fois réclamée par une
acquisition payante, et sert ensuite tout le monde. On paie 0,64 $ par visite
effectivement achetée dans une langue, pas le catalogue entier.

### Deux détails de facturation qui comptent

- Azure facture **le balisage SSML**, à l'exception de `<speak>` et `<voice>`.
  Le corpus ne porte que 90 balises `<break>`, soit 0,2 % du volume : négligeable
  aujourd'hui.
- Les **idéogrammes comptent double**. Sans effet sur les six langues actuelles,
  décisif le jour de l'ouverture du japonais, du chinois ou du coréen.

Chaque réponse de synthèse porte `billed_characters`, calculé selon ces deux
règles. C'est la donnée que le pilotage des coûts (CAP-9) agrégera.

## Pourquoi les voix ne changent pas

`fr-FR-HenriNeural`, `en-US-GuyNeural`, `it-IT-DiegoNeural`, `de-DE-ConradNeural`,
`es-ES-AlvaroNeural` : ce sont **déjà** des voix Azure. L'endpoint gratuit et
l'offre payante servent les mêmes timbres. La bascule change le rendu — un appel
au lieu de vingt, les pauses rendues par le moteur — jamais l'identité vocale.
Un visiteur qui a déjà écouté une visite ne doit rien entendre de neuf.

Le palier `hd` change le timbre, lui — et davantage. Tranché à l'écoute le
2026-08-27 : **`standard` est retenu, `hd` écarté.** Le palier ne change pas que
le rendu, il change de LOCUTEUR — `fr-FR-VivienneMultilingualNeural` est féminine
là où le catalogue parle avec Henri, et le français serait la seule des cinq
langues au féminin. Le réglage reste, parce que rouvrir la question un jour
suppose de pouvoir écouter ; il n'est pas un défaut, et il ne doit pas le
devenir sans un choix de voix masculine française.

## Ce que la bascule a supprimé

~250 lignes de `local_server.py` ont déménagé dans `services/tts_edge.py`,
inchangées : analyseur SSML maison, découpage à 2 000 caractères, calcul de
couture entre fragments, trois reprises, garde-fou de 25 secondes contre les
WebSockets qui pendent.

Ce n'était pas du code de synthèse — c'était la compensation d'un endpoint qui
n'honore pas le SSML. Sous contrat, tout cela n'a plus d'objet. Le code n'a pas
été supprimé parce qu'il est laid, mais parce que **sa cause a disparu** ; il
reste intact dans un fichier qui dit ce qu'il est, tant que le mode dégradé
existe.

`normalize_loudness`, en revanche, reste sur les deux chemins : l'écart de niveau
entre deux Scènes consécutives ne doit pas dépasser 1 dB (CAP-5), et cela ne
dépend d'aucun fournisseur.

## Ce que coûte une fabrication — le banc du plancher

`bench_fabrication.py` mesure le **plancher** : le temps fournisseur
incompressible d'une fabrication, traduction et synthèse chronométrées
**séparément** et normalisées par caractère, sur le corpus réel (Reims — la
Visite médiane, 8 Scènes, 8 968 caractères ; Grasse — la Scène de 7 308
caractères) et sur le fournisseur **sous contrat**.

### Prérequis

Le banc ne se lance pas contre n'importe quel service. Il lui faut :

```bash
AZURE_SPEECH_KEY=…          # sans elle, /health répond tts_mode: edge -> refus
AZURE_SPEECH_REGION=…
MICROSERVICE_API_KEY=…      # la même que le service, sinon 401 sur chaque job
TRANSLATION_CACHE_MAX=0     # sinon le cache sert des traductions déjà faites
python -m uvicorn local_server:app --port 8000
```

### La garde d'entrée, en trois conditions

Le banc interroge `/health` et **s'arrête avec un code non nul** si :

| Condition | Pourquoi |
|---|---|
| `tts_mode != "azure"` | chronométrer le mode dégradé ne répond à aucune question |
| `inflight_jobs != 0` | la mesure inclurait une attente en file, non soustractible |
| `cache_size != 0` | une Scène déjà traduite reviendrait instantanément |
| une de ces clés absente | la garde porterait sur des valeurs par défaut |

`--cache-non-neutralise` lève la troisième — et **déclare alors la série NON
VALIDE** dans le rapport, avec un code de sortie 1. Ce n'est pas une
échappatoire silencieuse.

La garde ne voit que t0. Le banc compare donc aussi, en fin de série, le nombre
de phrases **distinctes** soumises au delta de `cache_size` : un delta inférieur
prouve des succès de cache, donc des durées sous-estimées.

### Emploi

```bash
python bench_fabrication.py --dry-run     # décrit les deux cibles, aucun appel
python bench_fabrication.py --sans-serie  # rapport sans dépense : constaté + estimé
python bench_fabrication.py               # série complète — exige la clé sous contrat
```

Le défaut `--langue-synthese de` n'est pas arbitraire : l'allemand est la langue
de **plus forte expansion** du corpus (1,08 × la source française, contre 0,97
pour l'anglais, l'espagnol et l'italien). Mesurer sur elle donne un quasi-pire
cas, donc un plancher prudent plutôt que flatteur.

### Rapports

Dans [`mesures/`](mesures/), datés et versionnés — un `.json` de données brutes
et un `.md` lisible. Le banc **n'écrase jamais** un rapport existant. Chaque
chiffre y porte sa méthode — `mesuré`, `constaté` ou `estimé` ; un chiffre sans
méthode n'y entre pas.

Dernier en date : [`2026-08-28-0908-plancher-fabrication.md`](mesures/2026-08-28-0908-plancher-fabrication.md)
— **lire d'abord ses réserves ajoutées après coup** : il a été produit avant la
revue de l'étape 4 et sous un protocole imparfait (cache armé, sans succès de
cache toutefois).

### Ce que le banc ne mesure PAS

**Le délai « paiement confirmé → première Scène écoutable ».** Il vaut
structurellement zéro aujourd'hui — les deux premières Scènes d'une Visite
payante sont écoutables sans paiement (`FREE_PREVIEW_SCENE_COUNT = 2`), le
pipeline de fabrication n'existe pas encore et la chaîne actuelle passe par une
approbation humaine de durée non bornée. Le rapport consigne à la place les
postes du budget qui ne sont pas mesurables, avec leur anchor : le sondage du
portail — un **plancher dur de 15 s**, `setInterval` sans appel immédiat —, le
miroir N Scènes × M langues en série, et les deux Scènes gratuites.

### Pourquoi le coût du banc n'est pas celui de l'addendum

Le banc annonce 0,14 à 0,16 USD pour **une** langue de la Visite médiane ; le
tableau ci-dessus annonce 0,64 $ par visite. Il n'y a pas de contradiction :
0,64 $ couvre **cinq** langues. Ramené à une, l'addendum donne
4 207 430 ÷ 101 ÷ 5 ≈ 8 332 caractères, soit **0,133 $**. Le banc mesure 0,16 $
sur Reims en allemand parce que ce couple-là pèse 9 704 caractères — une Visite
un peu au-dessus de la moyenne du catalogue, dans la langue de plus forte
expansion. Les deux chiffres viennent du même tarif, `16 $/M caractères`, relevé
le 2026-08-22 et jamais remesuré depuis.

Pour situer : la Visite médiane fait 8 968 caractères de source française, pour
une moyenne de 9 268 — la moyenne est tirée vers le haut par Grasse, cinq fois
la médiane à elle seule.
