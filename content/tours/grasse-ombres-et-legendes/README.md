# Grasse — Ombres & Légendes

**Durée totale narration :** ~37 min de texte (~5 520 mots) + ~5 min de pauses `<break>` ≈ **~42 min audio**
**Distance :** ~1,8 km | **POIs :** 6
**Thème :** Légendes & mystères — la face sombre de la ville-parfum (peste, pénitents, superstitions provençales, le crime imaginé du parfumeur)
**Ton :** Confidence éditoriale Murmure (voix basse, intime, tutoiement), registre nocturne et grave
**Parcours frère :** [Grasse — Les Routes du Parfum](../grasse-routes-du-parfum/README.md) (même ville, lentille inverse)

## Structure

| # | Scène | Position | Durée texte | Mots |
|---|---|---|---|---|
| 1 | [Place aux Aires, à la nuit tombée](scenes/01-place-aux-aires-nuit.md) | Centre place, près de la fontaine, fin de journée | ~6 min | ~890 |
| 2 | [Ruelle des tanneurs & la peste](scenes/02-ruelle-tanneurs-peste.md) | Partie étroite de la rue Droite | ~6 min | ~895 |
| 3 | [Les Pénitents Noirs](scenes/03-penitents-noirs.md) | Parvis cathédrale / Place du Petit Puy | ~6 min | ~905 |
| 4 | [La masco & le Drac](scenes/04-masco-et-drac.md) | Devant une fontaine / lavoir ancien | ~7 min | ~1030 |
| 5 | [Le parfumeur assassin](scenes/05-le-parfum-assassin.md) | Espace dégagé du haut de la vieille ville | ~7 min 25 | ~1110 |
| 6 | [Belvédère nocturne](scenes/06-belvedere-nocturne.md) | Terrasse panoramique, face à la plaine | ~4 min 35 | ~690 |

## Conventions éditoriales

Identiques au parcours parfum (cohérence de marque Murmure) :

- **Tutoiement** systématique
- **Format SSML minimal** — seul `<break time="Xs"/>` est conservé (décision audio 2026-05-18 : les autres tags sonnent robotiques sur edge-tts)
- **Ton porté par l'écriture** : phrases courtes, ruptures, italiques narratifs, répétitions volontaires
- **Invitations sensorielles** dans chaque scène (regard / olfactif / toucher la pierre / pause silencieuse) — ici déclinées en clé nocturne
- **Transitions** : chaque scène finit par une instruction de marche + accroche pour la suivante

## Fil rouge narratif

Une seule thèse, filée de bout en bout : **la ville la plus parfumée du monde est aussi celle qui a eu le plus à cacher — le parfum comme alibi, comme masque, comme distillation de l'ombre.**

1. **Place aux Aires (nuit)** — Pose la thèse : sous le marché aux fleurs, les tanneurs ; le parfum né du besoin de masquer la charogne
2. **Tanneurs & peste 1348** — La peur des miasmes → on combat la mort par l'odeur ; racine sombre de la parfumerie
3. **Pénitents Noirs** — Les hommes en noir qui escortaient morts et condamnés ; la légende du « cortège où l'on compte toujours un de trop »
4. **Masco & Drac** — Superstition provençale : l'esprit des eaux, la sorcière-guérisseuse ; même savoir des plantes que les parfumeurs, anobli chez l'un, brûlé chez l'autre
5. **Le Parfum (Süskind)** — Grenouille, le parfumeur-meurtrier de fiction ; l'enfleurage poussé jusqu'au crime ; le vertige au cœur du métier
6. **Belvédère nocturne** — Clôture : vivants au-dessus, morts en dessous, le parfum comme voile ; « on ne nie pas l'ombre, on la distille »

## Notes de véracité (genre « légendes »)

Tour atmosphérique, mais ancré dans du réel vérifiable. Faits historiques : peste noire de 1348 en Provence (~50 % de mortalité), théorie des miasmes, confréries de Pénitents Noirs (charité funéraire + accompagnement des condamnés), enfleurage (technique grassoise réelle), *Le Parfum* de Patrick Süskind (1985, intrigue effectivement située à Grasse). Folklore provençal réel : le **Drac** (esprit des eaux) et la **masco** (sorcière) sont des légendes attestées du domaine occitan/provençal. Les éléments purement légendaires sont **explicitement marqués comme tels** dans la narration (« une légende », « on raconte que… »). Aucun meurtre réel ni personne réelle nommée n'est présenté comme fait.

## Points à compléter avant publication

- **GPS par scène** : approximatifs dans le script de seed — à affiner sur place / sur carte
- **Photos** (`photosRefs`) : aucune pour l'instant
- **Audio** : à générer (TTS Murmure) — texte SSML prêt
- **Titres de POI exacts** : vérifier les noms de rues/places réels (fontaine de la scène 4, belvédère de la scène 6)
