# Cap Ferrat — La Presqu'île des Milliardaires

**Ville :** Saint-Jean-Cap-Ferrat
**Thématique :** On a tout acheté ici, sauf le bord de l'eau
**Distance / durée :** ~3,4 km / ~2 h 15 (boucle par la pointe, puis l'isthme — terrain irrégulier sur les sentiers)
**POIs héros :** n° 5, n° 6
**Billets :** villa Ephrussi pour le POI 6. Les six autres haltes sont gratuites, dont les deux sentiers du littoral.

## Description catalogue (vouvoiement)

Sur cette presqu'île, tout s'achète : la terre, la vue, le silence, le droit de
ne pas être vu. Tout, sauf une bande de trois mètres le long de l'eau, que le
droit français a rendue inaliénable — et sur laquelle vous marcherez pendant
une bonne partie de la promenade, entre la mer et les grilles des propriétés
les plus chères d'Europe. En sept haltes et trois kilomètres et demi, vous
croiserez un hameau de pêcheurs devenu commune en 1904, un roi étranger qui a
acheté le cap avec l'argent d'une colonie, une villa entièrement dessinée par
Cocteau qu'on ne peut plus visiter, un ermite du VI<sup>e</sup> siècle qui
s'était enchaîné volontairement, et un paquebot immobile bâti sur la crête
entre deux mers.

## Thèmes

['patrimoine', 'nature', 'histoire']

## POIs

| # | Titre | Lat | Lng | Fichier | Précision | Desc (1 ligne) |
|---|-------|-----|-----|---------|-----------|----------------|
| 1 | Port de Saint-Jean | — | — | 01-port-de-saint-jean.md | — | Un hameau de pêcheurs, puis un souverain qui achète des hectares. |
| 2 | Les ruelles du village | — | — | 02-les-ruelles-du-village.md | — | Deux villages coexistent ici et ne se croisent presque jamais. |
| 3 | Villa Santo Sospir | — | — | 03-villa-santo-sospir.md | — | Une œuvre faite pour être habitée, que plus personne n'habite. |
| 4 | Pointe Saint-Hospice | — | — | 04-pointe-saint-hospice.md | — | Un ermite enchaîné volontairement, et la rime avec ce qui l'entoure. |
| 5 | Le sentier du littoral | — | — | 05-sentier-du-littoral.md | — | Trois mètres qui ne sont à vendre à aucun prix. |
| 6 | Villa Ephrussi de Rothschild | — | — | 06-villa-ephrussi.md | — | Un paquebot immobile sur la crête, et neuf jardins sans transition. |
| 7 | Promenade Maurice-Rouvier | — | — | 07-promenade-maurice-rouvier.md | — | Le seul endroit d'où la presqu'île est belle. |

Coordonnées résolues par `node scripts/resout-gps-pois.mjs --tour=cap-ferrat-milliardaires --ecris`.

## Fil rouge narratif

**Tout s'est acheté ici sauf le rivage — et c'est de là que la presqu'île est
belle.** Les quatre premières haltes accumulent la propriété sous toutes ses
formes ; la scène 5 renverse ; les deux dernières referment.

1. **Le port** — L'avant : des pointus, du thon, des filets. Puis l'achat.
2. **Les ruelles** — Les gens qui habitent à l'année, et qu'on ne voit pas.
3. **Santo Sospir** — Une œuvre privatisée jusqu'à devenir invisible.
4. **Saint-Hospice** — Un homme qui s'enchaîne volontairement, quatorze siècles plus tôt.
5. **Le sentier** — Le renversement : le rivage n'appartient à personne.
6. **Ephrussi** — La propriété poussée à son terme : une vue de l'esprit, figée par testament.
7. **Maurice-Rouvier** — Le récapitulatif, sur la seule bande qu'on n'a pas pu acheter.

## Ce qui a changé par rapport à la version précédente

L'audit classait cette visite « à refondre » : c'est la plus retravaillée du lot.

- **L'itinéraire était infaisable.** L'ancien parcours allait port (nord) →
  Ephrussi → sentier (ouest) → Saint-Hospice (nord-est) → Santo Sospir →
  promenade Rouvier (nord) → Grand-Hôtel (pointe **sud**). Il zigzaguait d'un
  bout à l'autre de la presqu'île et se terminait à 1,5 km au sud après être
  remonté au nord : 3,5 km annoncés pour environ 8 réels. Le nouveau parcours
  est une boucle propre — village, pointe nord-est, retour, isthme, sortie vers
  le nord — pour ~3,4 km.
- **Une coordonnée était à l'autre bout du cap.** La pointe Saint-Hospice était
  posée à la pointe **sud**, à environ 1,4 km de la vraie. C'est le genre
  d'erreur qui ne lève aucune alerte et qu'on découvre à pied.
- **Le Grand-Hôtel sort du parcours.** Il est à la pointe sud, loin de tout le
  reste, et sa scène n'était qu'une liste de tarifs et de clients célèbres.
- **Trois anecdotes non sourcées sont retirées** : les dix-huit architectes que
  Béatrice de Rothschild aurait congédiés, le majordome envoyé sur le toit un
  jour de mistral, et l'oligarque russe dont la grille aurait été démontée deux
  fois par la mairie. La première est une légende de brochure ; les deux autres
  ne sont attestées nulle part.
- **Tous les prix au mètre carré sont retirés.** Ils étaient datés « 2023 » dans
  un audio destiné à durer des années, et ils n'apportaient rien que la scène 5
  ne dise mieux.
- **Le persona « Thomas Bellini » est supprimé**, comme les quatre autres.

## Points à vérifier

- **Léopold II et ses acquisitions** : période, surface acquise, et la part du
  cap concernée. La scène 1 ne donne ni chiffre ni nom, volontairement — à
  compléter une fois sourcé. L'origine congolaise de la fortune est en revanche
  un fait établi et il est dit.
- **Indépendance communale de Saint-Jean-Cap-Ferrat en 1904** : à confirmer.
- **Population permanente et estivale** : la scène dit « quelques milliers » et
  « cinq à six fois plus l'été ». À caler sur des données INSEE.
- **Villa Santo Sospir** : date d'arrivée de Cocteau (1950), durée de son séjour,
  et **son statut actuel d'ouverture**. La scène affirme qu'on ne peut pas
  entrer : à revérifier avant publication, ça peut changer.
- **L'origine du « petit quelque chose »** est donnée au conditionnel dans la
  scène, ce qui est le bon niveau tant que la source n'est pas retrouvée.
- **Saint Hospice** : le récit vient d'un chroniqueur du sixième siècle, que la
  scène ne nomme pas. À nommer une fois la référence vérifiée. La scène dit
  explicitement qu'il s'agit d'un texte du sixième siècle « avec ses miracles et
  sa part de construction » : c'est le traitement correct.
- **La statue de bronze de la pointe** : date d'érection, hauteur, commanditaire.
  La scène dit « plusieurs mètres » sans plus.
- **Le droit du rivage** : inaliénabilité du domaine public maritime et son
  ancrage dans l'ordonnance de marine du dix-septième siècle ; servitude de
  passage des piétons créée par la loi du 31 décembre 1976. **C'est le socle de
  la scène héros : ces deux points doivent être vérifiés par une source
  juridique**, pas par un site touristique.
- **Villa Ephrussi** : dates du chantier (1907-1912), nom de l'architecte — non
  cité dans la scène —, nombre et liste des jardins, nom du paquebot ayant
  inspiré celui de la villa, et l'institution légataire avec la condition
  testamentaire.
- **Praticabilité des sentiers** : état, difficulté, et fermetures éventuelles
  par gros temps. À afficher dans la fiche produit.

## Récapitulatif budgets (150 mots/min)

| Scène | Mots | Durée estimée |
|-------|------|---------------|
| 01 Port de Saint-Jean | 188 | ~75 s |
| 02 Les ruelles du village | 164 | ~66 s |
| 03 Villa Santo Sospir | 158 | ~63 s |
| 04 Pointe Saint-Hospice | 197 | ~79 s |
| 05 Le sentier du littoral (héros) | 223 | ~89 s |
| 06 Villa Ephrussi (héros) | 238 | ~95 s |
| 07 Promenade Maurice-Rouvier | 197 | ~79 s |
| **Total** | **1 365** | **~9 min de texte, ~13 min avec les pauses** |

Sur une promenade de ~2 h 15, la narration occupe ~10 % du temps.
