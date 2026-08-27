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

Le palier `hd` change le timbre, lui. C'est pourquoi il est un réglage et non un
défaut : le SPEC demande de trancher **à l'écoute comparative sur une visite
réelle**, pas sur catalogue.

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
