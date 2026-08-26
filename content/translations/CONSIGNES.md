# Consignes de traduction — retraduction des 101 visites

Ces règles s'appliquent à tout ce qui est écrit dans `raw/{tourId}.txt`, et
valent aussi pour le futur pipeline de traduction automatique (story 4).

## Ce qui est traduit

Par visite : le titre, la description courte, puis pour chaque scène son titre
et son texte de narration. Rien d'autre.

## Langues

`en`, `es`, `de`, `it`, `nl` — **traduites depuis le français directement**.
Aucune langue pivot : l'italien issu de MarianMT passait par l'anglais et
subissait une double dégradation.

## Registre

La narration française **tutoie** le visiteur et lui parle au présent, à la
deuxième personne, en le mettant en mouvement (« Place-toi près de la
fontaine », « Regarde surtout… »). Ce registre est porté dans chaque langue :

| Langue | Adresse |
|---|---|
| en | `you` (impératif direct, registre parlé) |
| es | `tú` (jamais `usted`) |
| de | `du` (jamais `Sie`) |
| it | `tu` (jamais `Lei`) |
| nl | `je` (jamais `u`) |

C'est un texte **dit à voix haute**, pas lu : phrases courtes, syntaxe simple,
pas de subordonnées empilées, pas de tournures écrites.

## Toponymes et noms propres

Les noms de lieux, monuments, rues, places et personnes **restent en
français** : le visiteur doit pouvoir les rapprocher de ce qu'il lit sur les
plaques et les panneaux. `cours Mirabeau`, `porte des Augustins`, `quartier
Mazarin`, `place du Capitole`, `Grosse Horloge` ne se traduisent pas.

Le nom **commun générique** qui les précède, lui, se traduit quand il est
séparable : « la cathédrale Saint-Étienne » → « Saint-Étienne cathedral ».
Quand le générique fait partie du nom, il reste : `Pont Neuf`, pas `New
Bridge`. En cas de doute, garder le français.

Les traductions MarianMT à ne jamais reproduire : `La Grosse Clock`,
`Torre San Nicolas`, `Tour Lantern` — un nom propre à moitié traduit est pire
que le nom d'origine.

## Balisage

`<break time="3s"/>` et ses variantes sont des **pauses de synthèse vocale**.
Ils sont reportés à l'identique, au même endroit du récit. Le contrôle est
automatique : `retrad-parse.mjs` refuse un fichier dont le balisage diverge de
la source.

## Fidélité

- Rien n'est ajouté : ni glose, ni précision historique, ni cheville.
- Rien n'est retiré : chaque information de la source est présente.
- Le **nombre de scènes** est identique à la source, et chaque `sceneId` est
  repris tel quel.
- Les sauts de paragraphe de la source sont conservés.
- Les instructions de déplacement (« avance sur le cours », « traverse vers… »)
  doivent rester exécutables : c'est le seul guidage dont dispose le visiteur
  en marche, l'écran restant noir.

## Ce qui n'est pas traduit ici

`GuideTour.practicalTips`, `startAddress`, `endAddress` : le schéma n'offre
aucun champ traduit pour ces textes. À reprendre quand la story 3 ajoutera les
champs manquants.
