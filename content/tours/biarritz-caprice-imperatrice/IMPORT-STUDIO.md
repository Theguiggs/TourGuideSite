# Import dans le Studio — mode d'emploi

Ce fichier t'aide à recréer la visite **Biarritz — Le Caprice de l'Impératrice**
dans l'espace guide (`/guide/studio`). Les fichiers `scenes/*.md` sont le
**manuscrit** : tu copies-colles le texte scène par scène.

## 1. Créer la session / le tour

Dans `/guide/studio`, crée une nouvelle session, puis renseigne l'onglet **Général** :

| Champ | Valeur |
|-------|--------|
| Titre | Biarritz — Le Caprice de l'Impératrice |
| Ville | Biarritz |
| Durée | ~80 min |
| Distance | ~3 km |
| Nombre de POIs | 9 |
| Difficulté | facile |
| Langue principale | fr |
| Thèmes | histoire, Belle Époque, Second Empire, patrimoine, mer |
| Description | *(voir bloc ci-dessous)* |

**Description longue proposée :**

> Comment le caprice d'une impératrice a transformé un village de chasseurs de baleines en plage des têtes couronnées d'Europe. De la Villa Eugénie au Rocher de la Vierge, du dôme russe à la naissance du surf, cette promenade au fil de l'eau raconte la splendeur et la chute d'un monde — et la capacité de Biarritz à toujours attraper la vague suivante.

## 2. Itinéraire — les 9 POIs (onglet Itinéraire)

Coordonnées **approximatives** : dans l'éditeur d'itinéraire, tu peux aussi
**rechercher l'adresse** (le marqueur se place automatiquement) puis ajuster le
point à la main. Vérifie chaque emplacement sur la carte avant de valider.

| # | POI | Adresse / repère | Lat | Lng | Fiabilité | Texte à coller |
|---|-----|------------------|-----|-----|-----------|----------------|
| 1 | Hôtel du Palais | 1 Av. de l'Impératrice | 43.4867 | -1.5564 | adresse officielle (entrée) | `scenes/01-hotel-du-palais.md` |
| 2 | Église Alexandre-Nevski | 8 Av. de l'Impératrice | 43.4850 | -1.5577 | estimé ⚑ | `scenes/02-eglise-russe.md` |
| 3 | Grande Plage | Promenade / mi-plage | 43.4843 | -1.5601 | estimé ⚑ | `scenes/03-grande-plage.md` |
| 4 | Casino Barrière | 1 Av. Édouard VII | 43.4836 | -1.5597 | source web | `scenes/04-casino.md` |
| 5 | Chapelle Impériale | Rue Pellot | 43.4832 | -1.5586 | source (Monumentum) | `scenes/05-chapelle-imperiale.md` |
| 6 | Port des Pêcheurs | Allée Port des Pêcheurs | 43.4829 | -1.5653 | source web | `scenes/06-port-des-pecheurs.md` |
| 7 | Rocher de la Vierge | Plateau de l'Atalaye / passerelle | 43.4834 | -1.5684 | source web | `scenes/07-rocher-de-la-vierge.md` |
| 8 | Port Vieux | Plage du Port Vieux | 43.4825 | -1.5677 | source web | `scenes/08-port-vieux.md` |
| 9 | Côte des Basques | Belvédère nord (Bd du Prince de Galles) | 43.4805 | -1.5672 | estimé ⚑ | `scenes/09-cote-des-basques.md` |

> ⚠️ Coordonnées WGS84 (décimal). Les lignes marquées ⚑ sont estimées ; les autres
> proviennent de sources web croisées. À **contrôler dans l'éditeur** (recherche
> d'adresse + glisser le marqueur). Les points 1 et 3 sont géocodés côté avenue
> (entrée) — tu peux les glisser vers le front de mer si tu veux coller au récit.
> La plage de la Côte des Basques s'étend loin vers le sud ; on place ici le
> belvédère nord pour la continuité de marche avec le Port Vieux.

## 3. Scènes (onglet Scènes / Éditeur de texte)

Pour chaque POI, crée une scène et **colle le corps** du fichier `.md`
correspondant (le texte sous la ligne `---`, en gardant les balises
`<break time="Xs"/>`).

## 4. Audio (onglet Enregistrement)

Deux options :
- **Enregistrer ta voix** scène par scène dans le studio d'enregistrement.
- **TTS** : générer la voix via la synthèse vocale (microservice), puis nettoyer les silences.

Rappel format audio (cf. visite de Grasse) : **SSML minimal** — seul
`<break time="Xs"/>` est conservé ; les autres balises sonnent mal sur edge-tts.

## 5. Photos → Prévisualisation → Soumission

Ajoute les photos des POIs (onglet Photos), vérifie le rendu (Prévisualisation),
puis soumets pour modération (Soumission).
