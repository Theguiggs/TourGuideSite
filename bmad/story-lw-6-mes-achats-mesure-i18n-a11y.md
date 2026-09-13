# Story LW-6 : « Écouter » depuis Mes achats, mesure, i18n, accessibilité

Status: done

<!-- Épopée LW. Dépend de LW-1 et LW-2. Ferme la boucle de valeur. -->

## Story

En tant que **visiteur qui vient d'acheter sur le web**,
je veux **retrouver un bouton « Écouter » sur chacune de mes visites**,
afin de **consommer mon achat en un geste** ; et en tant qu'**éditeur**, je veux **savoir qui écoute sur le web, et quoi**.

## Contexte vérifié (2026-09-12)

- `purchased-tour-card.tsx` et `my-purchases-strip.tsx` pointent vers `/catalogue/[city]/[tourSlug]` sans intention d'écoute.
- Amplitude web est installé (`@amplitude/analytics-browser`). La story obs-1 a fixé la convention : `city_id` sous la **même clé** que dans l'appli, sinon l'entonnoir n'est pas segmentable.
- Pages `/en/my-purchases` et `/mes-achats` : deux locales à tenir.

## Acceptance Criteria

1. **CTA « Écouter »** sur la carte d'achat et la bande Mes achats, vers `/catalogue/[city]/[tourSlug]#ecouter` ; l'ancre ouvre le lecteur et lance (ou propose de reprendre, LW-2) sans second clic superflu.
2. **Événements** — `WEB_LISTEN_START` (tour_id, city_id, language, from: purchases | tour_page | resume), `WEB_SCENE_COMPLETE` (tour_id, city_id, scene_order), `WEB_LISTEN_COMPLETE` (tour_id, city_id). Même `serverZone: 'EU'` et `ipAddress: false` que l'existant. Test sur l'émission.
3. **i18n** — tous les libellés du lecteur, du sélecteur, de la carte et du bandeau PWA en fr et en, via le mécanisme de la page (`copy`), aucune chaîne en dur.
4. **Accessibilité** — lecteur pilotable au clavier (espace, flèches ±10 s), `aria-live` pour l'étape en cours, contrastes DS, focus visible ; passe l'audit a11y existant (`a11y-audit-murmure.md`) sans nouvelle régression.
5. **Épreuves** — tests des deux CTA, des événements, passe axe sur la page visite avec lecteur ouvert.

## Livraison — 12 septembre 2026

- Cartes et bande Mes achats : « Écouter » / « Listen », ancre `#ecouter`, titre accessible ; un achat archivé reste visible sans lien vers une 404.
- Arrivée sur le lecteur : attendre la liste accordée, proposer et focaliser la reprise ; sinon tenter la lecture une fois. Un refus d’autoplay garde un bouton utilisable et le message traduit. Une ancre ne garantit pas la transmission du geste entre pages.
- Visite sans audio : cible d’ancre conservée et message explicite, sans bouton fictif ni chargement permanent après un échec.
- `WEB_LISTEN_START` : succès de `play()`, une fois par écoute ; pause, relance réseau et piste suivante ne doublonnent pas. `from=purchases` pour l’arrivée par ancre, `resume` pour la reprise mémorisée, `tour_page` pour le lancement ordinaire. L’ancre est une attribution de parcours, pas une preuve d’achat.
- `WEB_SCENE_COMPLETE` : fin naturelle d’une scène, une fois par tentative ; `scene_order` reprend le numéro affiché.
- `WEB_LISTEN_COMPLETE` : fin naturelle de la dernière scène du mode visite, sans étapes verrouillées après. Une scène isolée, une fin d’aperçu et un saut « suivant » ne comptent pas. Ce compteur n’atteste pas que toutes les secondes précédentes ont été écoutées.
- Noms envoyés en minuscules `web_*`, selon le transport existant ; `city_id` = slug utilisé par le catalogue mobile. `language` est la langue source déclarée ; `und` si elle manque, jamais la locale de l’interface supposée. Configuration Amplitude EU et IP désactivée conservée et éprouvée.
- Clavier : espace sur les boutons et le curseur, flèches gauche/droite ±10 s bornées ; annonce de l’étape même en écoute isolée. Focus visible global et tokens du DS conservés.
- Déconnexion locale ou distante : arrêt des lecteurs, invalidation des requêtes et caches signés, purge des reprises. Une ancienne résolution d’identité ne peut pas réinstaller le compte après la déconnexion. Ménage des reprises illisibles ou âgées de plus de 90 jours au montage.
- Boutons vers l’application renommés « Marcher avec l’appli » / « Walk with the app » ; copies des cartes et du lecteur fr/en. Le sélecteur, la carte et le bandeau PWA n’existent pas encore : leurs traductions appartiennent respectivement à LW-3, LW-4 et LW-5.

## Vérification

- Spécification écrite avant le code : `C:/Projects/Bmad/_bmad-output/implementation-artifacts/spec-lw-6-mes-achats-mesure-i18n-a11y.md`.
- Trois revues indépendantes sans historique, puis contre-relectures : sept constats corrigés et éprouvés. Voir `revue-lw-6.md`.
- Jest, TypeScript et ESLint : résultats finaux consignés dans `revue-lw-6.md`.
- `npx playwright test --config playwright.player.config.ts --reporter=list` : **3 tests réussis**. Page publique `/catalogue/nice/nice-nissa-la-bella`, fr/en ; lecture via un véritable élément audio, commandes espace/flèches, proposition de reprise au retour. Un fichier PCM silencieux remplace la réponse média et prend en charge les requêtes partielles ; aucun audio de production n’est téléchargé par ces épreuves.
- Axe : aucune violation sur les contrôles ; aucune nouvelle violation WCAG A/AA sur la page après ouverture du lecteur. Cela ne signifie pas que toute la page existante est sans défaut. Méthode : [documentation Playwright](https://playwright.dev/docs/accessibility-testing).
- La configuration publique ne crée pas de données distantes et ne dépend pas des comptes E2E. `LW6_TOUR_PATH` permet de choisir une autre fiche publique narrée si le catalogue change.
- La passe E2E standard a échoué avant les tests sur les identifiants Cognito du compte administrateur ; son teardown exige aussi `APPSYNC_API_ID`, absent de l’environnement de cette tentative. Aucune donnée n’a été semée. La suite E2E complète n’est donc pas déclarée verte.
- **Non exécutés :** appareils Android Chrome / iOS Safari, écran verrouillé, TalkBack / VoiceOver. Chromium avec une chaîne user-agent Android reste un navigateur de test sur ordinateur, pas une validation sur téléphone. Le protocole LW-2 reste à exécuter.

## Fichiers

- `src/components/catalogue/purchased-tour-card.tsx`
- `src/components/catalogue/my-purchases-strip.tsx`
- `src/components/catalogue/scene-player/listen-link.ts`
- `src/components/catalogue/scene-player/scene-player.tsx`
- `src/components/catalogue/scene-player/tour-play-control.tsx`
- `src/components/catalogue/scene-player/resume-store.ts`
- `src/components/catalogue/scene-player/use-scene-audio.ts`
- `src/app/catalogue/[city]/[tourSlug]/itinerary-list.tsx`
- `src/app/catalogue/[city]/[tourSlug]/page.tsx`
- `src/lib/analytics.ts`
- `src/lib/auth/auth-context.tsx`
- `src/types/tour.ts`
- `src/lib/api/tours.ts`
- `src/lib/api/tours-server.ts`
- `src/components/catalogue/__tests__/purchased-tour-card.test.tsx`
- `src/components/catalogue/scene-player/__tests__/scene-player.test.tsx`
- `src/components/catalogue/scene-player/__tests__/resume-store.test.ts`
- `src/app/catalogue/[city]/[tourSlug]/__tests__/itinerary-listen.test.tsx`
- `src/lib/api/__tests__/published-tour-mapping-server.test.ts`
- `src/lib/auth/__tests__/player-cleanup.test.tsx`
- `src/lib/__tests__/listen-analytics.test.ts`
- `e2e/tests/scene-player.spec.ts`
- `playwright.player.config.ts`
- `package.json`, `package-lock.json` : outil axe pour Playwright.
- `bmad/story-lw-6-mes-achats-mesure-i18n-a11y.md`, `bmad/epic-lw-lecteur-web.md`, `bmad/revue-lw-6.md`.
