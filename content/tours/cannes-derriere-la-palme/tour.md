# Cannes — Derrière la Palme

**Ville :** Cannes
**Thématique :** Douze jours contre mille ans — la ville qui existait avant le Festival
**Distance / durée :** ~2,8 km / ~1 h 45 (Croisette d'est en ouest, puis montée au Suquet)
**POIs héros :** n° 4, n° 7
**Billets :** musée de la Castre pour le POI 7, facultatif — la scène se joue aussi depuis l'esplanade. Les six autres haltes sont gratuites.

## Description catalogue (vouvoiement)

Douze jours par an, cette ville est le centre du monde. Les trois cent
cinquante-trois autres, c'est un village de pêcheurs sur une colline. En sept
haltes et moins de trois kilomètres, on remonte la Croisette d'est en ouest —
l'Art déco d'un palace bâti quand le Festival n'existait pas, les empreintes de
mains dans le béton, le bloc gris que les Cannois appellent le Bunker et dont
la toute première édition, en septembre 1939, a été annulée par la guerre. Puis
on tourne le dos à la mer : deux rues derrière, un marché couvert qui se moque
du Festival, et une colline où un cordon sanitaire a, en 1834, décidé du destin
de la ville. Terminus au sommet de la tour, d'où l'on voit tout.

## Thèmes

['cinéma', 'histoire', 'patrimoine']

## POIs

| # | Titre | Lat | Lng | Fichier | Précision | Desc (1 ligne) |
|---|-------|-----|-----|---------|-----------|----------------|
| 1 | Hôtel Martinez | — | — | 01-hotel-martinez.md | — | L'Art déco de la fin des années vingt : bâti quand le Festival n'existait pas. |
| 2 | La Croisette — les palaces | — | — | 02-la-croisette.md | — | Le Marché du Film derrière les façades, que personne ne filme. |
| 3 | Allée des Étoiles du Cinéma | — | — | 03-allee-des-etoiles.md | — | Des mains et non des pieds : la seule trace non reproductible du métier. |
| 4 | Palais des Festivals et des Congrès | — | — | 04-palais-des-festivals.md | — | Le Bunker, et l'édition de septembre 1939 que la guerre a annulée. |
| 5 | Marché Forville | — | — | 05-marche-forville.md | — | Le deuxième Cannes, celui qui tient debout onze mois sur douze. |
| 6 | Le Suquet | — | — | 06-le-suquet.md | — | Décembre 1834 : un cordon sanitaire arrête Lord Brougham. |
| 7 | Musée de la Castre — la tour du Suquet | — | — | 07-musee-de-la-castre.md | — | La Croisette vue comme un plan, et les îles au large. |

Coordonnées résolues par `node scripts/resout-gps-pois.mjs --tour=cannes-derriere-la-palme --ecris`.

## Fil rouge narratif

**Le Festival n'a pas fabriqué Cannes : il est arrivé dans une ville qui
existait déjà.** Le sens de marche sert la démonstration — on part du palace
d'avant le Festival, on traverse le Festival, on finit au village d'avant tout.

1. **Martinez** — Un palace bâti pour des hivernants, avant que le cinéma existe ici.
2. **La Croisette** — Le vrai moteur : une foire commerciale sous le tapis rouge.
3. **Allée des Étoiles** — Le seul objet non reproductible d'un métier d'images.
4. **Palais des Festivals** — 1939 annulé, 1946 fondé. La décision qui compte.
5. **Forville** — La ville qui n'a jamais eu besoin du Festival pour exister.
6. **Le Suquet** — Le hasard fondateur : un cordon sanitaire, en 1834.
7. **La tour** — Douze jours contre mille ans, vus d'en haut.

## Ce qui a changé par rapport à la version précédente

- **Le sens de marche est corrigé, et c'était un vrai bug.** L'ancienne version
  allait Palais → Carlton → Majestic → Martinez en disant deux fois « repartez
  vers l'est ». Or le Majestic est à l'**ouest** du Carlton : le marcheur
  faisait trois cents mètres à contresens avant d'en refaire sept cents. Le
  parcours part maintenant du Martinez, à l'est, et descend la Croisette
  jusqu'au Palais sans aucun retour en arrière.
- **Trois palaces sont ramenés à une scène.** Carlton, Majestic et Martinez se
  succédaient sur la même forme — façade plus anecdote — et le Majestic ne
  portait aucune histoire propre : il servait de prétexte au Marché du Film. Le
  Martinez garde une scène pour son architecture ; le Marché du Film se raconte
  en marchant, scène 2.
- **Deux erreurs factuelles sont corrigées.** Le premier jury de 1946 n'était pas
  présidé par Jean Cocteau (il a présidé en 1953 et 1954) : la scène 4 ne nomme
  plus personne. Et le braquage de 1994 ne portait pas sur quarante millions
  d'euros — ce chiffre est celui d'un autre casse, bien postérieur. L'épisode
  est retiré faute de chiffre sûr.
- **Le nombre de marches n'est plus affirmé.** Il a changé au fil des
  réaménagements du Palais ; la scène invite à les compter plutôt que d'en
  donner un.
- **Deux anecdotes sont retirées** : Sophia Loren faisant photographier ses
  mains avant de les poser, et Orson Welles négociant ses chambres contre sa
  présence. Aucune n'est sourçable.
- **La légende des coupoles du Carlton est conservée**, mais explicitement comme
  légende, et la scène dit qu'elle est presque certainement fausse.
- **Distance corrigée** : 2,2 km annoncés, ~2,8 km réels.

## Points à vérifier

- **Hôtel Martinez** : année d'ouverture (fin des années vingt selon la scène)
  et qualification Art déco.
- **Carlton** : année d'ouverture, nom de l'architecte, et l'origine de la
  légende des coupoles. La scène ne nomme ni l'hôtel ni l'architecte ni la
  courtisane — à compléter seulement si les trois sont sourcés.
- **Marché du Film** : année de création (fin des années cinquante selon la
  scène) et ordre de grandeur des transactions, si l'on veut en donner un.
- **Allée des Étoiles du Cinéma** : année de création et nombre de dalles.
- **Palais des Festivals** : année de livraison, architecte, et le surnom « le
  Bunker » — usage local à confirmer.
- **Festival 1939** : sélection prête, délégations en route, annulation après
  l'invasion de la Pologne ; première édition effective en 1946. À sourcer
  précisément : c'est le cœur de la scène héros.
- **Marché Forville** : date de construction de la halle, et antériorité du
  marché en plein air au même emplacement.
- **Lord Brougham** : décembre 1834, cordon sanitaire sur le fleuve frontière,
  villa bâtie l'année suivante, et son rôle d'entraînement sur la société
  britannique. La scène ne nomme pas la villa, faute de vérification.
- **Tour du Suquet et château de la Castre** : datation de la tour et lien avec
  les moines des îles.
- **Collections du musée de la Castre** : nature du legs et identité du
  collectionneur — la scène ne le nomme pas.
- **Îles de Lérins** : le prisonnier masqué (fin du dix-septième siècle) et
  l'ancienneté de l'abbaye.

## Récapitulatif budgets (150 mots/min)

| Scène | Mots | Durée estimée |
|-------|------|---------------|
| 01 Hôtel Martinez | 164 | ~66 s |
| 02 La Croisette | 195 | ~78 s |
| 03 Allée des Étoiles | 142 | ~57 s |
| 04 Palais des Festivals (héros) | 242 | ~97 s |
| 05 Marché Forville | 162 | ~65 s |
| 06 Le Suquet | 180 | ~72 s |
| 07 La tour du Suquet (héros) | 245 | ~98 s |
| **Total** | **1 330** | **~8 min 50 de texte, ~13 min avec les pauses** |

Sur une promenade de ~1 h 45, la narration occupe ~13 % du temps.
