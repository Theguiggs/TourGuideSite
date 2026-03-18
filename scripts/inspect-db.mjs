/**
 * inspect-db.mjs — Affiche le contenu des tables DynamoDB TourGuide.
 *
 * Usage:
 *   node scripts/inspect-db.mjs              # Toutes les tables
 *   node scripts/inspect-db.mjs --table GuideTour
 */

import { execSync } from 'child_process';

const APP_ID = '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV    = 'NONE';
const REGION = 'us-east-1';

const TABLES = {
  GuideProfile: ['id', 'displayName', 'city', 'profileStatus', 'tourCount', 'userId'],
  GuideTour:    ['id', 'title', 'city', 'status', 'guideId'],
  ModerationItem: ['id', 'tourTitle', 'guideName', 'status', 'tourId', 'submissionDate'],
  TourReview:   ['id', 'tourId', 'rating', 'status'],
  TourStats:    ['id', 'tourId', 'totalListens'],
  GuideDashboardStats: ['id', 'guideId'],
};

const args = process.argv.slice(2);
const onlyTable = args.includes('--table') ? args[args.indexOf('--table') + 1] : null;

function scan(tableName, fields) {
  const fullName = `${tableName}-${APP_ID}-${ENV}`;
  try {
    const out = execSync(
      `aws dynamodb scan --table-name "${fullName}" --region ${REGION} --attributes-to-get ${fields.join(' ')}`,
      { encoding: 'utf8' }
    );
    return JSON.parse(out).Items ?? [];
  } catch {
    return null;
  }
}

function val(item, key) {
  const v = item[key];
  if (!v) return '—';
  return v.S ?? v.N ?? v.BOOL ?? JSON.stringify(v);
}

function formatDate(ts) {
  if (!ts || ts === '—') return ts;
  const n = Number(ts);
  if (!isNaN(n) && n > 1000000000000) return new Date(n).toLocaleString('fr-FR');
  return ts;
}

const tablesToShow = onlyTable
  ? Object.fromEntries(Object.entries(TABLES).filter(([k]) => k.toLowerCase() === onlyTable.toLowerCase()))
  : TABLES;

for (const [table, fields] of Object.entries(tablesToShow)) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${table}`);
  console.log(`${'─'.repeat(60)}`);

  const items = scan(table, fields);
  if (items === null) {
    console.log('  [erreur lecture]');
    continue;
  }
  if (items.length === 0) {
    console.log('  (vide)');
    continue;
  }

  for (const item of items) {
    const line = fields
      .map((f) => {
        let v = val(item, f);
        if (f === 'submissionDate') v = formatDate(v);
        if (f === 'id') return `id: ${String(v).substring(0, 8)}...`;
        return `${f}: ${v}`;
      })
      .join('  |  ');
    console.log(`  ${line}`);
  }
  console.log(`  [${items.length} items]`);
}

console.log('');
