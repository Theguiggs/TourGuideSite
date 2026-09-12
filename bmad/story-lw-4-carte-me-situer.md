# Story LW-4 : carte de l'itinéraire et « me situer »

Status: done

<!-- Épopée LW. Dépend de LW-1. -->

## Story

En tant que **visiteur qui écoute sur place, téléphone en main**,
je veux **voir l'itinéraire, ma position, et quelle étape est la plus proche**,
afin de **m'orienter sans que le site prétende me guider comme l'appli**.

## Contexte vérifié (2026-09-12)

- `PublishedTourContent.walkPath` et `latitude/longitude` par scène sont déjà servis. `react-leaflet` est déjà installé (usage actuel à confirmer ; sinon premier usage visiteur).
- `Permissions-Policy: geolocation=(self)` déjà posée. `navigator.geolocation.watchPosition` fonctionne écran allumé et s'arrête écran verrouillé : c'est le contrat de cette story, dit à l'utilisateur.
- CSP : les tuiles Leaflet viennent d'un domaine externe ; vérifier `img-src` (`csp.ts:89`) et l'ajouter au besoin. Aucun script externe (Leaflet est un module npm).

## Acceptance Criteria

1. **Carte** dans la page visite : trait `walkPath`, marqueurs numérotés des étapes, étape en cours de lecture mise en avant. Chargée dynamiquement (`next/dynamic`, `ssr: false`), après l'itinéraire, pour ne pas alourdir le SSR.
2. **Bouton « Me situer »** — demande la permission au clic seulement, jamais au chargement. Affiche la position et met en avant l'étape la plus proche (distance en mètres, haversine). Cliquer dessus lance sa lecture (LW-1).
3. **Aucun déclenchement automatique.** Texte explicite : « Le guidage automatique et l'écoute écran éteint sont réservés à l'appli. »
4. **Refus ou absence de GPS** — la carte reste utile sans position ; pas de message d'erreur bloquant.
5. **Étapes floutées** — visibles sur la carte comme points verrouillés, sans titre, cohérent avec l'itinéraire.
6. **Épreuves** — test du calcul « étape la plus proche », test du chargement différé, `tsc` à 0.

## Livraison — 13 septembre 2026

Carte Leaflet différée, tracé servi et étapes numérotées ; étape active et point proche distingués. GPS sur geste, arrêté page cachée/démontage, réponses tardives invalidées. Position en mémoire seulement. Étapes verrouillées sans titre et sans lecture. Erreurs locales non bloquantes, contrôles fr/en et région d’annonce permanente. Voir [revue-lw-4.md](revue-lw-4.md). Aucun essai GPS sur appareil physique exécuté.
