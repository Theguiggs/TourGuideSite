# Plan — 100 visites France (multi-thèmes)

> **✅ TERMINÉ (2026-07-17) — 100/100 visites écrites et vérifiées.**
> 813 scènes, 167 364 mots, ~18,6 h d'audio, moyenne 206 mots/scène (~82 s).
> Zéro défaut dur sur les 100 (budgets 150-225, 2 héros/visite, GPS présents,
> pas de SSML, en-têtes complets). **Aucun seed effectué** (demande).
> Reste avant production : vérifier tous les GPS (approximatifs) et ajouter
> chaque nouvelle ville dans `src/lib/cities/city-coords.ts`.

Décisions (2026-07-17) : ~35 villes × 1-4 thèmes ; registre **tutoiement Murmure** ;
POIs adaptés à la ville (grande 10-12, moyenne 8-9, petite 6-7) ; thèmes :
histoire & secrets, gastronomie & terroir, art & figures célèbres, spécialité
de la ville, sport. **Aucun seed** — scripts markdown uniquement.

## Spec d'écriture (obligatoire pour chaque visite)

- Un fichier par visite : `content/tours/<slug>/script-narration.md`.
- Format EXACT (parseable par `scripts/seed-villes-bankable.mjs`) :

```markdown
# <Ville> — <Titre évocateur>

**Auteur / Narrateur :** Guillaume (steffen.guillaume@gmail.com)
**Ville :** <Ville>
**Thème :** <thème — angle en une ligne>
**Durée narration :** ~XX min
**Distance :** ~X km | **POIs :** N
**Voix :** Tutoiement Murmure — voix basse, confidence, prose pure (pas de SSML).

---

## Scène 1 — <Lieu> : <Sous-titre>
**GPS :** lat, lng *(approx. à vérifier)*

<Corps 150-225 mots (héros ≤300). Prose pure, AUCUNE balise.>

---
(… une section par scène, séparées par ---)
```

- Calibre : 150-225 mots/scène ; exactement 2 scènes héros ≤ 300 mots
  (l'ouverture qui pose le fil rouge + la finale qui le résout).
- Structure de scène : accroche ancrée dans le visible → UNE histoire
  centrale → chute + transition de marche vers la scène suivante.
- Fil rouge : chaque visite raconte UNE grande histoire avec un arc
  (titre = promesse ; dernier POI = résolution).
- Registre : tutoiement, voix basse, confidence Murmure, présent de
  narration, phrases courtes et orales. Adieu chaleureux en finale.
- Rigueur : faits établis uniquement ; légendes en « on raconte » ;
  aucune statistique inventée ; GPS approximatifs marqués
  *(approx. à vérifier)* ; parcours marchable continu, POIs ordonnés
  géographiquement (3-8 min de marche entre deux).
- Total narré ≤ 1/3 du temps de balade.
- Vérification obligatoire avant livraison : compter les mots de chaque
  scène par script (node), corriger tout dépassement.

## Matrice des 100 visites

Statut : ⬜ à écrire · ✅ écrit (vague indiquée)

| # | Slug | Ville | Thème | POIs | Angle / fil rouge | Vague |
|---|------|-------|-------|------|-------------------|-------|
| 1 | paris-montmartre-des-peintres | Paris | Art | 11 | De Renoir à Picasso : la butte qui a inventé l'art moderne, du Bateau-Lavoir aux cabarets. | 2 |
| 2 | paris-ventre-de-paris | Paris | Gastronomie | 10 | Des Halles disparues à la rue Montorgueil : le ventre de Paris n'a jamais cessé de manger. | 2 |
| 3 | paris-rive-gauche-des-ecrivains | Paris | Histoire & secrets | 11 | De Saint-Germain au Quartier latin : cafés, mansardes et scandales qui ont écrit la littérature. | 2 |
| 4 | lyon-bouchons-et-halles | Lyon | Gastronomie | 10 | Des mères lyonnaises à Paul Bocuse : comment des cuisinières ont fait la capitale de la gastronomie. | 2 |
| 5 | lyon-lumiere-cinema | Lyon | Art | 9 | Sortie d'usine, 1895 : la ville où deux frères ont inventé le cinéma. | 2 |
| 6 | lyon-capitale-resistance | Lyon | Histoire & secrets | 10 | Traboules, imprimeries clandestines et Jean Moulin : Lyon capitale de la Résistance. | 2 |
| 7 | marseille-assiette-du-vieux-port | Marseille | Gastronomie | 10 | De la bouillabaisse au marché de Noailles : la ville qui cuisine la Méditerranée entière. | 2 |
| 8 | marseille-cite-radieuse-modernites | Marseille | Art | 9 | Le Corbusier, le MuCEM et les utopies bâties : Marseille laboratoire de la modernité. | 2 |
| 9 | marseille-ville-stade | Marseille | Sport | 9 | De la Canebière au Vélodrome : l'OM, religion municipale d'une ville-stade. | 2 |
| 10 | bordeaux-capitale-du-vin | Bordeaux | Spécialité | 10 | Des Chartrons à la Cité du Vin : le négoce qui a fait la ville, verre à la main. | 2 |
| 11 | bordeaux-canneles-et-marches | Bordeaux | Gastronomie | 9 | Cannelés des couvents, huîtres du bassin, marchés des quais : Bordeaux à table. | 2 |
| 12 | bordeaux-pierre-et-mascarons | Bordeaux | Art | 9 | Trois mille mascarons vous regardent : lire le XVIIIᵉ siècle sur les façades blondes. | 2 |
| 13 | lille-estaminets-et-braderie | Lille | Gastronomie | 9 | Carbonade, Welsh et la plus grande braderie d'Europe : l'art flamand de la tablée. | 2 |
| 14 | lille-fil-du-textile | Lille | Spécialité | 9 | Du drap médiéval à la VPC : la ville que le fil a tissée, filature après filature. | 2 |
| 15 | lille-beaux-arts-et-geants | Lille | Art | 9 | Du deuxième musée de France aux géants du Nord : l'art savant et l'art de la rue. | 2 |
| 16 | biarritz-berceau-du-surf | Biarritz | Sport | 8 | 1957, une planche venue de Californie : comment l'Europe a appris à surfer ici. | 2 |
| 17 | biarritz-table-basque | Biarritz | Gastronomie | 8 | Piment, chocolat, txotx : la côte basque dans l'assiette. | 2 |
| 18 | biarritz-villas-et-architectes | Biarritz | Art | 8 | Folies Belle Époque, Art déco et néo-basque : la station qui collectionnait les architectes. | 2 |
| 19 | toulouse-capitole-et-siecles-d-or | Toulouse | Histoire & secrets | 10 | Du pastel à la brique rose : les fortunes et les drames de la ville qui a deux âges d'or. | 1 |
| 20 | toulouse-aeropostale-et-espace | Toulouse | Spécialité | 9 | De Mermoz à Ariane : la ville d'où la France s'est envolée. | 1 |
| 21 | toulouse-ovalie | Toulouse | Sport | 8 | Le Stade Toulousain et la messe du dimanche : pourquoi ici, le rugby est une civilisation. | 1 |
| 22 | toulouse-cassoulet-et-violette | Toulouse | Gastronomie | 9 | Cassoulet des mariniers, violette des amoureux : Toulouse se mange et se respire. | 1 |
| 23 | nice-nissa-la-bella | Nice | Histoire & secrets | 10 | Comté sarde devenu français par un vote : la vieille ville qui parle encore nissart. | 3 |
| 24 | nice-matisse-chagall-collines | Nice | Art | 9 | Pourquoi les plus grands peintres du XXᵉ siècle ont tous fini sous cette lumière. | 3 |
| 25 | nice-cuisine-nissarde | Nice | Gastronomie | 9 | Socca, pissaladière, petits farcis : la cuisine pauvre devenue trésor. | 3 |
| 26 | strasbourg-entre-deux-mondes | Strasbourg | Histoire & secrets | 10 | Quatre changements de nationalité en 75 ans : la ville-frontière devenue capitale de l'Europe. | 1 |
| 27 | strasbourg-winstubs-et-bretzels | Strasbourg | Gastronomie | 9 | Choucroute, winstubs et vins du Rhin : l'Alsace attablée. | 1 |
| 28 | strasbourg-cathedrale-des-batisseurs | Strasbourg | Art | 8 | 142 mètres de grès rose : l'édifice le plus haut du monde pendant deux siècles, et ses secrets. | 1 |
| 29 | strasbourg-capitale-de-noel | Strasbourg | Spécialité | 8 | Christkindelsmärik, 1570 : le plus vieux marché de Noël et la ville qui a inventé le sapin. | 1 |
| 30 | nantes-memoire-du-port | Nantes | Histoire & secrets | 10 | Armateurs, traite atlantique et mémorial : la ville qui regarde enfin son passé en face. | 3 |
| 31 | nantes-jules-verne-machines | Nantes | Art | 9 | De l'île Feydeau à l'Éléphant : la ville qui a appris à Jules Verne à rêver. | 3 |
| 32 | nantes-beurre-lu-muscadet | Nantes | Gastronomie | 9 | Petit-Beurre, beurre blanc et muscadet : le garde-manger de la Loire. | 3 |
| 33 | montpellier-mille-ans-de-medecine | Montpellier | Spécialité | 9 | La plus vieille faculté de médecine du monde occidental — et Rabelais y était interne. | 3 |
| 34 | montpellier-ecusson-secret | Montpellier | Histoire & secrets | 9 | Hôtels particuliers, mikvé médiéval et cours cachées : l'Écusson à double fond. | 3 |
| 35 | montpellier-places-gourmandes | Montpellier | Gastronomie | 8 | Des Halles Castellane à la Comédie : grisettes, pélardon et vins du Languedoc. | 3 |
| 36 | rennes-parlement-et-incendies | Rennes | Histoire & secrets | 9 | Ville de bois brûlée en 1720, palais sauvé des flammes en 1994 : Rennes renaît toujours. | 3 |
| 37 | rennes-marche-des-lices | Rennes | Gastronomie | 8 | Galette-saucisse et deuxième marché de France : la Bretagne qui se lève tôt. | 3 |
| 38 | rennes-murs-qui-parlent | Rennes | Art | 8 | Pans de bois peints, street-art et Transmusicales : la ville qui s'exprime sur ses murs. | 3 |
| 39 | rouen-proces-jeanne-darc | Rouen | Histoire & secrets | 9 | 1431, place du Vieux-Marché : le procès qui a fait une sainte et hanté une ville. | 1 |
| 40 | rouen-cathedrale-de-monet | Rouen | Art | 8 | Trente fois la même façade : Monet, la lumière et la naissance d'une révolution. | 1 |
| 41 | rouen-faience-et-gros-horloge | Rouen | Spécialité | 8 | Bleu de Rouen et aiguilles d'or : les savoir-faire d'une capitale normande. | 1 |
| 42 | reims-ville-des-sacres | Reims | Histoire & secrets | 9 | Clovis, trente rois et une cathédrale martyre : là où la France se couronnait. | 3 |
| 43 | reims-caves-de-champagne | Reims | Spécialité | 8 | Crayères gallo-romaines, veuves visionnaires : le vin qui pétille sous la ville. | 3 |
| 44 | reims-art-deco-renaissance | Reims | Art | 8 | Détruite à 80 % en 14-18, reconstruite en Art déco : la ville-manifeste. | 3 |
| 45 | dijon-ducs-de-bourgogne | Dijon | Histoire & secrets | 9 | Quand Dijon rivalisait avec Paris : le siècle éblouissant des Grands Ducs. | 3 |
| 46 | dijon-moutarde-pain-depices | Dijon | Gastronomie | 8 | Moutarde, pain d'épices, crème de cassis : la capitale des palais. | 3 |
| 47 | dijon-chouette-et-sculpteurs | Dijon | Art | 8 | La chouette porte-bonheur, Sluter et le puits de Moïse : sculpter Dijon. | 3 |
| 48 | beaune-hospices-et-charite | Beaune | Histoire & secrets | 7 | 1443 : un chancelier coupable bâtit le plus bel hôpital du monde pour acheter son paradis. | 4 |
| 49 | beaune-capitale-des-climats | Beaune | Spécialité | 7 | La vente des Hospices et les climats classés : le vin comme cathédrale. | 4 |
| 50 | annecy-venise-des-alpes | Annecy | Histoire & secrets | 8 | Canaux, prisons et château : la vieille ville qui flotte entre lac et montagne. | 1 |
| 51 | annecy-lac-des-defis | Annecy | Sport | 7 | Traversée du lac, parapente du Semnoz, Ironman : le plan d'eau le plus sportif de France. | 1 |
| 52 | annecy-reblochon-et-lac | Annecy | Gastronomie | 7 | Reblochon de contrebande, féra du lac : la Savoie à table. | 1 |
| 53 | chamonix-conquete-du-mont-blanc | Chamonix | Sport | 8 | 1786, Balmat et Paccard : la première ascension qui a inventé l'alpinisme. | 4 |
| 54 | chamonix-guides-et-cimes | Chamonix | Histoire & secrets | 7 | La Compagnie des guides, ses héros et ses drames : vivre de la montagne qui tue. | 4 |
| 55 | chamonix-table-des-alpages | Chamonix | Gastronomie | 6 | Fondue, génépi et fromages d'alpage : ce que la haute montagne met dans l'assiette. | 4 |
| 56 | colmar-petite-venise | Colmar | Histoire & secrets | 8 | Tanneurs, maraîchers et canaux : la ville-décor qui a failli disparaître. | 4 |
| 57 | colmar-retable-et-bartholdi | Colmar | Art | 8 | Du retable d'Issenheim à la statue de la Liberté : deux chefs-d'œuvre nés ici. | 4 |
| 58 | colmar-capitale-des-vins-dalsace | Colmar | Gastronomie | 7 | Riesling, gewurztraminer et winstubs : la capitale des vins d'Alsace. | 4 |
| 59 | avignon-palais-des-papes | Avignon | Histoire & secrets | 9 | Neuf papes, un palais-forteresse : le siècle où Avignon fut le centre du monde chrétien. | 3 |
| 60 | avignon-ville-theatre | Avignon | Art | 8 | Jean Vilar, 1947 : la cité des papes devenue la plus grande scène du monde. | 3 |
| 61 | avignon-halles-et-provence | Avignon | Gastronomie | 7 | Les Halles, la truffe et les côtes-du-rhône : la Provence gourmande intra-muros. | 3 |
| 62 | aix-sur-les-pas-de-cezanne | Aix-en-Provence | Art | 9 | L'atelier, la Sainte-Victoire et le père banquier : Cézanne contre sa ville, sa ville pour Cézanne. | 3 |
| 63 | aix-fontaines-et-comtes | Aix-en-Provence | Histoire & secrets | 9 | Ville d'eaux depuis Rome, capitale des comtes de Provence : Aix côté cours et fontaines. | 3 |
| 64 | aix-calissons-et-marches | Aix-en-Provence | Gastronomie | 8 | Le calisson du roi René et les marchés du cours Mirabeau. | 3 |
| 65 | arles-van-gogh-la-lumiere | Arles | Art | 9 | Quinze mois, trois cents toiles, une oreille : Van Gogh embrasé par Arles. | 3 |
| 66 | arles-rome-en-provence | Arles | Histoire & secrets | 9 | Arènes, théâtre antique, nécropole : la petite Rome des Gaules. | 3 |
| 67 | arles-camargue-et-gardians | Arles | Spécialité | 7 | Taureaux, gardians et costume d'Arlésienne : la capitale d'une nation Camargue. | 3 |
| 68 | carcassonne-cite-assiegee | Carcassonne | Histoire & secrets | 8 | Dame Carcas, croisade albigeoise : deux mille ans de siège et une légende de cloches. | 4 |
| 69 | carcassonne-resurrection-viollet-le-duc | Carcassonne | Art | 7 | Condamnée à la démolition en 1850, ressuscitée par un architecte fou de Moyen Âge. | 4 |
| 70 | carcassonne-cassoulet-et-corbieres | Carcassonne | Gastronomie | 6 | Cassoulet de Castelnaudary tout proche, vins des Corbières : la table du pays cathare. | 4 |
| 71 | la-rochelle-tours-et-siege | La Rochelle | Histoire & secrets | 9 | 1628, Richelieu affame la ville : le siège qui a brisé la République protestante de l'Atlantique. | 4 |
| 72 | la-rochelle-capitale-de-la-voile | La Rochelle | Sport | 8 | Du Vieux-Port aux Minimes, plus grand port de plaisance d'Europe : la ville qui vit vent debout. | 4 |
| 73 | la-rochelle-huitres-et-pineau | La Rochelle | Gastronomie | 7 | Huîtres de Marennes, pineau et poissons du chalut : l'Atlantique à table. | 4 |
| 74 | saint-malo-cite-corsaire | Saint-Malo | Histoire & secrets | 8 | Surcouf, Duguay-Trouin et la course au trésor : la république des corsaires. | 1 |
| 75 | saint-malo-route-du-rhum | Saint-Malo | Sport | 7 | Tous les quatre ans, la ville regarde partir les fous de l'Atlantique en solitaire. | 1 |
| 76 | saint-malo-beurre-et-marees | Saint-Malo | Gastronomie | 7 | Beurre Bordier, galettes et huîtres de Cancale : la Bretagne des grandes marées. | 1 |
| 77 | bayonne-petit-bayonne | Bayonne | Histoire & secrets | 8 | Remparts de Vauban, fêtes en blanc et rouge : la capitale basque côté coulisses. | 1 |
| 78 | bayonne-jambon-et-chocolat | Bayonne | Gastronomie | 8 | Le jambon des foires et le chocolat des juifs portugais exilés : Bayonne, pionnière du cacao français. | 1 |
| 79 | bayonne-pelote-basque | Bayonne | Sport | 7 | Trinquets, frontons et chisteras : le jeu le plus rapide du monde est une identité. | 1 |
| 80 | tours-cite-royale | Tours | Histoire & secrets | 9 | Saint Martin, Louis XI et la soie : quand la Loire était le centre de la France. | 4 |
| 81 | tours-jardins-et-vins-de-loire | Tours | Gastronomie | 8 | Rillettes, vouvray et guinguettes de bord de Loire : la douceur tourangelle. | 4 |
| 82 | amboise-leonard-dernier-voyage | Amboise | Art | 7 | 1516 : Léonard de Vinci traverse les Alpes avec la Joconde dans ses malles, pour mourir ici. | 4 |
| 83 | versailles-ville-du-roi-soleil | Versailles | Histoire & secrets | 9 | Hors du château : la ville-machine inventée pour servir la cour du Roi-Soleil. | 4 |
| 84 | versailles-potager-du-roi | Versailles | Gastronomie | 7 | Le potager de La Quintinie et les tables royales : nourrir Versailles, un art d'État. | 4 |
| 85 | sarlat-perigord-medieval | Sarlat | Histoire & secrets | 7 | Sauvée par une loi de 1962 : la ville médiévale la plus intacte de France. | 4 |
| 86 | sarlat-capitale-du-foie-gras | Sarlat | Gastronomie | 6 | Marchés au gras, truffes et noix : le Périgord dans son assiette. | 4 |
| 87 | honfleur-berceau-impressionniste | Honfleur | Art | 7 | Boudin, Monet et la ferme Saint-Siméon : le port qui a appris aux peintres à sortir. | 4 |
| 88 | honfleur-port-des-explorateurs | Honfleur | Histoire & secrets | 7 | De Champlain parti fonder Québec aux terre-neuvas : le vieux bassin des grands départs. | 4 |
| 89 | deauville-planches-et-cinema | Deauville | Art | 7 | Le festival, les Planches et les parasols : la plage la plus filmée de France. | 4 |
| 90 | deauville-hippodromes-et-polo | Deauville | Sport | 6 | Yearlings, polo et bains de mer : le sport comme art de vivre normand. | 4 |
| 91 | mont-saint-michel-la-merveille | Mont-Saint-Michel | Histoire & secrets | 7 | Un archange exigeant, mille ans de chantier impossible : la Merveille de l'Occident. | 4 |
| 92 | mont-saint-michel-baie-et-omelette | Mont-Saint-Michel | Gastronomie | 6 | L'omelette de la mère Poulard, l'agneau des prés-salés et la baie aux grandes marées. | 4 |
| 93 | etretat-falaises-des-peintres | Étretat | Art | 6 | Monet, Maupassant et Arsène Lupin : la falaise la plus romanesque de France. | 4 |
| 94 | albi-toulouse-lautrec | Albi | Art | 7 | Le petit comte brisé devenu peintre de Montmartre — et le musée que sa mère a arraché. | 4 |
| 95 | albi-cite-episcopale | Albi | Histoire & secrets | 7 | Une cathédrale-forteresse de brique rouge : la réponse écrasante de l'Église aux Cathares. | 4 |
| 96 | nimes-rome-francaise | Nîmes | Histoire & secrets | 8 | Arènes, Maison carrée, crocodile : la ville qui n'a jamais quitté l'Empire romain. | 4 |
| 97 | nimes-ferias-et-brandade | Nîmes | Spécialité | 7 | Férias, denim né ici (« de Nîmes ») et brandade : les fiertés nîmoises. | 4 |
| 98 | cassis-calanques-et-vignes | Cassis | Spécialité | 6 | Entre le cap Canaille et les calanques : le petit port qui a du blanc dans les veines. | 4 |
| 99 | giverny-jardins-de-monet | Giverny | Art | 6 | Le jardin comme chef-d'œuvre : quarante ans de nymphéas peints depuis un pont japonais. | 4 |
| 100 | chartres-cathedrale-de-lumiere | Chartres | Art | 7 | Le bleu de Chartres, les bâtisseurs anonymes et le labyrinthe : la lumière faite pierre. | 4 |

## Vagues de production

- **Vague 1 (20)** : Toulouse ×4, Strasbourg ×4, Rouen ×3, Annecy ×3, Saint-Malo ×3, Bayonne ×3 — villes nouvelles, échantillon des 5 thèmes.
- **Vague 2 (18)** : nouvelles thématiques des villes déjà au catalogue (Paris, Lyon, Marseille, Bordeaux, Lille, Biarritz).
- **Vague 3 (24)** : Nice, Nantes, Montpellier, Rennes, Reims, Dijon, Avignon, Aix, Arles.
- **Vague 4 (38)** : Beaune, Chamonix, Colmar, Carcassonne, La Rochelle, Tours, Amboise, Versailles, Sarlat, Honfleur, Deauville, Mont-Saint-Michel, Étretat, Albi, Nîmes, Cassis, Giverny, Chartres.

## Doublons interdits (déjà couverts)

Paris rive droite secrète, Lyon traboules/soie, Bordeaux port de la Lune,
Marseille 2600 ans, Lille âme flamande, Biarritz impératrice, Grasse (parfum ×2 + ombres),
et les 11 visites Riviera (`seed-am-*`) : Antibes, Beaulieu, Cannes, Cap-Ferrat,
crimes-Riviera, Èze, Menton, Monaco, Roquebrune, Vence, Villefranche.
