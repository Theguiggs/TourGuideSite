/**
 * reset-db.mjs — Vide toutes les tables DynamoDB du sandbox Amplify.
 *
 * Usage:
 *   node scripts/reset-db.mjs            # Demande confirmation
 *   node scripts/reset-db.mjs --force    # Sans confirmation
 *   node scripts/reset-db.mjs --table GuideTour  # Une seule table
 *
 * Prérequis: AWS CLI configuré avec les bons credentials (us-east-1)
 */

import { execSync } from 'child_process';
import * as readline from 'readline';

const APP_ID = '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV    = 'NONE';
const REGION = 'us-east-1';

const TABLES = [
  'StudioScene',
  'StudioSession',
  'ModerationItem',
  'GuideTour',
  'GuideProfile',
  'GuideDashboardStats',
  'TourReview',
  'TourStats',
  'TourHistory',
  'UserProfile',
];

const args = process.argv.slice(2);
const force = args.includes('--force');
const onlyTable = args.includes('--table') ? args[args.indexOf('--table') + 1] : null;

const tablesToClear = onlyTable
  ? TABLES.filter(t => t.toLowerCase() === onlyTable.toLowerCase())
  : TABLES;

if (tablesToClear.length === 0) {
  console.error(`Table "${onlyTable}" non trouvée. Tables disponibles: ${TABLES.join(', ')}`);
  process.exit(1);
}

function scanTable(tableName) {
  const fullName = `${tableName}-${APP_ID}-${ENV}`;
  try {
    const out = execSync(
      `aws dynamodb scan --table-name "${fullName}" --region ${REGION} --attributes-to-get "id"`,
      { encoding: 'utf8' }
    );
    const data = JSON.parse(out);
    return { fullName, items: data.Items ?? [] };
  } catch (e) {
    console.error(`Erreur scan ${fullName}:`, e.message);
    return { fullName, items: [] };
  }
}

function deleteItem(tableName, id) {
  const key = JSON.stringify({ id: { S: id } });
  execSync(
    `aws dynamodb delete-item --table-name "${tableName}" --region ${REGION} --key ${JSON.stringify(key)}`,
    { encoding: 'utf8' }
  );
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'o' || answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  console.log('\n=== Reset DynamoDB TourGuide ===\n');

  // Preview
  let total = 0;
  const tableStats = [];
  for (const table of tablesToClear) {
    const { fullName, items } = scanTable(table);
    tableStats.push({ table, fullName, items });
    total += items.length;
    console.log(`  ${table}: ${items.length} items`);
  }

  if (total === 0) {
    console.log('\nAucun item à supprimer. Base déjà vide.');
    return;
  }

  console.log(`\nTotal: ${total} items à supprimer.`);

  if (!force) {
    const ok = await confirm('\nConfirmer la suppression ? (o/n) > ');
    if (!ok) {
      console.log('Annulé.');
      return;
    }
  }

  console.log('\nSuppression en cours...');
  for (const { table, fullName, items } of tableStats) {
    if (items.length === 0) continue;
    process.stdout.write(`  ${table}: `);
    for (const item of items) {
      const id = item.id?.S;
      if (!id) continue;
      try {
        deleteItem(fullName, id);
        process.stdout.write('.');
      } catch (e) {
        process.stdout.write('x');
      }
    }
    console.log(` (${items.length} supprimés)`);
  }

  console.log('\nReset terminé.\n');
}

main().catch(console.error);
