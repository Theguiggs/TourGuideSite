<!--
  Rapport produit par `node scripts/seo-audit.mjs`, en lecture seule, sur une
  production locale en mode bouchon (`NEXT_PUBLIC_USE_STUBS=true`, port 3211).

  Le mode bouchon est délibéré : le contrat d'indexation se lit sur des données
  dont on connaît les traductions — une visite bilingue, une visite française
  seule, une visite à trois langues — et non sur un catalogue de production qui
  change sous les pieds de la mesure.

  L'origine canonique reste le domaine public : le sitemap, les canonical et les
  hreflang portent `https://murmure-visit.com`, et l'audit les interroge sur le
  port local. C'est la même page, vue sous la même identité.

  Aucune donnée personnelle : ni cookie, ni en-tête d'authentification, ni corps
  de réponse conservé.

  La même commande sur le domaine déployé :
    node scripts/seo-audit.mjs --base https://murmure-visit.com --etiquette prod
-->

# Audit SEO — apres-seo

- Base : `http://localhost:3211`
- Date : 2026-09-13T17:04:43.908Z
- Verdict : **conforme** (0 erreurs, 0 avertissements)

## Couverture

| Mesure | Valeur |
|---|---|
| Fichiers sitemap lus | 1 |
| URL listées au sitemap | 65 |
| Pages interrogées | 73 |
| Pages 200 | 71 |
| Pages indexables | 65 |
| Temps de réponse médian | 130 ms |
| Temps de réponse p90 | 180 ms |

## Pages par langue

| Langue | Pages 200 | Indexables | Au sitemap |
|---|---|---|---|
| fr | 19 | 18 | 18 |
| en | 14 | 13 | 13 |
| es | 11 | 10 | 10 |
| de | 8 | 7 | 7 |
| it | 11 | 10 | 10 |
| nl | 8 | 7 | 7 |

## Pages par type

| Type | Pages 200 | Indexables | Au sitemap | Temps médian |
|---|---|---|---|---|
| éditorial | 36 | 30 | 30 | 123 ms |
| visite | 8 | 8 | 8 | 149 ms |
| guide | 8 | 8 | 8 | 127 ms |
| ville | 7 | 7 | 7 | 135 ms |
| accueil | 6 | 6 | 6 | 522 ms |
| catalogue | 6 | 6 | 6 | 156 ms |

## Reste-à-faire éditorial (SEO-8)

Toutes les villes indexées ont une introduction relue.

Aucune anomalie.
