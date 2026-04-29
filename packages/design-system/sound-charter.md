# Charte sonore — TourGuide Player

> Source de vérité technique : `sound.ts` (les valeurs ici sont descriptives).
> Production des assets : déférée à la **Story 6.3** (équipe sound design).

## Posture sonore

**"Papier qui se tourne"** — calme, lente, cultivée.

Le son du Player doit évoquer une bibliothèque, un musée silencieux, un
guide qui parle à voix mesurée. Jamais agressif, jamais musical, jamais
immersif au point de couvrir le commentaire vocal du guide.

Principe directeur : **le commentaire vocal prime**. Les transitions sonores
sont des respirations, pas des événements.

## Plages de valeurs

| Paramètre | Plage | Rationale |
|---|---|---|
| Durée | 50-300 ms (max 500 ms scene change) | Subtilité, pas d'effet "spectacle" |
| Volume | 0.2-0.6 (jamais 1.0) | Modestie, respect de la voix du guide |
| Format | MP3 ou AAC | Compatibilité Web + RN out-of-the-box |
| Sample rate | 44.1 kHz | Qualité standard, mono acceptable |
| Type sample | Foley minimal (page turn, soft click) | Pas de mélodies, pas de musique |

## Transitions Player

Trois moments narratifs déclenchent un son :

1. **`scene`** — passage entre deux POI (220 ms, vol 0.4)
   Évoque le tournement d'une page : "on change de chapitre".

2. **`start`** — démarrage du tour (180 ms, vol 0.5)
   Léger soft click signalant l'ouverture de l'expérience.

3. **`end`** — fin du tour (280 ms, vol 0.4)
   Page qui se referme avec douceur, jamais abrupt.

## Production

La création des fichiers `.aac` / `.mp3` est planifiée en **Story 6.3**
(équipe sound design). En attendant :

- Les `path` dans `sound.ts` sont des placeholders (`sounds/scene.aac`, etc.).
- Le runtime ne doit **PAS** charger ces fichiers tant que la Story 6.3
  n'a pas livré les assets.
- Les consommateurs (Player Web ou RN) doivent vérifier l'existence de
  l'asset avant instanciation, ou se brancher derrière un feature flag.

## À éviter

- Sons synthétiques ou électroniques (sine wave, beep)
- Musique d'ambiance ou nappes
- Effets stéréo larges (le mono mesuré suffit)
- Volumes au-dessus de 0.6 (concurrence avec la voix)
- Durées > 500 ms (impose une pause au lieu de respirer)

## Références

- Story 1.6 (tokens motion + sound) : `_bmad-output/stories/1-6-motion-sound-tokens.md`
- Story 6.3 (production assets) : à créer
- Brief DS posture : `design/handoff/BRIEF-CLAUDE-CODE.md`
