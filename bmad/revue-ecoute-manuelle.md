# Écoute manuelle — revue du 13 septembre 2026

**Statut : correction développée et vérifiée localement, non déployée.**
La nouvelle demande remplace l’enchaînement automatique LW-2.

## Résultat

- `ended` ne charge ni ne joue l’étape suivante.
- Chaque étape démarre par un geste : bouton d’étape, reprise ou commande
  manuelle suivante (bouton ou Media Session).
- L’ancre `#ecouter` focalise le lecteur sans démarrage automatique.
- La fin mémorise la prochaine étape à zéro sans la charger. Pause, fermeture
  et démontage ne réécrivent pas l’étape terminée. La dernière étape purge.
- Consigne visible FR/EN et bouton explicite « Écouter l’étape suivante ».
- Droits serveur, URL signées et élément audio unique conservés.

## Relectures

Trois relectures indépendantes : manques fonctionnels, cas de bord et preuves.
Le défaut de reprise entre deux étapes signalé par deux relecteurs est corrigé
et relu. Les intitulés historiques des tests ont été adaptés. Le manque de
preuve de fin média native a été couvert par Chromium.

## Validation

- Lecteur : 109 tests réussis.
- Intégration fiche/itinéraire : 18 tests réussis après adaptation des deux
  attentes historiques d’enchaînement.
- Suite globale : 288 suites réussies, seule la suite d’intégration ci-dessus
  avait ses deux anciennes attentes en échec ; ses 18 tests ont ensuite été
  relancés et réussis. 2509 tests au total ; ne pas présenter ce résultat comme
  une unique exécution globale sans échec.
- TypeScript, lint et compilation de production : réussis.
- Deux scénarios Chromium FR/EN réussis : fichier WAV silencieux d’une seconde
  substitué aux médias, lecture/fin produites nativement par le navigateur,
  attente de 1,5 seconde sans lecture ni requête supplémentaire, puis clic
  suivant. Entrée par ancre sans source ni lecture. Un seul élément audio.
- Téléphones physiques et commandes casque physiques : non testés.

## Stripe et langues

Le paiement Stripe est intégré mais `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` est
absent de `.env.local`. Sans clé, la carte d’achat indique l’achat dans l’app.
Cette observation ne certifie pas l’état du site public. Le résolveur de contenu
réserve la suite d’une visite payante aux droits actifs et ne sert que deux
premières étapes d’aperçu sans droit. Aucune configuration cloud n’a été modifiée.

Les six langues de l’app sont confirmées pour tout le site. La migration n’est
pas implémentée par ce correctif ; son plan est dans `docs/plan-six-langues.md`.
