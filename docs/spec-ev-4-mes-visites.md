# EV-4 — Bibliothèque et reprise

## Intention et limites

Retrouver ses visites achetées et distinguer les écoutes mémorisées sur cet appareil. La reprise n’est pas synchronisée, n’accorde pas de droits et n’embarque aucune URL audio. Conserver les dates et montants des achats. Les visites retirées restent visibles sans lien cassé.

## Carte et tâches

- `src/components/catalogue/mes-visites-content.tsx:24` : isoler les réponses par compte, gérer erreur rejetée, grouper reprises puis autres achats.
- `src/components/catalogue/purchased-tour-card.tsx:18` : action Reprendre, contexte local, métadonnées disponibles seulement.
- `src/components/catalogue/scene-player/resume-store.ts:112` : réutiliser la validation et la purge existantes.

Présentation : mêmes tokens EV-2, cartes en une colonne téléphone, deux tablette, trois ordinateur ; titres lisibles et action de 44 pixels. Pas de nouvelle échelle de progression fictive : le stockage ne connaît que la position d’une scène.

## Matrice et acceptation

Compte absent → connexion avec retour. Compte vide → découverte. Réponse en erreur/rejetée → nouvelle tentative. Compte changé pendant requête → réponse précédente ignorée et cartes masquées. Reprise valide/publiée → groupe À reprendre sur cet appareil ; périmée ou retirée → groupe normal. Le lecteur valide à nouveau scène, langue et accès serveur. Stockage indisponible → bibliothèque fonctionnelle sans reprise.

Tests des réponses tardives, changement de compte, reprises et absence de métadonnées ; revue indépendante et commit local.
