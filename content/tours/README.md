# Tours Premium — Packages de Contenu

5 visites audio premium pour la Côte d'Azur, avec narrations complètes (~45 min chacune).

## Tours

| # | Tour | Ville | Guide | Durée | POIs | Thème |
|---|------|-------|-------|-------|------|-------|
| 1 | **Crimes & Scandales de la Riviera** | Nice | Victor Lemaire | 55 min | 10 | FUN |
| 2 | **Monaco — Dynastie, Casino et Démesure** | Monaco | Elena Castellano | 55 min | 8 | Histoire/Luxe |
| 3 | **Èze — Le Vertige du Nid d'Aigle** | Èze | Isabelle Moretti | 48 min | 8 | Nature/Philo |
| 4 | **Villefranche — Cocteau et la Rade Secrète** | Villefranche | Claire Duval | 50 min | 7 | Art/Maritime |
| 5 | **Cap Ferrat — La Presqu'île des Milliardaires** | Cap Ferrat | Thomas Bellini | 52 min | 7 | Luxe/Jardins |

## Structure par tour

```
content/tours/{slug}/
  script-narration.md    — Script complet de narration (~6500-7500 mots)
```

## Images

```
public/images/tours/{slug}.svg           — Image hero du tour (800x400)
public/images/tours/pois/{slug}/poi_N.svg — Images POI (600x400)
public/images/cities/{city}.svg           — Images ville (800x500)
```

Les SVG sont des placeholders avec gradient — remplacer par de vraies photos .jpg pour la production.

## Scripts

- `scripts/seed-premium-tours.mjs` — Seed DynamoDB (guides, tours, sessions, scènes, reviews, stats)
- `scripts/generate-tour-images.mjs` — Génère les images placeholder SVG

## Usage

```bash
# Seeder la base DynamoDB
node scripts/seed-premium-tours.mjs

# Re-seeder (nettoie d'abord les données existantes)
node scripts/seed-premium-tours.mjs --clean

# Générer les images placeholder
node scripts/generate-tour-images.mjs
```

## Préfixe seed

Toutes les données utilisent le préfixe `seed-pm-` pour isolation. Le flag `--clean` supprime uniquement les données avec ce préfixe.

## Nouveaux guides

| Guide | Ville | Spécialité |
|-------|-------|------------|
| Victor Lemaire | Nice | Ex-commissaire, crimes et anecdotes (thème fun) |
| Elena Castellano | Monaco | Historienne monégasque, dynastie Grimaldi |
| Isabelle Moretti | Èze | Historienne, philosophie et panoramas |
| Claire Duval | Villefranche | Art, Cocteau et patrimoine maritime |
| Thomas Bellini | Cap Ferrat | Architecture, jardins et luxe |
