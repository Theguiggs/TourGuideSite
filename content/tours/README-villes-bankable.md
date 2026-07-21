# Tours « Grandes Villes » — Scripts de narration (voix Guillaume)

5 visites audio LONGUES (~1h30-2h) à pied, une par grande ville bankable, narrées à la **première personne par Guillaume** (pas de guide fictif), registre **curieux & érudit** (vouvoiement, vraie histoire racontée avec passion).

> Statut : **scripts de narration uniquement** (markdown). Pas encore de seed DB, pas d'audio TTS — voir « Étapes suivantes ».

## Tours

| Ville | Slug | Thème | POIs | ~Mots | ~Durée |
|-------|------|-------|------|-------|--------|
| **Paris** | `paris-secrets-rive-droite` | Paris secret rive droite — passages, cours cachées, Marais | 18 | ~14 700 | ~1h40 |
| **Lyon** | `lyon-traboules-soie` | Vieux Lyon → Fourvière → Croix-Rousse — traboules, soie, canuts | 18 | ~16 400 | ~1h45 |
| **Bordeaux** | `bordeaux-port-de-la-lune` | La Belle endormie — pierre blonde, port atlantique, Chartrons, vin | 18 | ~15 450 | ~1h40 |
| **Marseille** | `marseille-2600-ans` | La plus vieille ville de France — Vieux-Port grec → Panier → Bonne Mère | 17 | ~16 200 | ~1h50 |
| **Lille** | `lille-ame-flamande` | Capitale des Flandres — baroque flamand, Vauban, de Gaulle, estaminet | 17 | ~15 400 | ~1h40 |

Chaque dossier contient `script-narration.md` : en-tête (auteur, ville, thème, durée, distance, POIs) + une scène par POI (`## Scène N — Lieu : Sous-titre`, GPS approximatif, narration 750-1000 mots, phrase de transition vers le POI suivant).

## Parti pris éditorial
- **Voix** : « je » = Guillaume, vouvoiement de l'auditeur. Aucun personnage/métier inventé (contrairement aux tours Côte d'Azur en `seed-pm-` qui utilisent des guides fictifs).
- **Ordre des POIs** : itinéraire de marche cohérent (proximité géographique + arc narratif), pas un simple listing.
- **Rigueur** : faits ancrés dans l'histoire établie ; légendes signalées (« on raconte que ») ; aucune statistique précise inventée. GPS fournis en approximatif **à vérifier / affiner via le traceur Studio** avant production.

## Mise en base — `scripts/seed-villes-bankable.mjs`

Script prêt : parse les 5 markdown et écrit tous les enregistrements DB **payants** (9,99 € / `purchaseType: 'paid'`, `status: 'published'`, `version: 1`, `availableLanguages: ['fr']`, `languageAudioTypes: {fr:'tts'}`, `coverPhotoKey`), avec **tracé officiel** `StudioSession.routePathJson.computedPath` (séquence ordonnée des POIs → trait plein dans l'app), StudioScene par POI (coords + transcript + durée), ModerationItem **approuvé**, TourStats et TourReview. Préfixe d'isolation `seed-villes-`, narrateur unique **Guillaume**.

```bash
# Validation SANS toucher AWS (dry-run par défaut → scripts/seed-villes-bankable.preview.json) :
node scripts/seed-villes-bankable.mjs

# Écriture réelle (après avoir confirmé le backend vivant) :
node scripts/seed-villes-bankable.mjs --app-id=<APP_ID> --confirm
node scripts/seed-villes-bankable.mjs --app-id=<APP_ID> --confirm --clean   # purge d'abord le préfixe
# options : --price=999 (centimes), --env=NONE, --region=us-east-1
```

**Propriétaire** : par défaut les visites sont rattachées au compte réel `steffen.guillaume@gmail.com` (`owner = <sub>::<sub>`, `guideId = 159473d2-…` = son GuideProfile existant) → elles apparaissent dans SON espace guide. Surcharge possible : `--owner=` / `--guide-id=` / `--guide-name=`. Le profil guide n'est PAS recréé (le compte en a déjà un) sauf `--with-profile`.

**Backend vivant = `t5nxxao3orh6za2bjj6uegulru`** (vérifié : c'est l'API dont l'URL `gh4srboqr…` est dans `amplify_outputs.json`). ⚠️ L'autre jeu de tables `4z7fvz7n2bh5rpixdgihjmhdpa` est un **ancien backend** (URL `j5ergths…`, plus utilisé) — c'est là que pointent tous les vieux seeds, devenus obsolètes.

Seed effectué le 2026-06-12 sous le compte réel. **État actuel : `draft` (brouillon)** — mises hors catalogue public le 2026-06-12 en attendant la validation des audios. Visibles uniquement dans l'espace guide.

### Basculer brouillon ↔ publié (sans toucher au contenu/audio)
⚠️ NE PAS relancer `seed --clean` une fois que tu as édité l'audio dans le Studio : ça réécrirait les scènes et écraserait ton travail. Pour (re)changer le statut, fais une mise à jour ciblée :

```bash
# Republier les 5 quand les audios sont validés :
T=GuideTour-t5nxxao3orh6za2bjj6uegulru-NONE; S=StudioSession-t5nxxao3orh6za2bjj6uegulru-NONE
for c in paris lyon bordeaux marseille lille; do
  aws dynamodb update-item --table-name "$T" --region us-east-1 --key "{\"id\":{\"S\":\"seed-villes-$c\"}}" \
    --update-expression "SET #s = :v" --expression-attribute-names '{"#s":"status"}' --expression-attribute-values '{":v":{"S":"published"}}'
  aws dynamodb update-item --table-name "$S" --region us-east-1 --key "{\"id\":{\"S\":\"seed-villes-$c-session\"}}" \
    --update-expression "SET #s = :v" --expression-attribute-names '{"#s":"status"}' --expression-attribute-values '{":v":{"S":"published"}}'
done
# (remplacer "published" par "draft" pour repasser en brouillon)
```

## Étapes suivantes
1. **Vérification GPS** : ouvrir chaque parcours dans la page Itinéraire du Studio web et caler/tracer le chemin réel (snap-to-road) — les GPS actuels sont approximatifs.
2. **Audio** : générer les pistes par scène via le pipeline TTS (placeholder edge-tts, puis vraie voix Murmure). Les `studioAudioKey` pointent déjà vers `guide-audio/{tourId}/scene_N.aac`.
3. **Photos** : remplacer les `coverPhotoKey` / `photosRefs` placeholder par de vraies images.
