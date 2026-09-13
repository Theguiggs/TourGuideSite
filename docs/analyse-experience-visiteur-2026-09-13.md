# Murmure — recentrer le site sur la visite et le visiteur

Date : 13 septembre 2026. Analyse et propositions ; aucune modification fonctionnelle dans ce lot.

## Diagnostic

L’expérience publique reste organisée pour recruter et accompagner les guides. Les fonctionnalités visiteur existent déjà en grande partie (compte reconnu comme tourist, achats, écoute, reprise, langues, carte), mais leurs portes d’entrée et leurs messages ne forment pas encore un parcours cohérent.

L’accueil actuel confirme ce positionnement : titre consacré à la création de visites, appel à devenir guide, étapes de création, revenus, puis seulement un bloc voyageur secondaire. Ce choix est explicite dans le code : « Pivot guide-first », story 4.6. Le prochain travail est une refonte du parcours public, en conservant un espace de création distinct et les capacités LW déjà réalisées.

Méthode : lecture du code local à 370710e2 et consultation de l’accueil public. Les outils de navigateur interactif ne disposent d’aucun navigateur connecté dans cette session ; aucune nouvelle mesure de mise en page sur téléphone, de performance ou de conversion n’est revendiquée. Certains accès publics ont échoué dans l’outil de lecture ; cela ne prouve pas une panne générale du site. Le code local inclut les LW non encore déployées : distinguer leurs capacités du site public actuellement visible.

## Constats et actions prioritaires

| Priorité | Constat vérifié | Conséquence pour le visiteur | Travail proposé |
| --- | --- | --- | --- |
| P0 | Header non connecté : Espace Guide et téléchargement ; Mes achats apparaît seulement après connexion. | Le visiteur ne trouve pas l’entrée de son compte. | Ajouter « Se connecter » et « Mes visites » sur toutes les pages publiques, même déconnecté. Garder l’accès créateur identifiable mais secondaire. |
| P0 | /guide/login affiche Espace Guide, gestion des parcours, exemple guide@murmure.app, lien Devenir guide. | Un acheteur peut croire qu’il n’a pas le bon compte. | Connexion publique neutre /connexion et /en/sign-in ; même identité Murmure que l’application ; anciennes URL conservées comme alias compatibles. |
| P0 | L’inscription web disponible suit un parcours de création de GuideProfile et demande une ville. | Le nouvel acheteur n’a pas de création de compte visiteur clairement proposée. | Inscription visiteur minimale, confirmation email et récupération de mot de passe ; aucun profil guide créé pour écouter/acheter. Le passage au statut créateur reste une démarche distincte. |
| P0 | L’accueil et ses métadonnées sont orientés création ; le voyageur arrive dans un bloc secondaire. | La promesse « trouver et écouter une visite » n’est pas immédiatement comprise. | Accueil visiteur : destination, proposition de visites, extrait, fonctionnement en trois étapes. Déplacer l’argumentaire créateur vers une page dédiée et aligner accueil anglais, SEO et aperçus de partage. |
| P0 | Le formulaire d’achat intégré demande email/mot de passe sans inscription ni récupération dans ce bloc. | Le parcours peut s’arrêter pour un nouveau client ou un mot de passe oublié. | Authentification visiteur réutilisable depuis l’achat, avec retour garanti sur la visite et conservation du contexte. Texte « Continuer vers le paiement » avant confirmation du paiement. |
| P0 mobile | La fiche passe en une colonne, mais la sidebar d’achat vient après tout le contenu principal et les avis. | L’action commerciale est très éloignée du résumé initial. | Résumé et action proches du titre ; barre d’action mobile persistante et contextuelle, adaptée aux états gratuit/extrait/acheté/en cours. |
| P1 | Le premier bloc principal de la fiche est consacré au guide ; l’écoute arrive dans l’itinéraire. | La décision et le premier extrait sont précédés d’un détour éditorial. | Hiérarchie : visite, bénéfice, durée/distance/langue/prix, extrait, itinéraire, guide et avis. Le guide reste une preuve de confiance. |
| P1 | « Mes achats » présente une liste commerciale ; les reprises sont locales au lecteur. | L’utilisateur revenu pour écouter doit retrouver lui-même la bonne visite. | Bibliothèque « Mes visites » : Reprendre en premier, puis disponibles ; distinguer historique d’achat et usages d’écoute. Ne pas annoncer de progression synchronisée entre appareils sans la réaliser. |
| P1 | Achat débloqué : message invitant encore à ouvrir Murmure avec le même compte. Aide et footer renvoient beaucoup à l’app. | Le site ne rend pas clairement visible la possibilité d’écouter ici. | Après achat : bouton principal « Écouter maintenant », accès à Mes visites ; application proposée pour ses bénéfices propres. Réviser les textes de l’aide, des forfaits et du footer. |
| P1 | Le catalogue recherche les villes et filtre ensuite les visites par langue. | Choisir par temps disponible ou type de sortie nécessite de lire les fiches. | Ajouter durée et prix/gratuité ; thèmes si données fiables. Conserver les filtres dans l’URL et lors du retour à la liste. Garder les villes comme entrée utile. |
| P1 | Le lecteur est dans le flux de la fiche ; carte et reprise sont déjà disponibles localement. | En descendant dans les étapes, les commandes peuvent être loin du pouce. | Mini-lecteur pendant l’écoute et action Reprendre ; coordination avec navigation basse, achat et bannière de mise à jour. Un seul audio reste la règle. |
| P2 | Aide d’abord structurée autour de la création et événement de connexion nommé GUIDE_PORTAL_LOGIN. | L’assistance et les mesures représentent mal les visiteurs. | Aide visiteur prioritaire et événements de parcours visiteur distingués du Studio. Mesurer avant de promettre un gain de conversion. |

## Architecture proposée

Un compte Murmure, plusieurs usages ; ne pas imposer le choix « guide ou visiteur » pour se connecter. Un guide peut également acheter et écouter. Le contexte de départ choisit la destination après connexion, dans le respect des droits serveur.

Navigation ordinateur : **Découvrir les visites · Mes visites · Aide · Se connecter / Mon compte**. « Créer des visites » reste accessible en lien secondaire et depuis le compte des créateurs.

Navigation téléphone proposée : en-tête compact avec logo et compte ; navigation basse **Explorer · Mes visites · Compte**. Aide, langue et accès créateur restent accessibles. Le mini-lecteur se place au-dessus de cette navigation pendant l’écoute ; ne pas empiler trois barres fixes concurrentes.

Parcours de découverte : **Accueil → Ville/visites → Fiche → Extrait → Connexion ou inscription si achat nécessaire → Paiement → Écouter**. Pas de compte imposé pour découvrir ou écouter un extrait public.

Parcours de retour : **Mes visites → Connexion si nécessaire → Reprendre**. Après une reconnexion ou une confirmation email, conserver la visite et la langue prévues. La connexion ne doit jamais envoyer un visiteur vers le Studio.

Exemple de promesse d’accueil à valider : « Découvrez les villes au fil de leurs histoires. » Sous-texte : « Choisissez une visite audio, écoutez un extrait et partez à votre rythme. » Action principale : « Trouver une visite ». Action de retour : « Reprendre mes visites » lorsqu’une reprise existe.

## Adaptation automatique aux téléphones — exigence de livraison

La mise en page doit s’adapter à la largeur disponible par CSS, sans bouton « version mobile », sans dépendre du nom du téléphone et sans redirection vers un autre site. Cette exigence s’applique à toutes les pages publiques, connexion/inscription/récupération, bibliothèque, paiement, lecteur, carte et états d’erreur ; français et anglais.

Le socle existe déjà : Header md:hidden, grilles à une/deux/trois colonnes, cartes de visites flex-col/sm:flex-row, viewport et focus global. Il faut auditer et corriger les composants restants, puis tester des parcours complets. Empiler les colonnes sans changer l’ordre des actions ne suffit pas.

| Zone | Téléphone | Écran large |
| --- | --- | --- |
| Accueil | Promesse courte, recherche et action dans la première zone visible ; sections moins espacées | Présentation enrichie, mêmes actions prioritaires |
| Catalogue | Une colonne lisible, filtres compacts ouvrables et compteur actif | Grille et filtres visibles selon place disponible |
| Fiche | Résumé compact ; extrait et achat/reprise avant les longs textes ; détails secondaires repliables | Contenu principal et panneau d’action latéral |
| Lecteur | Contrôles de pouce, titre/étape/langue lisibles ; mini-lecteur seulement pendant l’écoute | Commandes dans le contenu, sans espace vide imposé |
| Carte | Dimensions liées à l’espace disponible, bouton Me situer accessible, sortie facile vers les étapes | Carte plus ample, même absence d’autoplay GPS |
| Formulaires | Pleine largeur utile, clavier adapté, erreurs près des champs, bouton visible avec clavier ouvert | Largeur de lecture bornée, mêmes champs et étapes |

Critères de recette proposés :

- Tester 320, 360, 390, 430, 768, 1024 et 1440 pixels CSS, puis portrait/paysage et redimensionnement sans rechargement.
- Aucun débordement horizontal de page ni bouton coupé ; une carte peut se déplacer en deux dimensions dans son propre cadre. Vérifier le reflow à 320 pixels CSS et le zoom selon [WCAG 1.4.10](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).
- Viser des cibles tactiles de 44 × 44 pixels CSS pour les commandes principales : objectif ergonomique du produit. Ne pas le présenter comme le minimum universel WCAG 2.2 AA, qui prévoit 24 × 24 et des exceptions ([référence](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
- Corps de texte courant et champs autour de 16 pixels CSS, titres fluides et bornés ; auditer les tailles inline fixes, notamment le titre de fiche en tg.fontSize.h2.
- Images fluides et dimensions réservées ; aucun contenu essentiel dépendant du survol ; libellés longs français/anglais testés.
- Gérer les zones sûres du téléphone et le clavier virtuel ; aucune superposition entre lecteur, action d’achat, navigation et mise à jour.
- Mesurer le chargement sur réseau mobile ; conserver le chargement différé de la carte et les médias à la demande. Aucun temps de chargement actuel n’a été mesuré dans cette analyse.
- Valider sur Safari iPhone et Chrome Android réels ; tester lecteurs d’écran et gros texte. Les essais automatisés Chromium ne remplacent pas ces contrôles.

Référence de mise en œuvre : [responsive design, MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Responsive_Design).

## Découpage réalisable

1. **EV-1 — Entrée visiteur et identité** : navigation publique, connexion neutre, inscription visiteur, récupération, retour au contexte, conservation des rôles existants. Mobile dès cette étape.
2. **EV-2 — Accueil centré sur les visites** : nouvelle hiérarchie et textes fr/en, métadonnées, page dédiée aux créateurs, liens historiques maintenus.
3. **EV-3 — Fiche et achat sur téléphone** : extrait visible, résumé utile, action contextuelle, authentification intégrée et confirmation d’achat avec écoute immédiate.
4. **EV-4 — Mes visites et reprise** : bibliothèque orientée écoute, états vide/chargement/erreur, achats retrouvables, compte de l’application explicité.
5. **EV-5 — Découverte et aide** : filtres utiles, conservation de recherche, assistance visiteurs et messages web/app cohérents.
6. **EV-6 — Recette transversale et mesures** : tous formats, langues, clavier, accessibilité, performance, non-régression des six LW, instrumentation du parcours. Les tests mobile commencent dans EV-1 ; cette étape consolide la recette.

Premier lot recommandé : EV-1 puis EV-2 et EV-3. Ils traitent les obstacles d’entrée, de compréhension et de passage à l’écoute. Aucun chiffrage de délai ferme sans spécification des écrans et choix d’inscription.

## Preuves de réussite

Tests de tâches avec des personnes découvrant le site : trouver une visite, identifier où se connecter, créer un compte visiteur, écouter un extrait, acheter en environnement de test, retrouver/reprendre sa visite. Mesurer temps, hésitations et abandons ; ne pas se limiter à demander si l’écran plaît.

Mesures produit proposées : accueil → fiche ; fiche → début d’extrait ; entrée connexion → succès ; début d’achat → paiement confirmé ; paiement confirmé → première écoute ; Mes visites → reprise. Segmenter mobile/ordinateur et nouveau/ancien compte, sans enregistrer de mot de passe, URL audio signée ou position précise. Les événements d’écoute LW-6 existent ; ils ne couvrent pas à eux seuls la découvrabilité de la connexion.

## Références du dépôt

- `src/app/page.tsx:18` : pivot guide-first et métadonnées ; `src/app/en/page.tsx` pour la variante anglaise.
- `src/components/Header.tsx:108` : Mes achats conditionné à la connexion ; `:136` et `:236` pour l’entrée guide déconnectée.
- `src/app/guide/login/page.tsx:47` : titre et textes guide ; `:127` pour l’inscription proposée.
- `src/lib/auth/auth-context.tsx:100` : visiteur reconnu sans GuideProfile ; `src/lib/auth/return-to.ts` pour le retour après connexion.
- `src/app/guide/signup/page.tsx:176` et suite : confirmation et création de profil guide.
- `src/components/catalogue/mes-visites-content.tsx:76` : connexion des achats via /guide/login.
- `src/components/checkout/tour-purchase-card.tsx:299` : formulaire de connexion intégré ; `:289` pour le message après déblocage.
- `src/app/catalogue/[city]/[tourSlug]/page.tsx:325` : ordre des colonnes ; `:575` pour la sidebar d’achat ; `:223` pour le titre à taille fixe.
- `src/app/catalogue/catalogue-view-cities.tsx` et `[city]/tour-list-filter.tsx` : recherche ville et filtre langue actuels.
- `src/app/aide/page.tsx:69` : répartition web/app encore formulée autour de la création.
- [Accueil public consulté](https://murmure-visit.com/) : positionnement créateur et bloc voyageur secondaire.
