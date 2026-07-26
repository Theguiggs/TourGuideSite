/**
 * Removes orphaned E2E data from the deployed DynamoDB backend.
 *
 * Usage:
 *   node scripts/cleanup-e2e-data.mjs --dry-run
 *   node scripts/cleanup-e2e-data.mjs
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const APP_ID = process.env.AMPLIFY_APP_ID ?? 't5nxxao3orh6za2bjj6uegulru';
const ENV = process.env.AMPLIFY_ENV ?? 'NONE';
const REGION = process.env.AWS_REGION ?? 'us-east-1';
const E2E_PREFIX = 'e2e-';
const DRY_RUN = process.argv.includes('--dry-run');

const TABLES = [
  'GuideTour',
  'StudioSession',
  'StudioScene',
  'ModerationItem',
  'TourLanguagePurchase',
  'SceneSegment',
  'WalkSegment',
  'TourStats',
  'TourReview',
  'ReviewReply',
  'TourComment',
  'TourHistory',
  'TourAccessCode',
  'TourPurchase',
  'UserEntitlement',
  'GuideDashboardStats',
];

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);

async function scanTable(table) {
  const tableName = `${table}-${APP_ID}-${ENV}`;
  const items = [];
  let lastKey;

  do {
    const result = await dynamo.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastKey,
    }));
    items.push(...(result.Items ?? []));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return { table, tableName, items };
}

function startsWithE2e(value) {
  return typeof value === 'string' && value.toLowerCase().startsWith(E2E_PREFIX);
}

function directlyMarked(item) {
  return ['id', 'title', 'tourTitle', 'guideId'].some((field) => startsWithE2e(item[field]));
}

function collectIds(items) {
  return new Set(items.map((item) => item.id).filter((id) => typeof id === 'string'));
}

function selectRelatedData(scans) {
  const byTable = new Map(scans.map(({ table, items }) => [table, items]));
  const selected = new Map();

  const select = (table, predicate) => {
    const matches = (byTable.get(table) ?? []).filter(
      (item) => directlyMarked(item) || predicate(item),
    );
    selected.set(table, matches);
    return collectIds(matches);
  };

  const tourIds = select('GuideTour', () => false);
  const sessionIds = select('StudioSession', (item) => tourIds.has(item.tourId));
  const sceneIds = select('StudioScene', (item) => sessionIds.has(item.sessionId));
  const reviewIds = select('TourReview', (item) => tourIds.has(item.tourId));

  select('ModerationItem', (item) => tourIds.has(item.tourId));
  select('TourLanguagePurchase', (item) => sessionIds.has(item.sessionId));
  select('SceneSegment', (item) => sceneIds.has(item.sceneId));
  select('WalkSegment', (item) =>
    sessionIds.has(item.sessionId) || tourIds.has(item.tourId));
  select('TourStats', (item) => tourIds.has(item.tourId));
  select('ReviewReply', (item) => reviewIds.has(item.reviewId));
  select('TourComment', (item) => tourIds.has(item.tourId));
  select('TourHistory', (item) => tourIds.has(item.tourId));
  select('TourAccessCode', (item) => tourIds.has(item.tourId));
  select('TourPurchase', (item) => tourIds.has(item.tourId));
  select('UserEntitlement', (item) => tourIds.has(item.tourId));
  select('GuideDashboardStats', () => false);

  return selected;
}

async function deleteItems(tableName, items) {
  let deleted = 0;

  for (let index = 0; index < items.length; index += 25) {
    let pending = items.slice(index, index + 25).map(({ id }) => ({
      DeleteRequest: { Key: { id } },
    }));

    for (let attempt = 0; pending.length > 0 && attempt < 5; attempt += 1) {
      const result = await dynamo.send(new BatchWriteCommand({
        RequestItems: { [tableName]: pending },
      }));
      const unprocessed = result.UnprocessedItems?.[tableName] ?? [];
      deleted += pending.length - unprocessed.length;
      pending = unprocessed;

      if (pending.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }

    if (pending.length > 0) {
      throw new Error(`[cleanup] ${tableName}: ${pending.length} deletions remained unprocessed`);
    }
  }

  return deleted;
}

if (!/^[a-z0-9]{10,32}$/i.test(APP_ID)) {
  throw new Error(`[cleanup] Invalid AMPLIFY_APP_ID: ${APP_ID}`);
}

console.log(`[cleanup] Backend ${APP_ID}/${ENV} in ${REGION}${DRY_RUN ? ' (dry run)' : ''}`);
const scans = await Promise.all(TABLES.map(scanTable));
const selected = selectRelatedData(scans);
let total = 0;

for (const { table, tableName } of scans) {
  const items = selected.get(table) ?? [];
  if (items.length === 0) {
    console.log(`[cleanup] ${table}: 0`);
    continue;
  }

  const count = DRY_RUN ? items.length : await deleteItems(tableName, items);
  console.log(`[cleanup] ${table}: ${DRY_RUN ? 'would delete' : 'deleted'} ${count}`);
  total += count;
}

console.log(`[cleanup] Total ${DRY_RUN ? 'selected' : 'deleted'}: ${total}`);
