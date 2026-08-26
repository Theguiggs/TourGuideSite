# Certifications de la retraduction

Chaque fichier de ce répertoire est le compte rendu daté d'une exécution de
`scripts/certifie-retraduction.mjs` contre un backend nommé.

Ces journaux sont **versionnés**, contrairement aux sauvegardes de
`content/translations/_backup/` que `.gitignore` écarte. C'est délibéré : une
preuve qui ne quitte pas le poste qui l'a produite ne prouve rien à personne
d'autre.

## Pourquoi ce répertoire existe

Les 101 Visites du catalogue ont été retraduites et leur audio MarianMT purgé
sur le backend vivant le 2026-08-23. L'opération a réussi, mais `retrad-3-seed.mjs`
n'écrivait rien : il ne restait aucune trace de ce qui avait été fait, ni de
quoi le redémontrer. Le SPEC exige pourtant que toute opération soit traçable de
bout en bout et réexécutable sans doublon.

Le contrôleur ne refait pas l'opération — il l'**établit**, à partir de l'état
réel, autant de fois qu'on veut.

## Ce qu'un journal atteste

Pour chaque Visite du catalogue et chaque langue :

- le texte en base est **identique** au corpus relu de `content/translations/out` ;
- le nombre de segments égale le nombre de scènes de la source, et les `sceneId`
  sont les mêmes ;
- le balisage de pause `<break …/>` est identique à celui de la **source
  française** ;
- aucun segment traduit ne porte plus d'`audioKey` ni le statut
  `tts_generated` — l'ancien audio est **déréférencé** ;
- aucun segment ne porte plus le marqueur d'origine `marianmt` ;
- `sourceTextHash` correspond à la source : sans quoi le Studio afficherait la
  traduction comme périmée alors que le contrôleur la dirait conforme ;
- le texte traduit n'est pas resté **identique au français** — une scène non
  traduite se voit, au lieu de passer pour traduite ;
- toute **Visite publiée du catalogue est couverte** par un fichier de corpus :
  le contrôleur itère le corpus, ce rapprochement l'empêche de passer une Visite
  sous silence ;
- le français est intact : texte conforme à la source, audio présent, scène non
  archivée.

## Ce qu'un journal N'ATTESTE PAS

- **L'absence de pivot par une langue intermédiaire.** C'est une propriété du
  procédé, pas des données : aucun contrôle ne la lit dans un texte. Ce qui est
  établi, c'est qu'aucun segment de catalogue ne porte plus le marqueur
  `marianmt`, et que le texte en base est bien le corpus relu sous
  [`CONSIGNES.md`](../CONSIGNES.md), qui interdit le pivot.
- **La qualité de la traduction** — registre tutoyant, toponymes laissés en
  français, phrases dites plutôt qu'écrites. Cela relève de la relecture
  humaine, pas d'un programme.
- **L'archivage de l'ancien audio.** Le contrôle constate qu'aucun segment ne
  *référence* plus d'audio traduit ; il ne vérifie pas que les objets ont bien
  été copiés sous `archive-tts-marianmt/` dans S3. Déréférencé n'est pas
  archivé.

## Quand le relancer

- Avant toute **fabrication d'audio** : la synthèse coûte de l'argent, et une
  divergence non détectée se paie en secondes de voix.
- Après toute vague de traduction ou de semis.
- Après tout changement de backend — le journal nomme l'API certifiée, et deux
  jeux de tables morts coexistent sur le compte.

```
npm run certifie:retraduction                       # certifie et journalise
node scripts/certifie-retraduction.mjs --tour <id>  # une seule Visite
node scripts/certifie-retraduction.mjs --sans-journal
```

À lancer **depuis la racine de `TourGuideWeb`** : les chemins du journal sont
relatifs au répertoire courant. Trois balayages complets — `SceneSegment`,
`StudioScene`, `GuideTour` — sont exécutés même en mode `--tour`, et des
identifiants AWS en lecture sur DynamoDB sont nécessaires.

## Codes de sortie

| Code | Sens | Suite à donner |
|---|---|---|
| `0` | conforme, preuve écrite | rien |
| `1` | **non conforme** | lire les griefs, réparer les données |
| `2` | panne — corpus absent, backend illisible, drapeau mal formé | rien n'a été certifié ; corriger l'environnement |
| `3` | conforme mais **preuve non écrite** | le verdict n'est pas opposable ; vérifier les droits d'écriture |

Distinguer `1` de `3` est le point : « le catalogue est en défaut » et « je n'ai
pas pu écrire la preuve » n'appellent pas la même réaction.

## Reproductibilité

Chaque journal porte l'**empreinte SHA-256 du corpus** qu'il a comparé, la
provenance du backend (`resolutionPar`), le périmètre (complet ou `--tour`) et
la valeur de `E2E_ALLOW_TEST_TOURS` — qui influe sur le verdict en faisant
entrer les Visites de test dans le catalogue. Sans ces quatre éléments, deux
journaux au même verdict pourraient parler de deux choses différentes.

Les fins de ligne du corpus sont figées en LF par `.gitattributes` : sans cela,
`core.autocrlf` ferait diverger toutes les comparaisons sur un poste Windows
fraîchement cloné, et l'empreinte changerait d'une machine à l'autre.
