# Plan — 100 visites France sans gastronomie

> **REFONDU (2026-08-09) — 100/100 visites locales.**
> Chaque parcours comporte 6 à 12 scènes de 150 à 225 mots.
> Les thèmes culinaires, boissons et produits régionaux ont été remplacés par des
> promenades urbaines simples. Aucun seed ni déploiement AWS n’est déclenché par cette refonte.

## Règles éditoriales et GPS

- Un fichier par visite : `content/tours/<slug>/script-narration.md`.
- Tutoiement Murmure, prose pure, sans SSML.
- 6 à 12 POI par visite ; 150 à 225 mots par scène, ouverture et finale jusqu’à 300 mots.
- Aucun thème, conseil, dégustation, plat, boisson ou produit alimentaire. Un nom propre
  historiquement indispensable reste possible sans développement culinaire.
- Chaque GPS désigne une entrée ou un point d’observation public contrôlé. Sa source,
  sa date, son écart et toute exception figurent dans `GPS-AUDIT-100-VISITES.md`.
- Distance recalculée depuis les points successifs avec un coefficient piéton de 1,18 ;
  durée de narration recalculée à 150 mots par minute.
- L’ordre forme un parcours continu. Tout point fermé ou ambigu doit être remplacé par
  un point public documenté ; aucune coordonnée ne peut être devinée.

## Matrice canonique

| # | Slug | Ville | Thème | POIs | Promesse simple | Vague |
|---:|---|---|---|---:|---|---:|
| 1 | toulouse-capitole-et-siecles-d-or | Toulouse | Histoire & secrets | 10 | Capitole et siècles d'or — du pastel à la brique rose : les fortunes et les drames de la ville qui a deux âges d'or. | 1 |
| 2 | toulouse-aeropostale-et-espace | Toulouse | Spécialité | 9 | De Mermoz à Ariane — de Mermoz à Ariane : la ville d'où la France s'est envolée. | 1 |
| 3 | toulouse-ovalie | Toulouse | Sport | 8 | La messe du dimanche — le Stade Toulousain et la messe du dimanche : pourquoi ici, le rugby est une civilisation. | 1 |
| 4 | toulouse-canal-quais-et-ponts | Toulouse | Histoire urbaine | 6 | Canal, quais et ponts — suivre l’eau pour relier les quartiers, les quais et les ponts de Toulouse. | 1 |
| 5 | strasbourg-entre-deux-mondes | Strasbourg | Histoire & secrets | 10 | Entre deux mondes — quatre changements de nationalité en soixante-quinze ans : la ville-frontière devenue capitale de l'Europe. | 1 |
| 6 | strasbourg-quais-et-ponts-de-lill | Strasbourg | Histoire urbaine | 6 | Quais et ponts de l’Ill — comprendre la ville insulaire en suivant ses quais et ses ponts. | 1 |
| 7 | strasbourg-cathedrale-des-batisseurs | Strasbourg | Art & figures célèbres | 8 | La cathédrale des bâtisseurs — 142 mètres de grès rose : le plus haut édifice du monde pendant deux siècles, et ses secrets. | 1 |
| 8 | strasbourg-capitale-de-noel | Strasbourg | Spécialité | 8 | Capitale de Noël — Christkindelsmärik, 1570 : le plus vieux marché de Noël de France, et la ville qui a donné au monde son sapin décoré. | 1 |
| 9 | rouen-proces-jeanne-darc | Rouen | Histoire & secrets | 9 | Le procès de Jeanne d'Arc — 1431, place du Vieux-Marché : le procès qui a fait une sainte et hanté une ville. | 1 |
| 10 | rouen-cathedrale-de-monet | Rouen | Art | 8 | Trente fois la même façade — Trente fois la même façade : Monet, la lumière et la naissance d'une révolution. | 1 |
| 11 | rouen-faience-et-gros-horloge | Rouen | Spécialité | 8 | Bleu de Rouen et aiguilles d'or — Bleu de Rouen et aiguilles d'or : les savoir-faire d'une capitale normande. | 1 |
| 12 | annecy-venise-des-alpes | Annecy | Histoire & secrets | 8 | La ville qui flotte — canaux, prisons et château : la vieille ville qui flotte entre lac et montagne. | 1 |
| 13 | annecy-lac-des-defis | Annecy | Sport | 7 | Le lac des défis — nage, voile, vol libre, vélo : le lac-stade d'Annecy et le jour où la ville a rêvé des anneaux olympiques. | 1 |
| 14 | annecy-ponts-canaux-et-jardins | Annecy | Nature urbaine | 6 | Ponts, canaux et jardins — suivre le Thiou entre ponts, canaux, jardins et ouverture sur le lac. | 1 |
| 15 | saint-malo-cite-corsaire | Saint-Malo | Histoire & secrets | 8 | La République des corsaires — Surcouf, Duguay-Trouin et la course au trésor : la république des corsaires. | 1 |
| 16 | saint-malo-route-du-rhum | Saint-Malo | Sport | 7 | Les Fous de l'Atlantique — Tous les quatre ans, la ville regarde partir les fous de l'Atlantique en solitaire. | 1 |
| 17 | saint-malo-remparts-plages-et-marees | Saint-Malo | Paysage maritime | 6 | Remparts, plages et marées — observer la relation entre la ville close, ses plages et le mouvement de la mer. | 1 |
| 18 | bayonne-petit-bayonne | Bayonne | Histoire & secrets | 8 | La forteresse qui danse — Remparts de Vauban, fêtes en blanc et rouge : la capitale basque côté coulisses. | 1 |
| 19 | bayonne-confluence-quais-et-ponts | Bayonne | Histoire urbaine | 6 | Confluence, quais et ponts — suivre l’Adour et la Nive pour comprendre les quartiers et leurs ponts. | 1 |
| 20 | bayonne-pelote-basque | Bayonne | Sport | 7 | Le jeu le plus rapide du monde — Trinquets, frontons et chisteras : le jeu le plus rapide du monde est une identité. | 1 |
| 21 | paris-montmartre-des-peintres | Paris | Art | 11 | Montmartre des peintres : la butte qui a inventé l'art moderne — de Renoir à Picasso, la colline pauvre où l'on a réinventé le regard, du Bateau-Lavoir aux cabarets. | 2 |
| 22 | paris-rues-et-passages-des-halles | Paris | Histoire urbaine | 6 | Rues et passages des Halles — lire la transformation du centre de Paris dans ses rues, passages et places. | 2 |
| 23 | paris-rive-gauche-des-ecrivains | Paris | Histoire & secrets | 11 | La rive gauche des écrivains : livres, mansardes et scandales — de Saint-Germain au Quartier latin, la rive où s'est écrite la littérature. | 2 |
| 24 | lyon-presquile-places-et-passages | Lyon | Histoire urbaine | 6 | Places et passages de la Presqu’île — relier places, passages et quais pour comprendre la Presqu’île. | 2 |
| 25 | lyon-lumiere-cinema | Lyon | Art | 9 | Lumière : la ville où naquit le cinéma — sortie d'usine, 1895 : à Monplaisir, le faubourg de l'est où deux frères ont inventé le cinéma | 2 |
| 26 | lyon-capitale-resistance | Lyon | Histoire & secrets | 10 | Capitale de la Résistance — traboules, imprimeries clandestines et Jean Moulin : Lyon capitale de la Résistance | 2 |
| 27 | marseille-quais-et-forts-du-vieux-port | Marseille | Patrimoine maritime | 6 | Quais et forts du Vieux-Port — suivre les quais et les défenses qui encadrent le Vieux-Port. | 2 |
| 28 | marseille-cite-radieuse-modernites | Marseille | Art & modernité | 9 | La Cité Radieuse et les Modernités — Le Corbusier, le MuCEM et les utopies bâties : Marseille, laboratoire de la modernité | 2 |
| 29 | marseille-ville-stade | Marseille | Sport | 9 | La Ville-Stade — de la Canebière au Vélodrome, l'OM comme religion municipale d'une ville-stade | 2 |
| 30 | bordeaux-chartrons-entrepots-et-bassins | Bordeaux | Patrimoine portuaire | 6 | Chartrons, entrepôts et bassins — suivre les quais, entrepôts et bassins qui racontent l’ancien port. | 2 |
| 31 | bordeaux-places-et-jardins-du-centre | Bordeaux | Architecture | 6 | Places et jardins du centre — observer comment places, jardins et perspectives organisent le centre de Bordeaux. | 2 |
| 32 | bordeaux-pierre-et-mascarons | Bordeaux | Art | 9 | Pierre blonde et mascarons — apprendre à lire le XVIIIᵉ siècle sur les façades blondes : mascarons, fer forgé, pierre tendre et les peintres de la ville. | 2 |
| 33 | lille-places-et-facades-du-vieux-lille | Lille | Architecture | 6 | Places et façades du Vieux-Lille — lire l’identité flamande dans les places, façades et passages du Vieux-Lille. | 2 |
| 34 | lille-fil-du-textile | Lille | Spécialité de la ville | 9 | Le fil du textile — Du drap médiéval à la VPC : la ville que le fil a tissée, filature après filature. | 2 |
| 35 | lille-beaux-arts-et-geants | Lille | Art & figures | 9 | Beaux-Arts et géants — Du deuxième musée de France aux géants du Nord : l'art savant et l'art de la rue. | 2 |
| 36 | biarritz-berceau-du-surf | Biarritz | Sport | 8 | Le berceau du surf — comment un bout de côte basque est devenu la capitale européenne du surf. | 2 |
| 37 | biarritz-ocean-et-belvederes | Biarritz | Nature urbaine | 6 | Océan et belvédères — découvrir la ville depuis ses promontoires, ses places et son front de mer. | 2 |
| 38 | biarritz-villas-et-architectes | Biarritz | Art | 8 | Villas et architectes — folies Belle Époque, Art déco et néo-basque : la station qui collectionnait les architectes. | 2 |
| 39 | nice-nissa-la-bella | Nice | Histoire & secrets | 10 | Nissa la Bella — comté sarde devenu français par un vote, la vieille ville qui parle encore nissart. | 3 |
| 40 | nice-matisse-chagall-collines | Nice | Art | 9 | Sous la même lumière — pourquoi les plus grands peintres du XXᵉ siècle ont tous fini sous cette lumière. | 3 |
| 41 | nice-places-et-ruelles-du-vieux-nice | Nice | Patrimoine | 6 | Places et ruelles du Vieux-Nice — parcourir les places et les ruelles qui composent le Vieux-Nice. | 3 |
| 42 | nantes-memoire-du-port | Nantes | Histoire & secrets | 10 | Mémoire du port — armateurs, traite atlantique et mémorial : la ville qui regarde enfin son passé en face. | 3 |
| 43 | nantes-jules-verne-machines | Nantes | Art | 9 | Les rêves de Jules Verne — de l'île Feydeau à l'Éléphant : la ville qui a appris à Jules Verne à rêver. | 3 |
| 44 | nantes-ile-et-chantiers | Nantes | Patrimoine industriel | 6 | L’île et les chantiers — suivre les traces du port et des chantiers dans la ville transformée. | 3 |
| 45 | montpellier-mille-ans-de-medecine | Montpellier | Spécialité | 9 | Mille ans de médecine — la plus vieille faculté de médecine du monde occidental, où Rabelais fut étudiant. | 3 |
| 46 | montpellier-ecusson-secret | Montpellier | Histoire & secrets | 9 | L'Écusson à double fond — hôtels particuliers, mikvé médiéval et cours cachées : l'Écusson à double fond. | 3 |
| 47 | montpellier-places-et-passages-de-lecusson | Montpellier | Histoire urbaine | 6 | Places et passages de l’Écusson — relier les places, passages et perspectives du centre ancien. | 3 |
| 48 | rennes-parlement-et-incendies | Rennes | Histoire & secrets | 9 | Le feu et la pierre — ville de bois brûlée en 1720, palais sauvé des flammes en 1994 : Rennes renaît toujours. | 3 |
| 49 | rennes-portes-et-places-du-centre | Rennes | Patrimoine | 6 | Portes et places du centre — traverser les portes, places et rues qui racontent la croissance de Rennes. | 3 |
| 50 | rennes-murs-qui-parlent | Rennes | Art | 8 | Les murs qui parlent — pans de bois peints, street-art et Transmusicales : la ville qui s'exprime sur ses murs. | 3 |
| 51 | reims-ville-des-sacres | Reims | Histoire & secrets | 9 | Là où la France se couronnait — Clovis, trente rois et une cathédrale martyre : là où la France se couronnait. | 3 |
| 52 | reims-souterraine-et-reconstruite | Reims | Architecture | 6 | La ville souterraine et reconstruite — relier sous-sols historiques et quartiers reconstruits pour lire les strates de Reims. | 3 |
| 53 | reims-art-deco-renaissance | Reims | Art | 8 | La ville-manifeste, reconstruite en Art déco — Détruite en 14-18, reconstruite en Art déco : la ville-manifeste. | 3 |
| 54 | dijon-ducs-de-bourgogne | Dijon | Histoire & secrets | 9 | Le siècle éblouissant des Grands Ducs — quand Dijon rivalisait avec Paris : le siècle éblouissant des Grands Ducs de Bourgogne. | 3 |
| 55 | dijon-hotels-et-ruelles | Dijon | Architecture | 6 | Hôtels et ruelles — reconnaître cours, hôtels particuliers et ruelles dans le centre sauvegardé. | 3 |
| 56 | dijon-chouette-et-sculpteurs | Dijon | Art | 8 | Sculpter la ville — la chouette porte-bonheur, Claus Sluter et le puits de Moïse : sculpter Dijon. | 3 |
| 57 | avignon-palais-des-papes | Avignon | Histoire & secrets | 9 | Neuf papes, un palais-forteresse — Neuf papes, un palais-forteresse : le siècle où Avignon fut le centre du monde chrétien. | 3 |
| 58 | avignon-ville-theatre | Avignon | Art | 8 | La cité des papes devenue la plus grande scène du monde — Jean Vilar, 1947 : la cité des papes devenue la plus grande scène du monde. | 3 |
| 59 | avignon-places-couvents-et-cloitres | Avignon | Patrimoine | 6 | Places, couvents et cloîtres — relier places, anciens couvents et cloîtres dans la ville intra-muros. | 3 |
| 60 | aix-sur-les-pas-de-cezanne | Aix-en-Provence | Art | 9 | Sur les pas de Cézanne — l'atelier, la Sainte-Victoire et le père banquier : Cézanne contre sa ville, sa ville pour Cézanne. | 3 |
| 61 | aix-fontaines-et-comtes | Aix-en-Provence | Histoire & secrets | 9 | Fontaines et comtes — ville d'eaux depuis Rome, capitale des comtes de Provence : Aix côté cours et fontaines. | 3 |
| 62 | aix-places-et-portes | Aix-en-Provence | Histoire urbaine | 6 | Places et portes — découvrir Aix par ses places, ses portes et ses perspectives. | 3 |
| 63 | arles-van-gogh-la-lumiere | Arles | Art & figures célèbres | 9 | Van Gogh, embrasé par la lumière — Van Gogh : quinze mois, trois cents œuvres, une oreille. | 3 |
| 64 | arles-rome-en-provence | Arles | Histoire & secrets | 9 | la petite Rome des Gaules — Arles antique : arènes, théâtre, cryptoportiques, nécropole. | 3 |
| 65 | arles-camargue-et-gardians | Arles | Spécialité | 7 | La capitale d'une nation Camargue — Taureaux, gardians et costume d'Arlésienne : la capitale d'une nation Camargue. | 3 |
| 66 | chamonix-conquete-du-mont-blanc | Chamonix-Mont-Blanc | Sport | 8 | La conquête du Mont-Blanc — 1786, Balmat et Paccard : la première ascension qui a inventé l'alpinisme. | 4 |
| 67 | chamonix-guides-et-cimes | Chamonix-Mont-Blanc | Histoire & secrets | 7 | Guides et cimes — la Compagnie des guides, ses héros et ses drames : vivre de la montagne qui tue. | 4 |
| 68 | chamonix-village-et-panoramas | Chamonix-Mont-Blanc | Paysage | 6 | Village et panoramas — lire le village à travers ses rues, ses places et ses vues sur le massif. | 4 |
| 69 | colmar-petite-venise | Colmar | Histoire & secrets | 8 | La ville-décor qui a failli disparaître — tanneurs, maraîchers et canaux, la ville-décor qui a failli disparaître. | 4 |
| 70 | colmar-retable-et-bartholdi | Colmar | Art | 8 | Du retable à la Liberté — du retable d'Issenheim à la statue de la Liberté, deux chefs-d'œuvre nés ici. | 4 |
| 71 | colmar-enseignes-et-facades | Colmar | Architecture | 6 | Enseignes et façades — observer les enseignes, maisons et détails qui donnent son caractère au centre ancien. | 4 |
| 72 | carcassonne-cite-assiegee | Carcassonne | Histoire & secrets | 8 | La Cité assiégée — Dame Carcas, croisade albigeoise : deux mille ans de siège et une légende de cloches. | 4 |
| 73 | carcassonne-resurrection-viollet-le-duc | Carcassonne | Art | 7 | La résurrection de Viollet-le-Duc — condamnée à la démolition en 1850, ressuscitée par un architecte fou de Moyen Âge. | 4 |
| 74 | carcassonne-bastide-saint-louis | Carcassonne | Histoire urbaine | 6 | La Bastide Saint-Louis — parcourir la ville basse, son plan régulier, ses places et ses boulevards. | 4 |
| 75 | la-rochelle-tours-et-siege | La Rochelle | Histoire & secrets | 9 | Les tours et le siège — 1628, Richelieu affame la ville : le siège qui a brisé la République protestante de l'Atlantique. | 4 |
| 76 | la-rochelle-capitale-de-la-voile | La Rochelle | Sport | 8 | Capitale de la voile — du Vieux-Port aux Minimes : la ville qui vit vent debout. | 4 |
| 77 | la-rochelle-arcades-quais-et-tours | La Rochelle | Architecture maritime | 6 | Arcades, quais et tours — suivre les arcades et les quais jusqu’aux tours du vieux port. | 4 |
| 78 | tours-cite-royale | Tours | Histoire & secrets | 9 | Quand la Loire était le centre de la France — Saint Martin, Louis XI et la soie : quand la Loire était le centre de la France. | 4 |
| 79 | tours-loire-quais-et-passerelles | Tours | Paysage urbain | 6 | Loire, quais et passerelles — découvrir comment la Loire relie quais, jardins et quartiers. | 4 |
| 80 | amboise-leonard-dernier-voyage | Amboise | Art | 7 | Le dernier voyage de Léonard — 1516 : Léonard de Vinci traverse les Alpes avec la Joconde dans ses malles, pour mourir ici. | 4 |
| 81 | versailles-ville-du-roi-soleil | Versailles | Histoire & secrets | 9 | La ville-machine du Roi-Soleil — hors du château, la ville-machine inventée pour servir la cour du Roi-Soleil. | 4 |
| 82 | versailles-perspectives-et-jardins | Versailles | Paysage | 6 | Perspectives et jardins — lire les axes, murs et jardins qui prolongent la ville royale. | 4 |
| 83 | chartres-cathedrale-de-lumiere | Chartres | Art | 7 | La cathédrale de lumière — le bleu de Chartres, les bâtisseurs anonymes et le labyrinthe, la lumière faite pierre. | 4 |
| 84 | honfleur-berceau-impressionniste | Honfleur | Art | 7 | Le port qui a appris aux peintres à sortir — Boudin, Monet et la ferme Saint-Siméon, le port qui a appris aux peintres à peindre le ciel en plein air. | 4 |
| 85 | honfleur-port-des-explorateurs | Honfleur | Histoire & secrets | 7 | Le vieux bassin des grands départs — de Champlain parti fonder Québec aux terre-neuvas, le port des grands départs. | 4 |
| 86 | etretat-falaises-des-peintres | Étretat | Art | 6 | La falaise la plus romanesque de France — Monet, Maupassant et Arsène Lupin, la falaise qui a inspiré peintres et romanciers. | 4 |
| 87 | deauville-planches-et-cinema | Deauville | Art | 7 | Les Planches, écran de sable — le festival, les Planches et les parasols : la plage la plus filmée de France. | 4 |
| 88 | deauville-hippodromes-et-polo | Deauville | Sport | 6 | Le royaume du cheval — yearlings, polo et bains de mer : le sport comme art de vivre normand. | 4 |
| 89 | giverny-jardins-de-monet | Giverny | Art | 6 | Le jardin d'un seul homme — le jardin comme chef-d'œuvre : quarante ans de nymphéas peints depuis un pont japonais. | 4 |
| 90 | mont-saint-michel-la-merveille | Mont-Saint-Michel | Histoire & secrets | 7 | La Merveille de l'Occident — un archange exigeant, mille ans de chantier impossible : la Merveille de l'Occident. | 4 |
| 91 | mont-saint-michel-remparts-et-baie | Mont-Saint-Michel | Paysage | 6 | Remparts et baie — comprendre le dialogue entre le rocher, ses défenses et l’immensité de la baie. | 4 |
| 92 | beaune-hospices-et-charite | Beaune | Histoire & secrets | 7 | Les Hospices et le paradis d'un chancelier — 1443, un chancelier coupable bâtit le plus bel hôpital du monde pour acheter son paradis. | 4 |
| 93 | beaune-remparts-et-bastions | Beaune | Patrimoine | 6 | Remparts et bastions — faire le tour des défenses, portes et points de vue de la ville ancienne. | 4 |
| 94 | sarlat-perigord-medieval | Sarlat | Histoire & secrets | 7 | La ville médiévale la plus intacte de France — sauvée par une loi de 1962, la ville médiévale la plus intacte de France. | 4 |
| 95 | sarlat-places-passages-et-facades | Sarlat | Architecture | 6 | Places, passages et façades — parcourir places, passages et façades de pierre dans le centre ancien. | 4 |
| 96 | albi-toulouse-lautrec | Albi | Art | 7 | Le comte brisé de Montmartre — le petit comte brisé devenu peintre de Montmartre, et le musée que sa mère a arraché. | 4 |
| 97 | albi-cite-episcopale | Albi | Histoire & secrets | 7 | La forteresse de brique rouge — une cathédrale-forteresse de brique rouge, la réponse écrasante de l'Église aux Cathares. | 4 |
| 98 | nimes-rome-francaise | Nîmes | Histoire & secrets | 8 | La ville qui n'a jamais quitté Rome — arènes, Maison carrée, crocodile : la ville qui n'a jamais quitté l'Empire romain. | 4 |
| 99 | nimes-portes-et-jardins | Nîmes | Histoire urbaine | 6 | Portes et jardins — suivre les entrées anciennes, les places et les jardins de la ville. | 4 |
| 100 | cassis-port-falaises-et-calanques | Cassis | Paysage | 6 | Port, falaises et calanques — lire la rencontre du village, des falaises et des calanques depuis des points publics. | 4 |

## Synthèse

- 100 visites, dans les mêmes villes que la collection `seed-100` initiale.
- 31 anciens parcours centrés sur gastronomie, boisson ou produit remplacés avec de nouveaux slugs.
- Les thèmes restants couvrent histoire, architecture, art, nature, personnages, patrimoine et sport.
- Registre GPS exhaustif : une ligne attendue par scène, contrôlée par `scripts/audit-100-visites.mjs`.
- Production audio, publication et toute écriture distante restent hors périmètre.

## Vagues de production

- **Vague 1 (20)** : Toulouse, Strasbourg, Rouen, Annecy, Saint-Malo, Bayonne.
- **Vague 2 (18)** : Paris, Lyon, Marseille, Bordeaux, Lille, Biarritz.
- **Vague 3 (27)** : Nice, Nantes, Montpellier, Rennes, Reims, Dijon, Avignon, Aix-en-Provence, Arles.
- **Vague 4 (35)** : Chamonix, Colmar, Carcassonne, La Rochelle, Tours, Amboise, Versailles, Chartres, Honfleur, Étretat, Deauville, Giverny, Mont-Saint-Michel, Beaune, Sarlat, Albi, Nîmes, Cassis.

## Doublons interdits déjà couverts ailleurs

Paris rive droite secrète, Lyon traboules/soie, Bordeaux port de la Lune,
Marseille 2600 ans, Lille âme flamande, Biarritz impératrice, Grasse et les
visites Riviera `seed-am-*`. Ces collections restent hors périmètre.
