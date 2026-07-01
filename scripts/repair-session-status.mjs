/**
 * repair-session-status.mjs
 * Répare les StudioSession bloquées en "submitted" après une approbation admin.
 *
 * USAGE :
 *   # Dry-run (affiche ce qui serait fait) :
 *   node scripts/repair-session-status.mjs --app-id=t5nxxao3orh6za2bjj6uegulru
 *
 *   # Écriture :
 *   node scripts/repair-session-status.mjs --app-id=t5nxxao3orh6za2bjj6uegulru --confirm
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const argv = process.argv.slice(2);
const getOpt = (name, def) => { const h = argv.find(a => a.startsWith(`--${name}=`)); return h ? h.split('=').slice(1).join('=') : def; };
const hasFlag = (f) => argv.includes(f);

const APP_ID  = getOpt('app-id', process.env.APP_ID || '');
const ENV     = getOpt('env', 'NONE');
const REGION  = getOpt('region', 'us-east-1');
const CONFIRM = hasFlag('--confirm');

if (!APP_ID) { console.error('--app-id requis'); process.exit(1); }

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);
const table = (name) => `${name}-${APP_ID}-${ENV}`;

// Tours à réparer : tourId → le GuideTour est published mais StudioSession reste submitted
const TOUR_IDS_TO_REPAIR = [
  'seed-am-beaulieu',
  'seed-am-monaco',
];

async function run() {
  console.log(`=== Repair StudioSession status (${CONFIRM ? 'WRITE' : 'DRY-RUN'}) ===\n`);

  for (const tourId of TOUR_IDS_TO_REPAIR) {
    console.log(`Tour: ${tourId}`);

    // 1. Get the GuideTour to find sessionId
    const gtScan = await dynamo.send(new ScanCommand({
      TableName: table('GuideTour'),
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { ':id': tourId },
    }));
    const tour = gtScan.Items?.[0];
    if (!tour) { console.log(`  ⚠️  GuideTour introuvable\n`); continue; }
    console.log(`  GuideTour.status = ${tour.status}`);

    const sessionId = tour.sessionId;
    if (!sessionId) { console.log(`  ⚠️  sessionId vide sur GuideTour\n`); continue; }
    console.log(`  sessionId = ${sessionId}`);

    // 2. Check StudioSession current status
    const ssScan = await dynamo.send(new ScanCommand({
      TableName: table('StudioSession'),
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { ':id': sessionId },
    }));
    const session = ssScan.Items?.[0];
    if (!session) { console.log(`  ⚠️  StudioSession introuvable\n`); continue; }
    console.log(`  StudioSession.status = ${session.status}`);

    if (session.status === 'published') {
      console.log(`  ✓ Déjà published — rien à faire\n`);
      continue;
    }

    if (CONFIRM) {
      await dynamo.send(new UpdateCommand({
        TableName: table('StudioSession'),
        Key: { id: sessionId },
        UpdateExpression: 'SET #s = :published, updatedAt = :now',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: { ':published': 'published', ':now': new Date().toISOString() },
      }));
      console.log(`  ✅ StudioSession mis à jour → published\n`);
    } else {
      console.log(`  → serait mis à jour vers published (ajouter --confirm pour écrire)\n`);
    }
  }

  console.log('=== Terminé ===');
}

run().catch(e => { console.error(e); process.exit(1); });
