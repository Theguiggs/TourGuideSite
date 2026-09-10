# Grasse — Ombres & Légendes

**Ville :** Grasse
**Thématique :** Légendes et mystères — la face sombre de la ville-parfum
**Distance / durée :** ~1,3 km / ~50 min (descente du vieux Grasse vers le cours)
**POIs héros :** n° 1, n° 6
**Registre :** nocturne — se joue en fin de journée, à la tombée du jour
**Parcours frère :** [Grasse — Les Routes du Parfum](../grasse-routes-du-parfum/README.md) — même ville, lentille inverse

## Description catalogue (vouvoiement)

On vous a vendu Grasse comme la capitale du parfum. Ce soir, on vous raconte
l'autre ville. Celle des ruelles où l'eau du tannage n'a jamais séché, des
confréries encagoulées qui marchaient derrière les cercueils, des fontaines
que le folklore provençal disait habitées. Et celle où Patrick Süskind a
choisi de nouer le crime parfait de son roman. Six haltes et 1,3 kilomètre
dans le vieux Grasse, à la tombée du jour, pour comprendre une chose simple :
la ville qui sent le mieux au monde est celle qui a eu le plus à cacher.
Mettez vos écouteurs quand la lumière baisse.

## Thèmes

['légendes', 'histoire', 'nocturne']

## POIs

| # | Titre | Lat | Lng | Fichier | Précision | Desc (1 ligne) |
|---|-------|-----|-----|---------|-----------|----------------|
| 1 | Place aux Aires | — | — | 01-place-aux-aires-nuit.md | — | La place du marché aux fleurs, qui fut celle des tanneurs : la thèse posée d'entrée. |
| 2 | Rue Droite | — | — | 02-ruelle-tanneurs-peste.md | — | La ruelle médiévale du tannage, et la peste noire de 1348 combattue par l'odeur. |
| 3 | Cathédrale Notre-Dame-du-Puy | — | — | 03-penitents-noirs.md | — | Les confréries de pénitents, et la charge la plus lourde : escorter les morts. |
| 4 | Place du 24-Août | — | — | 04-masco-et-drac.md | — | L'eau habitée du folklore provençal : le Drac, et la masco qu'on brûlait pour son savoir. |
| 5 | Place du Cours — parvis du MIP | — | — | 05-le-parfum-assassin.md | — | Le crime parfait que Süskind a situé ici : l'enfleurage poussé jusqu'à son terme. |
| 6 | Cours Honoré Cresp — terrasse sud | — | — | 06-belvedere-nocturne.md | — | Le belvédère de clôture : les vivants au-dessus, les morts en contrebas, le parfum au milieu. |

Les coordonnées sont résolues contre OpenStreetMap par
`node scripts/resout-gps-pois.mjs --tour=grasse-ombres-et-legendes --ecris`,
qui écrit aussi la provenance (type et id de l'objet OSM) dans `pois.json`.
Tant qu'une ligne porte `—`, la visite ne doit pas être semée.

## Fil rouge narratif

Une seule thèse, filée de bout en bout : **la ville la plus parfumée du monde
est aussi celle qui a eu le plus à cacher — le parfum comme alibi, comme
masque, puis comme distillation de l'ombre.**

1. **Place aux Aires** — Sous le marché aux fleurs, les tanneurs. Le parfum né du besoin de masquer.
2. **Rue Droite** — La peur des miasmes, puis la peste de 1348 : on combat la mort par l'odeur.
3. **Cathédrale** — Les pénitents, ces hommes ordinaires qui escortaient ce que tout le monde fuyait.
4. **Place du 24-Août** — Le Drac et la masco : même savoir des plantes, anobli chez l'un, brûlé chez l'autre.
5. **Place du Cours** — Grenouille, le parfumeur de papier, et le vertige au cœur du métier.
6. **Terrasse du cours** — Les vivants au-dessus, les morts en dessous, et le parfum comme voile.

## Points à vérifier

- **Rue Droite comme quartier des tanneurs** : les tanneries grassoises sont
  attestées, mais la ruelle exacte reste à confirmer sur place ou en archives.
  La scène 2 dit « ici coulait l'eau du tannage » — à valider avant
  enregistrement, ou à reformuler en « dans ces ruelles ».
- **Confréries de pénitents à Grasse** : les Blancs, Gris et Noirs sont
  attestés en Provence et la charité funéraire est leur fonction documentée.
  L'existence simultanée des trois couleurs *à Grasse* est à sourcer.
- **La légende du cortège « où l'on compte toujours un de trop »** : traitée
  explicitement en légende dans la scène 3 (« on raconte que »). Aucun fait
  n'est présenté comme établi.
- **Le Drac et la masco** : légendes occitanes et provençales attestées, données
  comme telles dans la scène 4.
- **Source de la Foux** : alimentation en eau de la fontaine de la place du
  24-Août à confirmer — la scène 4 nomme la source.
- **Proximité des POIs 5 et 6** : environ 150 m sur le même cours. À arbitrer
  après repérage : soit on les garde (orientations différentes), soit on
  fusionne et on récupère un POI ailleurs dans la vieille ville.
- Le roman de Süskind (*Le Parfum*, 1985) et son intrigue grassoise sont des
  faits éditoriaux vérifiables. Aucun meurtre réel, aucune personne réelle
  n'est présentée comme criminelle.

## Récapitulatif budgets (150 mots/min)

| Scène | Mots | Durée estimée |
|-------|------|---------------|
| 01 Place aux Aires (héros) | 288 | ~115 s |
| 02 Rue Droite | 212 | ~85 s |
| 03 Cathédrale | 214 | ~86 s |
| 04 Place du 24-Août | 208 | ~83 s |
| 05 Place du Cours | 208 | ~83 s |
| 06 Terrasse du cours (héros) | 285 | ~114 s |
| **Total** | **1 415** | **~9 min 30 de texte, ~13 min avec les pauses** |

Sur une promenade nocturne de ~50 min, la narration occupe ~26 % du temps.
