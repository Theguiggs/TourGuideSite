# EV-6 — Recette et mesures

Statut : développement de recette terminé localement ; validation intégrée et physique partielle, livraison non validée.

Fichiers : `playwright.experience.config.ts`, `e2e/tests/visitor-experience.spec.ts`, exclusion correspondante dans `playwright.config.ts`, corrections de synchronisation dans `src/lib/catalogue/filter-url.ts` et `src/lib/checkout/stripe-return.ts`, captures `docs/verification-experience/`, rapport `bmad/revue-ev-6.md`. Les mesures d’achat ont été intégrées à EV-3.

Spécification : [EV-6](../docs/spec-ev-6-recette.md). Trois revues indépendantes, corrections, tests automatisés et captures réalisés. Le [rapport de recette](revue-ev-6.md) distingue les 2507 tests portail, les 26 tests backend et les 13 scénarios navigateur réussis des vérifications bloquées ou physiques non exécutées. Aucun push ni déploiement.
