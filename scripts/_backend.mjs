/**
 * LE SEUL ENDROIT où un script d'exploitation apprend quel backend il vise.
 *
 * ─── Pourquoi ce module existe ───────────────────────────────────────────────
 * Vingt-six scripts portaient chacun un identifiant d'API AppSync codé en dur,
 * et la plupart visaient des piles MORTES (`t5nxxao3…`, `4z7fvz7n…`) : ils
 * « réussissaient » en écrivant dans le vide, ou refusaient toute autre cible.
 * Le jour où l'on corrigeait l'identifiant sans relire le script, il écrivait
 * sur le vivant avec un propriétaire périmé. Un script de remise à zéro totale
 * (`reset-db.mjs`, supprimé) était à une constante près de la production.
 *
 * ─── Règles ──────────────────────────────────────────────────────────────────
 *  - L'identifiant vient de `--app-id=` ou de `APPSYNC_API_ID`. JAMAIS d'un
 *    défaut : un script qui ne sait pas où il écrit ne doit pas écrire.
 *  - L'URL AppSync, la région et le pool viennent de `amplify_outputs.json`,
 *    qui est ce que le portail déployé utilise réellement.
 *  - Le nom d'hôte de l'URL GraphQL (`ncwhqefs…`) et l'`apiId` (`yvupc5…`)
 *    sont DEUX identifiants différents de la même API ; les tables DynamoDB
 *    sont nommées avec le second, que le fichier de sorties ne porte pas —
 *    d'où l'obligation de le passer explicitement.
 *
 * Usage :
 *   import { requireBackend } from './_backend.mjs';
 *   const { appId, env, region, table } = requireBackend();
 *   await ddb.send(new ScanCommand({ TableName: table('GuideTour') }));
 *
 * Trouver l'identifiant :
 *   aws appsync list-graphql-apis --query "graphqlApis[].{id:apiId,name:name}"
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Piles connues comme MORTES : toute tentative de les viser est refusée net. */
const DEAD_APP_IDS = new Set(['t5nxxao3orh6za2bjj6uegulru', '4z7fvz7n2bh5rpixdgihjmhdpa']);

function readOpt(name) {
  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

/** Lit `amplify_outputs.json` à la racine du dépôt web. */
export function readAmplifyOutputs() {
  const path = resolve(HERE, '..', 'amplify_outputs.json');
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`amplify_outputs.json illisible (${path}) : ${String(error)}`);
  }
}

/**
 * Résout la cible, ou lève. Ne rend JAMAIS une pile morte, ni une pile absente.
 *
 * @param {object} [options]
 * @param {string} [options.appId]   surcharge explicite (tests)
 * @param {string} [options.env]     suffixe d'environnement Amplify, `NONE` par défaut
 */
export function requireBackend(options = {}) {
  const appId = options.appId ?? readOpt('app-id') ?? process.env.APPSYNC_API_ID ?? '';
  if (!appId) {
    throw new Error(
      'Backend cible absent. Passer --app-id=<apiId AppSync> ou poser APPSYNC_API_ID. ' +
        'Aucun défaut : un script qui ne sait pas où il écrit ne doit pas écrire.',
    );
  }
  if (DEAD_APP_IDS.has(appId)) {
    throw new Error(
      `Backend ${appId} refusé : cette pile est MORTE. La pile vivante est celle de amplify_outputs.json ` +
        '(app dieqe5vfmuc69, branche main) ; son apiId se lit avec ' +
        '`aws appsync list-graphql-apis --query "graphqlApis[].{id:apiId,name:name}"`.',
    );
  }
  const env = options.env ?? readOpt('env') ?? process.env.AMPLIFY_ENV ?? 'NONE';
  const outputs = readAmplifyOutputs();
  const region = outputs?.data?.aws_region ?? outputs?.auth?.aws_region ?? 'us-east-1';
  return {
    appId,
    env,
    region,
    graphqlUrl: outputs?.data?.url ?? null,
    userPoolId: outputs?.auth?.user_pool_id ?? null,
    bucket: outputs?.storage?.bucket_name ?? null,
    /** Nom de table DynamoDB d'un modèle Amplify. */
    table: (model) => `${model}-${appId}-${env}`,
  };
}

/** Exposé pour l'épreuve qui interdit les identifiants morts dans le dépôt. */
export const _deadAppIds = [...DEAD_APP_IDS];
