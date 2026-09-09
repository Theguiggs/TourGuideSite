/**
 * Synchronize selected seed-100 cover keys into the public GuideTour table.
 *
 * Dry-run by default. Production writes require --confirm.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  BatchGetCommand,
  DynamoDBDocumentClient,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const REGION = 'us-east-1';
const APP_ID = 't5nxxao3orh6za2bjj6uegulru';
const ENV = 'NONE';
const TABLE = `GuideTour-${APP_ID}-${ENV}`;
const PREFIX = 'seed-100-';
const SUFFIX = '-cover.png';
const confirm = process.argv.includes('--confirm');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const selectedDir = path.resolve(scriptDir, '..', 'output', 'cover-proposals', 'selected');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const names = (await readdir(selectedDir))
  .filter((name) => name.startsWith(PREFIX) && name.endsWith(SUFFIX))
  .sort();
if (names.length === 0) throw new Error(`No selected covers found in ${selectedDir}`);

const expected = names.map((name) => {
  const id = name.slice(0, -SUFFIX.length);
  return { id, coverPhotoKey: `guide-photos/${id}/cover.jpg` };
});

const records = [];
for (let index = 0; index < expected.length; index += 100) {
  const result = await ddb.send(new BatchGetCommand({
    RequestItems: {
      [TABLE]: {
        Keys: expected.slice(index, index + 100).map(({ id }) => ({ id })),
        ConsistentRead: true,
      },
    },
  }));
  records.push(...(result.Responses?.[TABLE] ?? []));
  if ((result.UnprocessedKeys?.[TABLE]?.Keys ?? []).length > 0) {
    throw new Error('DynamoDB returned unprocessed keys. Retry the command.');
  }
}

const byId = new Map(records.map((record) => [record.id, record]));
const missing = expected.filter(({ id }) => !byId.has(id)).map(({ id }) => id);
if (missing.length > 0) throw new Error(`Missing GuideTour records: ${missing.join(', ')}`);

const mismatchedBefore = expected.filter(({ id, coverPhotoKey }) => (
  byId.get(id)?.coverPhotoKey !== coverPhotoKey
));
console.log(JSON.stringify({
  dryRun: !confirm,
  table: TABLE,
  selectedCovers: expected.length,
  recordsFound: records.length,
  alreadySynchronized: expected.length - mismatchedBefore.length,
  requiringChange: mismatchedBefore.length,
}, null, 2));
if (!confirm) process.exit(0);

const updatedAt = new Date().toISOString();
for (const [index, { id, coverPhotoKey }] of expected.entries()) {
  await ddb.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: 'SET coverPhotoKey = :coverPhotoKey, updatedAt = :updatedAt',
    ConditionExpression: 'attribute_exists(id)',
    ExpressionAttributeValues: { ':coverPhotoKey': coverPhotoKey, ':updatedAt': updatedAt },
  }));
  console.log(`[${index + 1}/${expected.length}] ${id}`);
}

const verified = [];
for (let index = 0; index < expected.length; index += 100) {
  const result = await ddb.send(new BatchGetCommand({
    RequestItems: {
      [TABLE]: {
        Keys: expected.slice(index, index + 100).map(({ id }) => ({ id })),
        ConsistentRead: true,
        ProjectionExpression: 'id, coverPhotoKey, updatedAt',
      },
    },
  }));
  verified.push(...(result.Responses?.[TABLE] ?? []));
}
const verifiedById = new Map(verified.map((record) => [record.id, record]));
const failed = expected.filter(({ id, coverPhotoKey }) => (
  verifiedById.get(id)?.coverPhotoKey !== coverPhotoKey
  || verifiedById.get(id)?.updatedAt !== updatedAt
));
console.log(JSON.stringify({
  written: expected.length,
  verified: expected.length - failed.length,
  failed: failed.map(({ id }) => id),
  updatedAt,
}, null, 2));
if (failed.length > 0) process.exit(1);
