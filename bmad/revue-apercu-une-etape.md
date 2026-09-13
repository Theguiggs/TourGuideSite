# Aperçu d’une étape — 13 septembre 2026

Statut : développé et vérifié localement, non déployé.

Les visites payantes sans droit actif offrent seulement la première étape.
Le backend retire audio source et traduit, photos et description dès l’étape 2.
Le Web et l’application montrent la même frontière. La fin d’aperçu mène à
l’achat après l’étape 1, sans enchaînement. Gratuit et achat acquis restent complets.

Trois relectures indépendantes réalisées. Elles ont permis d’aligner le nombre
encore codé à deux dans l’application et de renforcer les assertions de médias
signés et de confidentialité dès la deuxième étape.

Validation :

- Backend : 4 suites, 184 tests réussis, typecheck Amplify réussi.
- App : 28 tests réussis sur trois suites ciblées ; 9 tests déjà ignorés dans
  la suite historique de l’écran restent ignorés. Lint sans erreur (11 avertissements).
- Web global : 288 suites réussies, une ancienne assertion de carte échouait
  parce qu’il y a désormais deux points verrouillés au lieu d’un. Corrigée,
  puis les 9 tests de cette suite ont réussi. 2509 tests dans la suite globale.
- Build Web réussi ; lint ciblé sans erreur.
- Chromium : 2 parcours FR/EN réussis avec fin média native, un seul audio
  d’aperçu et lien d’achat, sans démarrage automatique.

## Livraison

Déployer le backend avant de considérer la réduction d’accès effective ;
coordonner ensuite le Web et la prochaine version de l’app. Le Web seul ne
protège pas les médias. Les réponses en cache et URL déjà signées doivent
expirer ou être invalidées selon le mécanisme de livraison. Aucun déploiement,
paiement ou effacement d’audio n’a été effectué.

## Constat adjacent consigné

La validation administrative d’ouverture d’une langue et la sélection des
visites à produire comptent actuellement les clés traduites, sans vérifier
les identifiants des premières scènes vivantes. Une clé de scène 2 seule peut
donc faire considérer l’aperçu traduit prêt alors que scène 1 n’est pas traduite.
Cela n’accorde pas l’audio de scène 2 : le résolveur d’accès le retire bien.
La vérification des identifiants de scènes demande une correction distincte
de ces opérations d’administration, avec lecture des scènes et droits IAM.
