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

| # | POI | Adresse / repère | Lat | Lng | Texte à coller |
|---|-----|------------------|-----|-----|----------------|
| 1 | Hôtel du Palais | 1 Av. de l'Impératrice | 43.4859 | -1.5618 | `scenes/01-hotel-du-palais.md` |
| 2 | Église Alexandre-Nevski | 8 Av. de l'Impératrice | 43.4849 | -1.5593 | `scenes/02-eglise-russe.md` |
| 3 | Grande Plage | Promenade / Bd du Général de Gaulle | 43.4835 | -1.5605 | `scenes/03-grande-plage.md` |
| 4 | Casino municipal | 1 Av. Édouard VII | 43.4820 | -1.5612 | `scenes/04-casino.md` |
| 5 | Chapelle Impériale | Rue Pellot | 43.4801 | -1.5585 | `scenes/05-chapelle-imperiale.md` |
| 6 | Port des Pêcheurs | Port des Pêcheurs | 43.4843 | -1.5658 | `scenes/06-port-des-pecheurs.md` |
| 7 | Rocher de la Vierge | Plateau de l'Atalaye / passerelle | 43.4836 | -1.5688 | `scenes/07-rocher-de-la-vierge.md` |
| 8 | Port Vieux | Plage du Port Vieux | 43.4826 | -1.5675 | `scenes/08-port-vieux.md` |
| 9 | Côte des Basques | Belvédère de la Côte des Basques | 43.4802 | -1.5672 | `scenes/09-cote-des-basques.md` |

> ⚠️ Ces coordonnées sont des estimations pour amorcer le placement. À contrôler
> et corriger précisément dans l'éditeur (recherche d'adresse + glisser le marqueur).

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
