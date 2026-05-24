# Grasse — Les Routes du Parfum

**Durée totale narration :** ~85 min (~12 020 mots)
**Distance :** ~2,2 km | **POIs :** 7
**Thème :** Trois siècles de mutation tanneur → gantier-parfumeur → industriel du parfum
**Ton :** Confidence éditoriale Murmure (voix basse, intime, tutoiement)

## Structure

| # | Scène | Position | Durée | Mots |
|---|---|---|---|---|
| 1 | [Place aux Aires](scenes/01-place-aux-aires.md) | Centre place, près de la fontaine | ~10 min 50 | ~1520 |
| 2 | [Parfumerie Fragonard](scenes/02-fragonard.md) | 20 bd Fragonard, façade jaune | ~12 min 50 | ~1810 |
| 3 | [Musée International de la Parfumerie](scenes/03-mip.md) | Place du Cours, parvis du MIP | ~15 min 50 | ~2210 |
| 4 | [Villa-Musée Fragonard](scenes/04-villa-musee-fragonard.md) | Rue Jean-Honoré Fragonard, portail fer | ~10 min 40 | ~1490 |
| 5 | [Cathédrale Notre-Dame du Puy](scenes/05-cathedrale.md) | Parvis cathédrale | ~10 min 40 | ~1490 |
| 6 | [Place du 24 Août](scenes/06-place-24-aout.md) | Près de la fontaine | ~12 min 30 | ~1750 |
| 7 | [Parfumerie Molinard](scenes/07-molinard.md) | Entrée principale puis belvédère | ~12 min 30 | ~1750 |

## Conventions éditoriales

- **Tutoiement** systématique (proximité, intimité Murmure)
- **Format SSML minimal** — décision audio 2026-05-18 : seul `<break time="Xs"/>` est gardé. Les autres tags (`<prosody>`, `<emphasis>`, `<say-as>`) sonnent trop saccadés/robotiques sur edge-tts et sont désactivés au niveau de la toolbar. À réintroduire plus tard si on bascule sur Azure Neural payant.
- **Ton porté par l'écriture** : phrases courtes, ruptures, italiques narratifs ("c'est leur mot, à eux. *L'âme.*"), répétitions volontaires
- **Invitations sensorielles** dans chaque scène :
  - Regard (lève les yeux, à gauche le balcon en fer forgé…)
  - Olfactif (respire, ferme les yeux, l'odeur de l'encens…)
  - Toucher / pause silencieuse (pose ta paume contre la pierre…)
- **Transitions** : chaque scène se termine par une instruction de marche + accroche narrative pour la suivante
- **Anecdotes denses** mais jamais didactiques — chevillées à un personnage, un objet, un détail

## Pièges SSML à connaître (cf. ssml-toolbar)

- **ffmpeg requis** sur la machine (sinon `AudioSegment.from_file` échoue)
- **Pas de cache** : chaque requête refait la synthèse Azure
- **Pas de `<voice>` / `<lang>`** : edge-tts ne supporte qu'une voix par appel
- **Pas de `<mstts:express-as>`** (styles émotionnels) : non supporté par edge-tts gratuit
- **Pauses > 10s tronquées** côté Azure — déjà respecté dans ces scènes
- **Échapper `<`** par `&lt;` si tu insères du texte brut avec des comparaisons (ex: `< 5°C`)

## Fil rouge narratif

1. **Place aux Aires** — Le marché : où arrive la matière première
2. **Fragonard** — L'atelier : où la matière devient âme
3. **MIP** — 4000 ans de civilisation olfactive (3 objets : flacon égyptien, cassette XVIIIe, formule N°5)
4. **Villa-Musée Fragonard** — Le peintre, écho de l'art parfumier
5. **Cathédrale** — Le sacré (encens, ancêtre du parfum) + 3 Rubens insoupçonnés
6. **Place du 24 Août** — La grande mutation tanneur → parfumeur sur 200 ans
7. **Molinard** — La continuité familiale + le belvédère pour fermer la boucle
