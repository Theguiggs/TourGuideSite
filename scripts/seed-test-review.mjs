/**
 * seed-test-review.mjs — Seed quelques TourReview de test pour vérifier la page
 * Avis guide (affichage avis auditeurs + bouton "Répondre").
 *
 * Usage:
 *   node scripts/seed-test-review.mjs                 # auto-découvre un de TES tours
 *   node scripts/seed-test-review.mjs --tour <tourId> # cible un tourId précis
 *   node scripts/seed-test-review.mjs --clean         # supprime les avis de test (préfixe ci-dessous)
 *
 * Écrit directement en DynamoDB (même convention que les autres seeds).
 */

import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const ENV = 'NONE';
const REGION = 'us-east-1';
const SEED_PREFIX = 'seed-testavis-';

const rawClient = new DynamoDBClient({ region: REGION });
const dynamo = DynamoDBDocumentClient.from(rawClient, { marshallOptions: { removeUndefinedValues: true } });

// Resolved at runtime (override with --app-id <id> or AMPLIFY_APP_ID).
const appIdArgIdx = process.argv.indexOf('--app-id');
let APP_ID = appIdArgIdx >= 0 ? process.argv[appIdArgIdx + 1] : (process.env.AMPLIFY_APP_ID || null);

function table(name) {
  if (!APP_ID) throw new Error('APP_ID non résolu — appeler resolveAppId() d\'abord');
  return `${name}-${APP_ID}-${ENV}`;
}

// The CURRENT backend is the only one with a ReviewReply table (just deployed;
// the old 4z7fvz sandbox never had it) — use it to auto-detect the right API ID.
async function resolveAppId() {
  if (APP_ID) { console.log(`APP_ID (fourni): ${APP_ID}`); return; }
  const names = [];
  let start;
  do {
    const r = await rawClient.send(new ListTablesCommand({ ExclusiveStartTableName: start, Limit: 100 }));
    names.push(...(r.TableNames ?? []));
    start = r.LastEvaluatedTableName;
  } while (start);
  const rr = names.map(n => /^ReviewReply-(.+)-NONE$/.exec(n)).filter(Boolean).map(m => m[1]);
  const unique = [...new Set(rr)];
  if (unique.length === 1) { APP_ID = unique[0]; console.log(`APP_ID auto-détecté (via ReviewReply): ${APP_ID}`); return; }
  if (unique.length > 1) {
    console.error('Plusieurs backends avec ReviewReply:', unique.join(', '), '\n→ relance avec --app-id <id>');
    process.exit(1);
  }
  const trs = names.filter(n => /^TourReview-.+-NONE$/.test(n));
  console.error('❌ Aucune table ReviewReply-*-NONE trouvée — le schéma ReviewReply n\'est pas (encore) déployé sur ce compte AWS.');
  if (trs.length) console.error('   Tables TourReview présentes:', trs.join(', '));
  process.exit(1);
}
const now = new Date().toISOString();

const args = process.argv.slice(2);
const clean = args.includes('--clean');
const diag = args.includes('--diag');
const tourArgIdx = args.indexOf('--tour');
const tourArg = tourArgIdx >= 0 ? args[tourArgIdx + 1] : null;

async function scanAll(tableName) {
  // No ProjectionExpression: several attrs (status, comment, …) are DynamoDB
  // reserved keywords. Tables are small — scanning full items is fine.
  const items = [];
  let lastKey;
  do {
    const res = await dynamo.send(new ScanCommand({
      TableName: table(tableName),
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(res.Items ?? []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function cleanTestReviews() {
  const reviews = await scanAll('TourReview', 'id');
  const ids = reviews.filter(r => typeof r.id === 'string' && r.id.startsWith(SEED_PREFIX)).map(r => r.id);
  for (let i = 0; i < ids.length; i += 25) {
    await dynamo.send(new BatchWriteCommand({
      RequestItems: { [table('TourReview')]: ids.slice(i, i + 25).map(id => ({ DeleteRequest: { Key: { id } } })) },
    }));
  }
  console.log(`Cleaned ${ids.length} test review(s).`);
}

async function pickTour() {
  if (tourArg) return { tourId: tourArg, source: 'arg' };
  const sessions = await scanAll('StudioSession', 'id, tourId, guideId, title, updatedAt');
  const withTour = sessions.filter(s => typeof s.tourId === 'string' && s.tourId);
  if (withTour.length === 0) return null;
  // Prefer the user's own (non-seed) sessions, most recently updated.
  const sorted = withTour.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? '')));
  const own = sorted.find(s => !String(s.guideId ?? '').startsWith('seed-'));
  const chosen = own ?? sorted[0];
  return { tourId: chosen.tourId, guideId: chosen.guideId, title: chosen.title, source: own ? 'your session' : 'seed session (no own tour found)' };
}

const REVIEWS = [
  { rating: 5, language: 'fr', authorName: 'Camille', verified: true,  comment: "Visite passionnante, le guide raconte super bien l'histoire du quartier. À refaire !" },
  { rating: 4, language: 'fr', authorName: 'Marco',   verified: true,  comment: "Très bon parcours, beaux points de vue. Quelques passages un peu longs mais globalement top." },
  { rating: 3, language: 'en', authorName: 'Sarah',   verified: false, comment: "Nice walk and good audio quality, but I expected a few more anecdotes along the way." },
];

async function runDiag() {
  console.log(`\n=== DIAGNOSTIC (APP_ID=${APP_ID}) ===\n`);

  const sessions = await scanAll('StudioSession', 'id, tourId, guideId, title, status, updatedAt');
  console.log(`StudioSession: ${sessions.length} total`);
  const withTour = sessions.filter(s => s.tourId);
  console.log(`  avec tourId: ${withTour.length}`);
  for (const s of withTour.sort((a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''))).slice(0, 15)) {
    const own = !String(s.guideId ?? '').startsWith('seed-') ? ' [NON-SEED]' : '';
    console.log(`   - tourId=${s.tourId}  guideId=${s.guideId}${own}  status=${s.status ?? '?'}  "${s.title ?? ''}"`);
  }

  const reviews = await scanAll('TourReview', 'id, tourId, status, rating, comment, authorName');
  console.log(`\nTourReview: ${reviews.length} total`);
  const visible = reviews.filter(r => r.status === 'visible');
  const withComment = visible.filter(r => r.comment && String(r.comment).trim());
  const test = reviews.filter(r => typeof r.id === 'string' && r.id.startsWith(SEED_PREFIX));
  console.log(`  status=visible: ${visible.length} | visible+commentaire: ${withComment.length} | test (${SEED_PREFIX}): ${test.length}`);
  const byTour = {};
  for (const r of visible) byTour[r.tourId] = (byTour[r.tourId] ?? 0) + 1;
  console.log('  avis visibles par tourId:');
  for (const [tid, count] of Object.entries(byTour).slice(0, 20)) console.log(`   - ${tid}: ${count}`);

  console.log('\n→ Pour s\'afficher dans /guide/studio/avis : un avis doit avoir un tourId présent dans la liste StudioSession ci-dessus POUR LE GUIDE CONNECTÉ (ton guideId, non-seed).');
}

async function main() {
  await resolveAppId();
  if (diag) { await runDiag(); return; }
  if (clean) { await cleanTestReviews(); return; }

  const pick = await pickTour();
  if (!pick) {
    console.error('❌ Aucun StudioSession avec un tourId trouvé. Crée/soumets un tour d\'abord, ou passe --tour <tourId>.');
    process.exit(1);
  }
  console.log(`→ Cible: tourId=${pick.tourId} (${pick.source}${pick.title ? `, "${pick.title}"` : ''})`);

  let n = 0;
  for (const r of REVIEWS) {
    const id = `${SEED_PREFIX}${randomUUID()}`;
    await dynamo.send(new PutCommand({
      TableName: table('TourReview'),
      Item: {
        id,
        createdAt: now,
        updatedAt: now,
        __typename: 'TourReview',
        tourId: pick.tourId,
        userId: `${SEED_PREFIX}user-${n}`,
        rating: r.rating,
        comment: r.comment,
        visitedAt: Date.now(),
        language: r.language,
        helpfulCount: 0,
        status: 'visible',
        authorName: r.authorName,
        verified: r.verified,
      },
    }));
    n += 1;
    console.log(`  ✓ avis ${n}/${REVIEWS.length} — ${r.rating}★ ${r.authorName}${r.verified ? ' (vérifié)' : ''} [${r.language}]`);
  }
  console.log(`\n✅ ${n} avis de test seedés sur tourId=${pick.tourId}.`);
  console.log('   Va sur /guide/studio/avis (hard refresh) — ils doivent apparaître, avec le bouton "Répondre".');
  console.log('   Nettoyage: node scripts/seed-test-review.mjs --clean');
}

main().catch(e => { console.error('seed failed:', e); process.exit(1); });
