# Annexes ? audit de r?organisation du 26 septembre 2026

R?f?rences distantes locales uniquement, sans fetch. Les volumes sont des tailles logiques de fichiers, hors jonctions et autres points de r?analyse. Ils ne constituent pas une estimation exacte de l?espace r?cup?rable.

## Volumes par r?pertoire racine

Total mesur? : 55.25 Go d?cimaux, hors fichiers directement ? la racine. 86 erreurs de lecture dans `.worktrees` : mesure partielle pour ce dossier.

| R?pertoire | Go | Fichiers | Liens ignor?s | Erreurs |
|---|---:|---:|---:|---:|
| `TourGuideApp` | 19.1791 | 267226 | 2 | 0 |
| `.worktrees` | 12.7836 | 881712 | 26 | 86 |
| `TourGuideWeb` | 8.1740 | 135773 | 1 | 0 |
| `TourGuideApp-account-deletion` | 4.8265 | 225158 | 1 | 0 |
| `.release-web-i18n` | 2.1243 | 83554 | 1 | 0 |
| `TourGuideApp-appsync-hardening` | 1.4981 | 222821 | 2 | 0 |
| `TourGuideWeb-seo-free` | 1.2763 | 82885 | 1 | 0 |
| `.seo-multilingue` | 1.2675 | 82718 | 1 | 0 |
| `.fix-web-e2e` | 1.2673 | 82707 | 1 | 0 |
| `.fix-app-ci` | 1.0608 | 187606 | 1 | 0 |
| `TourGuideWeb-seo` | 0.8518 | 2985 | 2 | 0 |
| `design-system` | 0.3104 | 22999 | 0 | 0 |
| `.content-expansion` | 0.1710 | 1428 | 0 | 0 |
| `output` | 0.1365 | 32 | 0 | 0 |
| `.codex` | 0.1102 | 132 | 0 | 0 |
| `_archive-audio` | 0.0541 | 27 | 0 | 0 |
| `.deploy-artifacts` | 0.0512 | 159 | 0 | 0 |
| `.tmp` | 0.0344 | 146 | 1 | 0 |
| `screenshots` | 0.0166 | 29 | 0 | 0 |
| `.agents` | 0.0158 | 1779 | 0 | 0 |
| `.claude` | 0.0155 | 1759 | 0 | 0 |
| `.tmp-e2e-29763729809-a` | 0.0078 | 29 | 0 | 0 |
| `_bmad-output` | 0.0059 | 240 | 0 | 0 |
| `playstore-screenshots` | 0.0037 | 5 | 0 | 0 |
| `docs` | 0.0028 | 72 | 0 | 0 |
| `.tmp-e2e-trace-extracted-a` | 0.0027 | 120 | 0 | 0 |
| `playstore-assets` | 0.0003 | 3 | 0 | 0 |
| `design` | 0.0003 | 29 | 0 | 0 |
| `_bmad` | 0.0003 | 50 | 0 | 0 |
| `scripts` | 0.0000 | 15 | 0 | 0 |
| `TourGuide` | 0.0000 | 4 | 0 | 0 |
| `microservice-build` | 0.0000 | 3 | 0 | 0 |
| `backups` | 0.0000 | 21 | 0 | 0 |
| `deploy` | 0.0000 | 4 | 0 | 0 |
| `toSave` | 0.0000 | 1 | 0 | 0 |
| `.github` | 0.0000 | 1 | 0 | 0 |
| `design-artifacts` | 0.0000 | 0 | 0 | 0 |
| `TourGuideApp-locktest` | 0.0000 | 0 | 0 | 0 |

## TourGuideApp ? worktrees

Propre = aucune entr?e dans le status standard ; fichiers ignor?s ? contr?ler s?par?ment. Inclus = sommet anc?tre de la r?f?rence locale origin/main.

| Chemin | Branche | Entr?es status | Inclus |
|---|---|---:|---|
| `TourGuideApp` | `chore/play-review-prep` | 3 | Oui |
| `.worktrees/gemini-38-flash-tts-app` | `feat/gemini-38-flash-tts` | 0 | Oui |
| `.worktrees/rejected-tour-editing` | `fix/rejected-tour-editing` | 0 | Oui |
| `.worktrees/TourGuideApp-guide-metadata` | `fix/guide-metadata-provenance` | 1 | Oui |
| `.worktrees/visites-personnalisees-story-1-app` | `feat/visites-personnalisees-story-1` | 0 | Non |
| `.worktrees/visites-personnalisees-story-10-app` | `feat/visites-personnalisees-story-10` | 0 | Non |
| `.worktrees/visites-personnalisees-story-11-app` | `feat/visites-personnalisees-story-12` | 0 | Non |
| `.worktrees/visites-personnalisees-story-2-app` | `feat/visites-personnalisees-story-2` | 0 | Non |
| `.worktrees/visites-personnalisees-story-3-app` | `feat/visites-personnalisees-story-3` | 0 | Non |
| `.worktrees/visites-personnalisees-story-4-app` | `feat/visites-personnalisees-story-4` | 0 | Non |
| `.worktrees/visites-personnalisees-story-5-app` | `feat/visites-personnalisees-story-5` | 0 | Non |
| `.worktrees/visites-personnalisees-story-6-app` | `feat/visites-personnalisees-story-6` | 0 | Non |
| `.worktrees/visites-personnalisees-story-7-app` | `feat/visites-personnalisees-story-7` | 0 | Non |
| `.worktrees/visites-personnalisees-story-8-app` | `feat/visites-personnalisees-story-8` | 0 | Non |
| `.worktrees/visites-personnalisees-story-9-app` | `feat/visites-personnalisees-story-9` | 0 | Non |
| `TourGuideApp-account-deletion` | `fix/play-account-deletion` | 0 | Oui |
| `TourGuideApp-appsync-hardening` | `fix/published-content-indexes` | 0 | Oui |
| `%TEMP%/claude/C--Projects-Bmad-TourGuideWeb/39ef3e4a-0b5f-4e9c-b57e-29da243de6e6/scratchpad/app-tree` | `main` | 2145 | Oui |

## TourGuideApp ? branches

| Branche | Upstream | ?tat local du suivi | Incluse dans origin/main |
|---|---|---|---|
| `carte-poi-ecoute` | origin/carte-poi-ecoute | ? | Oui |
| `chore/android-play-release` | origin/chore/android-play-release | [gone] | Oui |
| `chore/outputs-lot6` | origin/chore/outputs-lot6 | [gone] | Oui |
| `chore/play-review-prep` | origin/chore/play-review-prep | ? | Oui |
| `feat/forfait-visites-ia` | Aucun | ? | Oui |
| `feat/gemini-38-flash-tts` | origin/feat/gemini-38-flash-tts | ? | Oui |
| `feat/interface-language-preferences` | origin/feat/interface-language-preferences | [gone] | Oui |
| `feat/lot6-guide-status-decision` | origin/feat/lot6-guide-status-decision | [gone] | Oui |
| `feat/multilingue-a-la-demande` | Aucun | ? | Oui |
| `feat/visites-personnalisees-story-1` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-10` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-11` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-12` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-2` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-3` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-4` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-5` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-6` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-7` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-8` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-9` | Aucun | ? | Non |
| `fix-itineraire-traduit-et-puces` | origin/fix-itineraire-traduit-et-puces | [gone] | Non |
| `fix-notifications-langue-ihm` | origin/fix-notifications-langue-ihm | [gone] | Non |
| `fix-revue-adversariale-pr44` | origin/fix-revue-adversariale-pr44 | [gone] | Non |
| `fix/appsync-public-studio-access` | origin/fix/appsync-public-studio-access | ? | Oui |
| `fix/borne-concurrence-traduction` | origin/fix/borne-concurrence-traduction | ? | Oui |
| `fix/guide-metadata-provenance` | origin/main | [behind 27] | Oui |
| `fix/hermetic-design-system-build` | origin/fix/hermetic-design-system-build | [gone] | Oui |
| `fix/play-account-deletion` | origin/fix/play-account-deletion | [gone] | Oui |
| `fix/published-content-indexes` | origin/fix/published-content-indexes | ? | Oui |
| `fix/rejected-tour-editing` | origin/main | [behind 11] | Oui |
| `fix/signin-recovery-map-recentre` | origin/fix/signin-recovery-map-recentre | ? | Oui |
| `hotfix-guideprofile-authz` | origin/hotfix-guideprofile-authz | ? | Oui |
| `hotfix-guideprofile-authz-avant-rectification` | Aucun | ? | Non |
| `main` | origin/main | [behind 10] | Oui |
| `release-1.3.6` | origin/release-1.3.6 | [gone] | Non |
| `story-10-orchestration-fabrication` | origin/story-10-orchestration-fabrication | ? | Oui |
| `story-16-cout-et-plafond` | origin/story-16-cout-et-plafond | ? | Oui |
| `story-19-etendue-langues-ecoute` | origin/story-19-etendue-langues-ecoute | ? | Oui |
| `story-4-traduction-modele-langue` | origin/story-4-traduction-modele-langue | ? | Oui |
| `story-9-modele-donnees-fabrication` | origin/story-9-modele-donnees-fabrication | ? | Oui |

Aucun stash.

## TourGuideWeb ? worktrees

Propre = aucune entr?e dans le status standard ; fichiers ignor?s ? contr?ler s?par?ment. Inclus = sommet anc?tre de la r?f?rence locale origin/main.

| Chemin | Branche | Entr?es status | Inclus |
|---|---|---:|---|
| `TourGuideWeb` | `feat/lw-1-lecteur-scene` | 188 | Oui |
| `.content-expansion` | `feature/expand-draft-tour-content` | 28 | Non |
| `.fix-web-e2e` | `main` | 0 | Oui |
| `.release-web-i18n` | `feature/unified-public-studio-shell` | 0 | Oui |
| `.seo-multilingue` | `feat/seo-8-suggestion-de-langue` | 0 | Oui |
| `.worktrees/gemini-38-flash-tts-web` | `feat/gemini-38-flash-tts` | 0 | Oui |
| `.worktrees/route-validation-deploy` | `fix/route-validation-submission` | 0 | Oui |
| `.worktrees/TourGuideWeb-guide-recording` | `fix/guide-recording-prompter` | 0 | Oui |
| `.worktrees/visites-personnalisees-story-1-web` | `feat/visites-personnalisees-story-1` | 0 | Oui |
| `.worktrees/visites-personnalisees-story-10-web` | `feat/visites-personnalisees-story-10` | 0 | Non |
| `.worktrees/visites-personnalisees-story-11-web` | `feat/visites-personnalisees-story-12` | 0 | Non |
| `.worktrees/visites-personnalisees-story-4-web` | `feat/visites-personnalisees-story-4` | 0 | Non |
| `.worktrees/visites-personnalisees-story-5-web` | `feat/visites-personnalisees-story-5` | 0 | Non |
| `.worktrees/visites-personnalisees-story-6-web` | `feat/visites-personnalisees-story-6` | 0 | Non |
| `.worktrees/visites-personnalisees-story-7-web` | `feat/visites-personnalisees-story-7` | 0 | Non |
| `.worktrees/visites-personnalisees-story-8-web` | `feat/visites-personnalisees-story-8` | 0 | Non |
| `.worktrees/visites-personnalisees-story-9-web` | `feat/visites-personnalisees-story-9` | 0 | Non |
| `TourGuideWeb-seo` | `feat/seo-9-contenu-editorial` | 0 | Oui |
| `TourGuideWeb-seo-free` | `feat/seo-gratuit` | 0 | Oui |
| `%TEMP%/claude/C--Projects-Bmad-TourGuideWeb/39ef3e4a-0b5f-4e9c-b57e-29da243de6e6/scratchpad/prod-tree` | `HEAD d?tach?e` | 1955 | Oui |

## TourGuideWeb ? branches

| Branche | Upstream | ?tat local du suivi | Incluse dans origin/main |
|---|---|---|---|
| `chore/bulles-sans-consigne-de-longueur` | origin/chore/bulles-sans-consigne-de-longueur | ? | Oui |
| `claude/biarritz-itinerary-mfwuvo` | origin/claude/biarritz-itinerary-mfwuvo | ? | Non |
| `feat/aide-accueil-guide-fix-moderation-status` | origin/feat/aide-accueil-guide-fix-moderation-status | ? | Oui |
| `feat/forfait-visites-ia` | Aucun | ? | Oui |
| `feat/gemini-38-flash-tts` | origin/feat/gemini-38-flash-tts | ? | Oui |
| `feat/lw-1-lecteur-scene` | origin/feat/lw-1-lecteur-scene | ? | Oui |
| `feat/multilingue-a-la-demande` | Aucun | ? | Oui |
| `feat/seo-3-villes-et-donnees-structurees` | origin/feat/seo-3-villes-et-donnees-structurees | [gone] | Oui |
| `feat/seo-8-suggestion-de-langue` | origin/feat/seo-8-suggestion-de-langue | [gone] | Oui |
| `feat/seo-9-contenu-editorial` | origin/feat/seo-9-contenu-editorial | ? | Oui |
| `feat/seo-gratuit` | origin/feat/seo-gratuit | ? | Oui |
| `feat/seo-multilingue` | origin/feat/seo-multilingue | [gone] | Oui |
| `feat/studio-i18n` | origin/feat/studio-i18n | ? | Oui |
| `feat/visites-personnalisees-story-1` | Aucun | ? | Oui |
| `feat/visites-personnalisees-story-10` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-11` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-12` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-4` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-5` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-6` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-7` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-8` | Aucun | ? | Non |
| `feat/visites-personnalisees-story-9` | Aucun | ? | Non |
| `feature/expand-draft-tour-content` | origin/feature/expand-draft-tour-content | ? | Non |
| `feature/unified-public-studio-shell` | Aucun | ? | Oui |
| `fix-dockerfile-web-empreinte` | origin/fix-dockerfile-web-empreinte | [gone] | Oui |
| `fix/amplify-schema-repo` | origin/fix/amplify-schema-repo | ? | Oui |
| `fix/appsync-public-studio-access` | origin/fix/appsync-public-studio-access | ? | Oui |
| `fix/general-cover-null-et-deploy` | origin/fix/general-cover-null-et-deploy | ? | Oui |
| `fix/guide-recording-prompter` | Aucun | ? | Oui |
| `fix/lot0-3-web-language-purchase` | origin/fix/lot0-3-web-language-purchase | ? | Non |
| `fix/lot1-studio-perte-travail` | origin/fix/lot1-studio-perte-travail | ? | Oui |
| `fix/lot5-design-system` | origin/fix/lot5-design-system | [gone] | Oui |
| `fix/lot6-ux-studio-admin` | origin/fix/lot6-ux-studio-admin | [gone] | Oui |
| `fix/route-validation-submission` | origin/main | [behind 8] | Oui |
| `hotfix-guideprofile-authz-portail` | origin/hotfix-guideprofile-authz-portail | ? | Non |
| `main` | origin/main | [behind 11] | Oui |
| `release/web-i18n-20260719` | Aucun | ? | Oui |
| `story-10-orchestration-fabrication` | Aucun | ? | Oui |
| `story-11-priorite-ecoute-anticipee` | Aucun | ? | Oui |
| `story-16-proxy-compte` | origin/story-16-proxy-compte | ? | Oui |
| `story-4-traduction-modele-langue` | origin/story-4-traduction-modele-langue | ? | Oui |
| `story-8-banc-mesure-delai` | origin/story-8-banc-mesure-delai | ? | Oui |
| `story-9-modele-donnees-fabrication` | origin/story-9-modele-donnees-fabrication | ? | Oui |

Stashes :
- `stash@{0}: On main: codex-preserve-localization-artifacts-2026-08-10`
- `stash@{1}: WIP on feat/aide-accueil-guide-fix-moderation-status: b63c4a7c feat: afficher le numéro de version dans le footer`
