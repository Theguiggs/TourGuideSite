# Scènes courtes — Le Caprice de l'Impératrice

Versions condensées des 9 scènes, recalibrées suite aux tests utilisateurs
de juillet 2026 (« descriptions trop longues ») selon le standard du prompt
maître (`content/prompts/prompt-narration-visite.md`) : 150–225 mots par POI
standard, ≤ 300 mots pour les 2 POIs héros (scènes 1 et 9).

- **Les originales dans `../scenes/` restent intactes** : elles servent de
  matériau source et de candidates « chapitre En savoir plus ».
- Même format que les originales (en-tête + `---` + corps SSML minimal),
  compatible `readScene()` de `scripts/seed-biarritz-tour.mjs` — pointer le
  seed sur ce dossier pour re-seeder la version courte.
- Le fil rouge, l'ordre des POIs et les transitions de marche sont conservés.

## Récapitulatif budgets (150 mots/min)

| Scène | Avant | Après | Durée |
|-------|-------|-------|-------|
| 01 Hôtel du Palais (héros) | 1204 | 237 | ~95 s |
| 02 Église russe | 893 | 221 | ~88 s |
| 03 Grande Plage | 1070 | 224 | ~90 s |
| 04 Casino | 1161 | 222 | ~89 s |
| 05 Chapelle Impériale | 1095 | 221 | ~88 s |
| 06 Port des Pêcheurs | 1069 | 225 | ~90 s |
| 07 Rocher de la Vierge | 1084 | 217 | ~87 s |
| 08 Port Vieux | 829 | 224 | ~90 s |
| 09 Côte des Basques (héros) | 1158 | 298 | ~119 s |
| **Total** | **9563 (~64 min)** | **~2089 (~14 min)** | **÷ 4,6** |

Pour une balade d'environ 90 minutes, la narration passe de 71 % à ~15 %
du temps de visite.
