# Conventions du catalogue Murmure

Ce fichier vaut pour toutes les visites de `content/tours/`. Les règles
chiffrées sont contrôlées par `node scripts/verifie-format-visites.mjs` :
si une règle n'est pas mesurée par ce script, c'est qu'elle manque au script.

## Structure d'une visite

```
content/tours/{slug}/
  tour.md                 — fiche : catalogue, POIs, fil rouge, points à vérifier, budgets
  pois.json               — géodonnées : position d'écoute, clé OSM, coordonnée résolue + provenance
  scenes/NN-slug.md       — une scène par POI, dans l'ordre de la marche
  archive/                — matière antérieure (narrations longues), jamais semée
```

## Voix

- **Tutoiement**, sans exception dans le corps des scènes. Le vouvoiement ne
  subsiste que dans la description catalogue du `tour.md`, qui s'adresse à un
  acheteur, pas à un marcheur.
- Voix basse, confidence. Un ami qui glisse un secret à l'oreille, pas un
  conférencier. Présent de narration, phrases courtes, rythme oral.
- **Un seul narrateur pour tout le catalogue.** Les personas de guides fictifs
  (Victor Lemaire, Isabelle Moretti, Thomas Bellini, Claire Duval, Elena
  Castellano) ont été retirés en 2026-09 : un narrateur qui se présente,
  raconte sa famille et signe à la fin fabriquait du témoignage.

## Budget

Débit de référence : **150 mots/minute**.

| Format | Mots | Durée parlée |
|---|---|---|
| POI standard | 150 à 225 | 60–90 s |
| POI « héros » — **2 par visite au maximum** | ≤ 300 | ≤ 2 min |
| Narration totale | — | ≤ 1/3 du temps de balade |

Les pauses SSML comptent dans la durée perçue mais pas dans le compte de mots.

## SSML

Seul `<break time="Xs"/>` est admis, 2 à 4 fois par scène, de 2 à 6 secondes.

Décision audio du 2026-05-18 : `<prosody>`, `<emphasis>` et `<say-as>` sonnent
saccadés sur edge-tts et sont désactivés au niveau de la toolbar. Le ton est
porté par l'écriture, pas par le balisage. Au-delà de 10 secondes, Azure
tronque la pause.

## Véracité

Décision du 2026-09 : **le catalogue ne publie que des visites à véracité
forte.** Concrètement :

- Aucune anecdote, aucun dialogue, aucune citation inventés. Une citation
  attribuée à une personne réelle doit être sourçable ; à défaut, elle est
  retirée, pas atténuée.
- Aucun témoin nommé qui n'a pas existé. Aucun narrateur qui garantit
  l'exactitude de ce qu'il raconte.
- Un fait incertain se formule prudemment dans la scène (« la légende raconte
  que… », « on dit que… ») **et** figure dans la section « Points à vérifier »
  du `tour.md`. Jamais en commentaire dans une scène : le TTS lirait tout.
- Une visite dont le matériau ne tient pas cette barre sort du lot. C'est ce
  qui est arrivé à *Crimes & Scandales de la Riviera* — voir
  `archive/crimes-scandales-riviera/POURQUOI-RETIREE.md`.

## Coordonnées

Une coordonnée sans provenance n'est pas une donnée. Chaque POI de `pois.json`
porte :

- `position` — l'endroit où se poster, en toutes lettres. Écrit à la main,
  jamais deviné : le centroïde d'une cathédrale tombe au milieu de la nef,
  alors que la scène se joue sur le parvis.
- `osm` — la clé de résolution (requête Nominatim et/ou nom Overpass).
- `lat` / `lng` / `precision` / `source` — écrits par
  `node scripts/resout-gps-pois.mjs --ecris`, avec le type et l'id de l'objet
  OSM. Tant qu'un POI n'a pas de `source`, la visite ne se sème pas.

## Itinéraire

- Parcours marchable continu, boucle ou ligne, sans traversée dangereuse ni
  impasse. 3 à 8 minutes de marche entre deux POIs.
- **La distance annoncée est la distance réelle.** Un marcheur à qui on promet
  2 km et qui en fait 5 abandonne, et le dit.
- Chaque scène se termine par une instruction de marche qui nomme la
  destination suivante : le marcheur n'a pas d'écran sous les yeux.
- Une visite doit tenir debout **porte close**. Un POI dont la scène n'a de
  sens qu'à l'intérieur d'un lieu payant ou à horaires restreints est signalé
  dans la description catalogue, et le parcours ne doit pas en dépendre pour
  plus de deux haltes.
