# EV-6 — Recette intégrée et mesures

## Périmètre

Vérifier les lots EV-1 à EV-5 et les invariants LW sur la compilation de production locale. Les tests navigateur lisent le catalogue existant ; les paiements unitaires sont simulés, aucun paiement réel n’est autorisé. L’absence de comptes de test opérationnels et d’appareils physiques constitue une limite de recette, jamais une réussite implicite.

## Matrice

- Téléphone 320, 360, 390, 430 ; tablette 768/1024 ; ordinateur 1440 : aucun débordement, actions accessibles, FR/EN.
- Accueil → recherche → ville filtrée → fiche → retour : recherche/filtres persistants, lecteur rendu et audio non lancé sans action.
- Connexion, inscription, récupération et retours EV-1 ; bibliothèque déconnectée et changements de compte testés en simulation.
- Checkout : refus, confirmation retardée, traitement, autre produit, changement d’identité et vérification sans nouvelle commande.
- PWA existante : hors ligne, installation et audio unique ; test sur appareil réel encore requis pour écran verrouillé.
- Lint, TypeScript, Jest complet, build et suites navigateur publiques ; exécution de la suite générale avec rapport de toute configuration bloquante.

## Mesure

Réutiliser les événements de découverte, compte et lecteur LW ; ajouter début et confirmation serveur d’achat. Passage par `trackEvent`/Amplitude soumis au consentement existant, sans email, secret Stripe, URL signée ni localisation précise. La confirmation observée côté client n’est pas un registre de ventes : Stripe/backend restent les sources comptables. Aucun gain de conversion ne peut être annoncé avant déploiement et collecte consentie.

## Sortie

Rapport avec commandes et résultats, captures téléphone/ordinateur et trois revues indépendantes ; commits français locaux. Distinguer développement terminé, recette automatisée réussie et autorisation de mise en production.
