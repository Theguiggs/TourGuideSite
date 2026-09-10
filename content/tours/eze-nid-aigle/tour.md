# Èze — Le Vertige du Nid d'Aigle

**Ville :** Èze
**Thématique :** Ici, on ne s'oppose pas au manque — on s'arrange avec
**Distance / durée :** ~1,4 km / ~1 h 30 (montée continue dans le village, ~110 m de dénivelé)
**POIs héros :** n° 5, n° 7
**Billets :** jardin exotique pour le POI 5 uniquement. Six haltes sur sept sont gratuites.

## Description catalogue (vouvoiement)

On a fondé Èze là où il n'y a ni source, ni terre, ni accès facile — à quatre
cents mètres au-dessus de la mer, sur un piton calcaire. Pour une seule raison :
d'en haut, on voit venir. En sept haltes et un kilomètre et demi de montée,
vous découvrirez des maisons encastrées dans le rocher plutôt que posées
dessus, des citernes creusées faute de source, une citadelle rasée sur ordre de
Louis XIV — et, dans ses ruines, un jardin de cactus qui pousse là où rien
d'autre ne tient. La promenade se termine au départ du sentier qu'un
philosophe allemand malade montait à pied, quatre cents mètres de dénivelé,
pour aller penser. Bonnes chaussures indispensables.

## Thèmes

['histoire', 'nature', 'panorama']

## POIs

| # | Titre | Lat | Lng | Fichier | Précision | Desc (1 ligne) |
|---|-------|-----|-----|---------|-----------|----------------|
| 1 | Porte des Maures | — | — | 01-porte-des-maures.md | — | Une entrée volontairement pénible, et un village fondé là où il n'y a pas d'eau. |
| 2 | La montée du village | — | — | 02-rue-du-barri.md | — | La calade faite pour les ânes, les citernes, et les maisons encastrées. |
| 3 | Chapelle des Pénitents blancs | — | — | 03-chapelle-des-penitents-blancs.md | — | Le plus vieux bâtiment du village, et une confrérie qui servait de sécurité sociale. |
| 4 | Église Notre-Dame-de-l'Assomption | — | — | 04-eglise-notre-dame.md | — | 1706 : la citadelle rasée, et le village qui cesse d'être un poste. |
| 5 | Le jardin exotique | — | — | 05-jardin-exotique.md | — | Des plantes grasses dans les ruines : tenir grâce au manque. |
| 6 | La sortie sud du village | — | — | 06-la-poterne.md | — | Quelques centaines de mètres : un village perché ne s'étale pas, il se replie. |
| 7 | Départ du chemin de Nietzsche | — | — | 07-chemin-de-nietzsche.md | — | Des pins tordus, et un homme malade qui montait quatre cents mètres pour penser. |

Coordonnées résolues par `node scripts/resout-gps-pois.mjs --tour=eze-nid-aigle --ecris`.

## Fil rouge narratif

**On ne s'oppose pas au manque : on s'arrange avec.** Chaque halte est un
exemple de la même stratégie, et la scène 7 les rassemble.

1. **Porte des Maures** — On s'installe sans eau, parce qu'on voit venir.
2. **La montée** — Citernes au lieu de source, maisons encastrées au lieu de terrassements.
3. **Chapelle** — La confrérie comme filet, faute d'institutions.
4. **L'église** — La citadelle rasée, et le village qui se réinvente en village.
5. **Jardin exotique** — Des plantes qui stockent l'eau et attendent.
6. **La sortie sud** — Un tissu replié faute de place défendable.
7. **Chemin de Nietzsche** — Des pins qui prennent la forme du vent, et un malade qui monte.

## Ce qui a changé par rapport à la version précédente

- **Le parcours est faisable.** L'ancienne version plaçait le sentier Nietzsche
  en POI 6 puis remontait vers deux haltes plus hautes. Or ce sentier *descend*
  quatre cents mètres jusqu'au bord de mer : il était impossible de le
  « visiter » puis de continuer. Il devient le POI final, où l'on se poste au
  départ pour le regarder et le raconter. Qui veut le descendre le fait après.
- **La parfumerie Fragonard est retirée.** L'ancien POI 7 racontait Grasse, pas
  Èze, et doublonnait avec les deux parcours grassois du catalogue. C'était le
  POI faible.
- **Le persona « Isabelle Moretti, historienne niçoise » est supprimé.** Elle se
  présentait en scène 1 et signait en scène 8. Le catalogue a désormais un seul
  narrateur (voir `content/tours/CONVENTIONS-MURMURE.md`).
- **La légende Walt Disney est retirée.** L'ancienne version la traitait
  honnêtement, en légende, ce qui était correct — mais elle occupait une place
  de choix dans la scène de l'église au détriment de 1706, qui est le vrai
  basculement du village et qui est, lui, documenté.
- **L'anecdote de Grace Kelly est retirée** : elle rattachait l'accident de 1982
  à la Grande Corniche, ce qui est au minimum imprécis, et elle n'a rien à voir
  avec Èze.
- **La procession aux flambeaux du 15 août** est retirée, faute de source.
- **Distance corrigée** : 1,6 km annoncés, ~1,4 km réels pour le village seul.
  La descente du sentier, si on la fait, est une sortie à part entière.

## Points à vérifier

- **Altitude du village** : la scène 5 dit « quatre cent vingt et quelques
  mètres ». À caler sur une valeur officielle.
- **Absence de source et système de citernes** : logique et très probable sur
  un piton calcaire, mais la scène 2 l'affirme. À documenter, ou à formuler au
  conditionnel.
- **Occupation ancienne du site** : la version précédente citait des tessons
  ligures du deuxième millénaire avant notre ère. Non repris ici faute de
  source — à réintégrer si les données de fouille le confirment.
- **Chapelle des Pénitents blancs** : datation (1306 selon les sources
  courantes) et le fait qu'elle soit le plus ancien édifice du village. La
  scène dit « selon toute vraisemblance », en attendant confirmation.
- **1706, démantèlement des fortifications** : ordre, contexte (guerre de
  Succession d'Espagne), et ce qui a effectivement été détruit. C'est le pivot
  de la scène 4 et de la scène 5 : à sourcer solidement.
- **Église Notre-Dame-de-l'Assomption** : dates de construction et architecte.
  La scène ne nomme personne et dit seulement « fin du dix-huitième siècle ».
- **Jardin exotique** : année de création et initiateur. La scène dit « au
  milieu du vingtième siècle » sans nommer, faute de source ferme ici.
- **Nietzsche** : hivers niçois, fréquentation effective de ce sentier, et
  surtout **la formulation exacte de ce qu'il en dit dans *Ecce Homo***. La
  scène 7 dit « une partie de son *Zarathoustra* » sans citer : ne mettre de
  guillemets qu'après avoir vérifié le texte et sa traduction.
- **Difficulté et durée du sentier** : à vérifier et à afficher dans la fiche
  produit, avec l'avertissement eau et chaussures.

## Récapitulatif budgets (150 mots/min)

| Scène | Mots | Durée estimée |
|-------|------|---------------|
| 01 Porte des Maures | 176 | ~70 s |
| 02 La montée du village | 179 | ~72 s |
| 03 Chapelle des Pénitents blancs | 169 | ~68 s |
| 04 Église Notre-Dame | 174 | ~70 s |
| 05 Le jardin exotique (héros) | 257 | ~103 s |
| 06 La sortie sud | 145 | ~58 s |
| 07 Chemin de Nietzsche (héros) | 259 | ~104 s |
| **Total** | **1 359** | **~9 min de texte, ~13 min avec les pauses** |

Sur une promenade de ~1 h 30, la narration occupe ~14 % du temps.
