/**
 * backfill-entitlement-qualification.mjs
 *
 * AD-5 — rattrape les `UserEntitlement` écrits AVANT que la qualification de
 * dépense existe. Ces lignes n'ont pas de `spendQualification` : elles ne
 * dépensent donc pas, ce qui est le bon défaut mais la mauvaise réponse pour un
 * forfait à 19,90 € déjà payé.
 *
 * Ce que le script fait :
 *   - balaie la table `UserEntitlement` ;
 *   - qualifie les lignes du FORFAIT — `ai_tours_pass` / `ai_tours_pass_play`
 *     → `annual_pass` — d'après la table partagée
 *     (`TourGuideApp/amplify/shared/forfait.ts`) ;
 *   - laisse l'abonnement mensuel résiduel sans qualification : l'absence vaut
 *     « ne dépense pas », qui est déjà la bonne réponse pour lui. `--all-known`
 *     l'étiquette explicitement, si on veut la lisibilité plutôt que le
 *     minimum de touches ;
 *   - n'écrit QUE si le champ est absent (`attribute_not_exists`) : un webhook
 *     qui passerait pendant le rattrapage ne se fait pas écraser ;
 *   - n'écrit QUE `spendQualification` : `updatedAt` est le seul horodatage qui
 *     distingue un vrai événement de droit d'un rattrapage, on n'y touche pas ;
 *   - laisse intactes les lignes dont l'identifiant est hors table (elles sont
 *     seulement signalées : sans qualification elles ne dépensent pas, et on ne
 *     décide pas à l'aveugle d'un produit qu'on ne connaît pas) ;
 *   - SIGNALE toute valeur déjà posée hors énumération : le balayage est
 *     l'endroit naturel pour la détecter, et elle casse la lecture web.
 *
 * La correspondance n'est PAS recopiée ici : elle est importée du module
 * partagé, seule source. Node ≥ 22.18 lit le `.ts` directement (type stripping).
 *
 * ---------------------------------------------------------------------------
 * ORDRE DE DÉPLOIEMENT — NE PAS INVERSER :
 *   1. déployer le backend Amplify (le champ `spendQualification` doit exister
 *      dans l'API AppSync) ;
 *   2. ENSUITE recopier `amplify_outputs.json` de TourGuideApp vers
 *      TourGuideWeb, et redémarrer le serveur de dev ;
 *   3. rattrapage à blanc (sans `--confirm`) — vérifier le bilan ;
 *   4. rattrapage réel (`--confirm`).
 *
 * CE QUE COÛTE L'ORDRE INVERSE : le client Amplify construit sa sélection de
 * champs à partir du `model_introspection` d'`amplify_outputs.json`. Recopié
 * AVANT le déploiement, il fait demander `spendQualification` à une API qui ne
 * l'a pas encore ; la requête échoue, `hasActiveForfait`
 * (TourGuideWeb/src/lib/api/forfait-purchase.ts) avale l'erreur dans son `catch`
 * et répond « pas de droit » — le badge « Forfait actif » s'éteint chez les
 * porteurs de forfait, et le bouton d'achat leur est réaffiché.
 * ---------------------------------------------------------------------------
 *
 * USAGE :
 *   # À blanc — annonce les lignes qu'il qualifierait, sans rien écrire :
 *   node scripts/backfill-entitlement-qualification.mjs --app-id=yvupc5stqzaxrgz6wv2wz7he5y
 *
 *   # Écriture :
 *   node scripts/backfill-entitlement-qualification.mjs --app-id=yvupc5stqzaxrgz6wv2wz7he5y --confirm
 *
 *   # Reprise après échec — la clé exacte est affichée par le run qui a échoué :
 *   node scripts/backfill-entitlement-qualification.mjs --app-id=... --confirm --start-key=...
 *
 * Le backend vivant est `yvupc5stqzaxrgz6wv2wz7he5y` (ENV=NONE) — mais aucun
 * défaut n'est inscrit ici : les défauts des scripts voisins sont périmés, et un
 * rattrapage lancé sur la mauvaise pile est pire que pas de rattrapage.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const getOpt = (name, def) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=').slice(1).join('=') : def;
};
const hasFlag = (f) => argv.includes(f);

const APP_ID = getOpt('app-id', process.env.APP_ID || '');
const ENV = getOpt('env', 'NONE');
const REGION = getOpt('region', 'us-east-1');
const CONFIRM = hasFlag('--confirm');
// Par défaut on ne touche QUE ce qui change une réponse : les lignes du forfait.
// L'abonnement mensuel résiduel ne dépense pas, avec ou sans étiquette.
const ALL_KNOWN = hasFlag('--all-known');
const START_KEY_RAW = getOpt('start-key', '');
const SHARED_RAW = getOpt('shared', '');

/**
 * `--shared` accepte une URL `file:` comme un chemin (relatif, ou absolu
 * Windows). `await import()` n'accepte que des specifiers : un chemin brut
 * échoue — d'où `pathToFileURL`. Sans valeur : le module du dépôt voisin.
 */
function resolveSharedSpecifier(raw) {
  if (!raw) return new URL('../../TourGuideApp/amplify/shared/forfait.ts', import.meta.url).href;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) return raw;
  return pathToFileURL(raw).href;
}
const SHARED = resolveSharedSpecifier(SHARED_RAW);

if (!APP_ID) {
  console.error('--app-id requis (ex. --app-id=yvupc5stqzaxrgz6wv2wz7he5y)');
  process.exit(1);
}

let startKeyFromArg;
if (START_KEY_RAW) {
  try {
    // `?? undefined` : un « null » recopié tel quel deviendrait un
    // `ExclusiveStartKey: null`, que le SDK refuse.
    startKeyFromArg = JSON.parse(START_KEY_RAW) ?? undefined;
  } catch (e) {
    console.error(`--start-key n'est pas du JSON valide : ${e?.message ?? e}`);
    process.exit(1);
  }
}

// Source unique de la correspondance identifiant → qualification. Si cet import
// échoue on s'arrête : recopier la table ici en ferait une seconde source, et
// deux sources divergent.
let isKnownEntitlementId;
let qualificationForEntitlementId;
let canSpend;
let SPEND_QUALIFICATIONS;
try {
  ({ isKnownEntitlementId, qualificationForEntitlementId, canSpend, SPEND_QUALIFICATIONS } =
    await import(SHARED));
} catch (e) {
  console.error(
    `Impossible de charger la table partagée depuis ${SHARED}\n` +
      `  - le dépôt TourGuideApp doit être à côté de TourGuideWeb (ou passer --shared=<url|chemin>)\n` +
      `  - Node >= 22.18 est requis (lecture directe du .ts) — version actuelle ${process.version}\n` +
      `  cause: ${e?.message ?? e}`,
  );
  process.exit(1);
}

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: { removeUndefinedValues: true },
});
const TABLE = `UserEntitlement-${APP_ID}-${ENV}`;

function report(stats) {
  // Les entrées à zéro ne s'affichent pas : « annual_pass=0 » se lit comme un
  // résultat alors que c'est une absence de résultat.
  const written = Object.entries(stats.byQualification)
    .filter(([, n]) => n > 0)
    .map(([q, n]) => `${q}=${n}`)
    .join(', ');
  console.log(`\n--- Bilan ---`);
  console.log(`Lignes balayées        : ${stats.scanned}`);
  console.log(`Déjà qualifiées        : ${stats.alreadyQualified}`);
  if (stats.invalidQualification > 0) {
    console.log(`/!\\ Hors énumération   : ${stats.invalidQualification} (À CORRIGER À LA MAIN)`);
  }
  console.log(`Identifiant hors table : ${stats.unknownId} (inchangées)`);
  // Ligne omise sous --all-known : le compteur y est toujours nul.
  if (!ALL_KNOWN) {
    console.log(`Ne dépensant pas       : ${stats.skippedNonSpending} (inchangées)`);
  }
  console.log(`Qualifiées entre-temps : ${stats.raced}`);
  console.log(`${CONFIRM ? 'Écrites' : 'À écrire'}  : ${written || '(aucune)'}`);
}

async function run() {
  console.log(
    `=== Backfill UserEntitlement.spendQualification (${CONFIRM ? 'WRITE' : 'DRY-RUN'}${ALL_KNOWN ? ', --all-known' : ''}) ===`,
  );
  console.log(`Table  : ${TABLE}`);
  console.log(`Région : ${REGION}`);
  console.log(`Table de correspondance : ${SHARED}`);
  if (startKeyFromArg) console.log(`Reprise depuis : ${JSON.stringify(startKeyFromArg)}`);
  console.log('');

  const stats = {
    scanned: 0,
    alreadyQualified: 0,
    invalidQualification: 0,
    unknownId: 0,
    skippedNonSpending: 0,
    raced: 0,
    byQualification: {},
  };
  let startKey = startKeyFromArg;
  // Clé de DÉBUT de la page en cours : c'est elle qu'il faut rejouer si l'échec
  // survient au milieu d'une page, pas la clé de fin déjà consommée.
  let pageStartKey = startKeyFromArg;

  try {
    do {
      pageStartKey = startKey;
      const page = await dynamo.send(
        new ScanCommand({ TableName: TABLE, ExclusiveStartKey: startKey ?? undefined }),
      );
      for (const row of page.Items ?? []) {
        stats.scanned += 1;
        const { id, entitlementId, spendQualification } = row;

        if (spendQualification != null) {
          // Une valeur hors énumération fait échouer la lecture AppSync du
          // porteur de forfait — erreur avalée côté web, badge éteint.
          if (!SPEND_QUALIFICATIONS.includes(spendQualification)) {
            stats.invalidQualification += 1;
            console.log(
              `  /!\\ ${id} (${entitlementId}) — « ${spendQualification} » HORS ÉNUMÉRATION : casse la lecture web, à corriger à la main`,
            );
          } else {
            stats.alreadyQualified += 1;
          }
          continue;
        }
        if (!entitlementId || !isKnownEntitlementId(entitlementId)) {
          stats.unknownId += 1;
          console.log(
            `  ? ${id} — entitlementId « ${entitlementId ?? '(vide)'} » hors table : laissé sans qualification (ne dépense pas)`,
          );
          continue;
        }

        const qualification = qualificationForEntitlementId(entitlementId);
        if (!ALL_KNOWN && !canSpend(qualification)) {
          stats.skippedNonSpending += 1;
          console.log(
            `  . ${id} (${entitlementId}) — « ${qualification} » ne dépense pas : laissé sans qualification (--all-known pour l'étiqueter)`,
          );
          continue;
        }

        if (!CONFIRM) {
          stats.byQualification[qualification] = (stats.byQualification[qualification] ?? 0) + 1;
          console.log(`  -> ${id} (${entitlementId}) serait qualifié « ${qualification} »`);
          continue;
        }

        try {
          await dynamo.send(
            new UpdateCommand({
              TableName: TABLE,
              Key: { id },
              // `updatedAt` n'est PAS touché : c'est le seul horodatage qui
              // distingue un vrai événement de droit du rattrapage, sur des
              // lignes par ailleurs intactes.
              UpdateExpression: 'SET spendQualification = :q',
              // Un webhook passé entre le balayage et l'écriture a déjà posé la
              // bonne valeur : on ne l'écrase pas.
              ConditionExpression: 'attribute_not_exists(spendQualification)',
              ExpressionAttributeValues: { ':q': qualification },
            }),
          );
          // Compté APRÈS l'écriture réussie : un compteur incrémenté d'avance
          // puis décrémenté laisse des entrées à zéro dans le bilan.
          stats.byQualification[qualification] = (stats.byQualification[qualification] ?? 0) + 1;
          console.log(`  OK ${id} (${entitlementId}) -> ${qualification}`);
        } catch (e) {
          if (e?.name === 'ConditionalCheckFailedException') {
            stats.raced += 1;
            console.log(`  = ${id} — qualifié entre-temps par un webhook, laissé tel quel`);
          } else {
            throw e;
          }
        }
      }
      startKey = page.LastEvaluatedKey;
    } while (startKey);
  } catch (e) {
    // Sur une table longue, remonter sans point de reprise fait repartir de
    // zéro. On rend la clé exploitable telle quelle.
    report(stats);
    console.error(`\nEchec en cours de balayage : ${e?.message ?? e}`);
    if (pageStartKey) {
      console.error(
        'Reprendre ici (la page en cours sera rejouée — les écritures sont ' +
          'conditionnelles, donc sûres). Relancer avec :',
      );
      console.error(`  --start-key=${JSON.stringify(JSON.stringify(pageStartKey))}`);
    } else {
      // Échec sur la toute première page : il n'y a rien à reprendre.
      console.error('Aucune page terminée : relancer la même commande, sans --start-key.');
    }
    throw e;
  }

  report(stats);
  if (!CONFIRM) console.log(`\nAucune écriture. Ajouter --confirm pour écrire.`);
  console.log('=== Terminé ===');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
