/**
 * cleanup-e2e-data.mjs — Supprime toutes les données E2E (préfixe "e2e-") de DynamoDB.
 *
 * Usage:
 *   node scripts/cleanup-e2e-data.mjs
 *
 * Prérequis: AWS credentials configurés (env vars ou AWS config)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { readFileSync } from 'fs';

// F1 fix: derive APP_ID from amplify_outputs.json or env var
const APP_ID = process.env.AMPLIFY_APP_ID ?? '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV = 'NONE';
const REGION = 'us-east-1';
const E2E_PREFIX = 'e2e-';

const TABLES = [
  'GuideTour',
  'StudioSession',
  'StudioScene',
  'ModerationItem',
  'GuideDashboardStats',
];

const SEARCH_FIELDS = {
  GuideTour: ['title', 'guideId'],
  StudioSession: ['guideId', 'title'],
  StudioScene: ['title'],
  ModerationItem: ['tourTitle', 'guideId'],
  GuideDashboardStats: ['guideId'],
};

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);

let totalDeleted = 0;

for (const table of TABLES) {
  const fullName = `${table}-${APP_ID}-${ENV}`;
  const idsToDelete = new Set();

  // Scan for items with e2e- prefix in ID
  let lastKey;
  do {
    const scan = await dynamo.send(new ScanCommand({
      TableName: fullName,
      ProjectionExpression: 'id',
      ExclusiveStartKey: lastKey,
    }));

    for (const item of scan.Items ?? []) {
      if (typeof item.id === 'string' && item.id.startsWith(E2E_PREFIX)) {
        idsToDelete.add(item.id);
      }
    }
    lastKey = scan.LastEvaluatedKey;
  } while (lastKey);

  // Scan by relevant text fields
  for (const field of (SEARCH_FIELDS[table] ?? [])) {
    let key;
    do {
      const result = await dynamo.send(new ScanCommand({
        TableName: fullName,
        ProjectionExpression: 'id',
        FilterExpression: 'begins_with(#f, :prefix)',
        ExpressionAttributeNames: { '#f': field },
        ExpressionAttributeValues: { ':prefix': E2E_PREFIX },
        ExclusiveStartKey: key,
      }));
      for (const item of result.Items ?? []) {
        if (typeof item.id === 'string') {
          idsToDelete.add(item.id);
        }
      }
      key = result.LastEvaluatedKey;
    } while (key);
  }

  if (idsToDelete.size === 0) {
    console.log(`[cleanup] ${table}: 0 items to delete`);
    continue;
  }

  // Batch delete with retry for unprocessed items (max 25 per batch)
  const ids = [...idsToDelete];
  for (let i = 0; i < ids.length; i += 25) {
    const batch = ids.slice(i, i + 25);
    let requestItems = {
      [fullName]: batch.map(id => ({ DeleteRequest: { Key: { id } } })),
    };
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await dynamo.send(new BatchWriteCommand({ RequestItems: requestItems }));
      const unprocessed = response.UnprocessedItems?.[fullName];
      if (!unprocessed || unprocessed.length === 0) break;
      requestItems = { [fullName]: unprocessed };
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  console.log(`[cleanup] ${table}: deleted ${idsToDelete.size} items`);
  totalDeleted += idsToDelete.size;
}

console.log(`[cleanup] Total deleted: ${totalDeleted} items`);
