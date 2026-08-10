/**
 * Applique le modèle d'accès aux 100 visites publiées : 10 gratuites,
 * 90 réservées à l'abonnement, avec un marqueur d'audit IA.
 *
 * Dry-run par défaut. L'écriture exige --confirm et l'App ID public exact.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const argv = process.argv.slice(2);
const getOpt = (name, fallback = '') => {
  const prefix = `--${name}=`;
  return argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
};

const EXPECTED_APP_ID = 't5nxxao3orh6za2bjj6uegulru';
const appId = getOpt('app-id');
const env = getOpt('env', 'NONE');
const region = getOpt('region', 'us-east-1');
const confirm = argv.includes('--confirm');
const tableName = `GuideTour-${appId}-${env}`;

const freeIds = new Set([
  'seed-100-paris-montmartre-des-peintres',
  'seed-100-lyon-presquile-places-et-passages',
  'seed-100-marseille-quais-et-forts-du-vieux-port',
  'seed-100-bordeaux-pierre-et-mascarons',
  'seed-100-nice-places-et-ruelles-du-vieux-nice',
  'seed-100-toulouse-capitole-et-siecles-d-or',
  'seed-100-strasbourg-quais-et-ponts-de-lill',
  'seed-100-saint-malo-remparts-plages-et-marees',
  'seed-100-biarritz-ocean-et-belvederes',
  'seed-100-mont-saint-michel-remparts-et-baie',
]);

if (!appId) throw new Error('--app-id est requis');
if (appId !== EXPECTED_APP_ID) {
  throw new Error(`Cible refusée : ${appId}. Ce script n'autorise que la BDD publique ${EXPECTED_APP_ID}.`);
}

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
  marshallOptions: { removeUndefinedValues: true },
});

async function scanSeedTours() {
  const items = [];
  let ExclusiveStartKey;
  do {
    const result = await ddb.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey,
      ConsistentRead: true,
      FilterExpression: 'begins_with(id, :prefix)',
      ExpressionAttributeValues: { ':prefix': 'seed-100-' },
    }));
    items.push(...(result.Items ?? []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

const before = await scanSeedTours();
if (before.length !== 100) {
  throw new Error(`Précondition échouée : 100 visites attendues, ${before.length} trouvées.`);
}
const absentFreeIds = [...freeIds].filter((id) => !before.some((tour) => tour.id === id));
if (absentFreeIds.length > 0) {
  throw new Error(`Visites gratuites absentes : ${absentFreeIds.join(', ')}`);
}

const expected = (tour) => freeIds.has(tour.id) ? 'free' : 'subscription_only';
const planned = before.filter((tour) =>
  tour.purchaseType !== expected(tour) || tour.priceCents !== undefined || tour.developedByAI !== true,
);

console.log(JSON.stringify({
  tableName,
  total: before.length,
  free: before.filter((tour) => freeIds.has(tour.id)).length,
  subscriptionOnly: before.filter((tour) => !freeIds.has(tour.id)).length,
  updatesRequired: planned.length,
  dryRun: !confirm,
}, null, 2));

if (!confirm) process.exit(0);

for (const tour of before) {
  await ddb.send(new UpdateCommand({
    TableName: tableName,
    Key: { id: tour.id },
    UpdateExpression: 'SET purchaseType = :purchaseType, developedByAI = :ai, updatedAt = :now REMOVE priceCents',
    ExpressionAttributeValues: {
      ':purchaseType': expected(tour),
      ':ai': true,
      ':now': new Date().toISOString(),
      ':prefix': 'seed-100-',
    },
    ConditionExpression: 'begins_with(id, :prefix)',
  }));
}

const after = await scanSeedTours();
const invalid = after.filter((tour) =>
  tour.purchaseType !== expected(tour) || tour.priceCents !== undefined || tour.developedByAI !== true,
);
console.log(JSON.stringify({
  verified: after.length,
  free: after.filter((tour) => tour.purchaseType === 'free').length,
  subscriptionOnly: after.filter((tour) => tour.purchaseType === 'subscription_only').length,
  invalid: invalid.map((tour) => tour.id),
}, null, 2));
if (after.length !== 100 || invalid.length > 0) process.exit(1);
