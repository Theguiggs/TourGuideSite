/**
 * Upload locally selected seed-100 covers to the public TourGuide asset bucket.
 *
 * Dry-run by default. Public S3 writes require --confirm.
 */
import { requireBackend } from './_backend.mjs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchGetCommand } from '@aws-sdk/lib-dynamodb';
import {
  GetBucketVersioningCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const REGION = 'us-east-1';
const { appId: APP_ID } = requireBackend(); // cible : --app-id= ou APPSYNC_API_ID
const ENV = 'NONE';
const BUCKET = 'amplify-tourguideapp-stef-tourguideassetsbucket8b8-nwmcsixu8au1';
const TABLE = `GuideTour-${APP_ID}-${ENV}`;
const PREFIX = 'seed-100-';
const SUFFIX = '-cover.png';
const confirm = process.argv.includes('--confirm');
const onlyNew = process.argv.includes('--only-new');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const selectedDir = path.resolve(scriptDir, '..', 'output', 'cover-proposals', 'selected');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const s3 = new S3Client({ region: REGION });

const names = (await readdir(selectedDir))
  .filter((name) => name.startsWith(PREFIX) && name.endsWith(SUFFIX))
  .sort();
if (names.length === 0) throw new Error(`No selected covers found in ${selectedDir}`);

const covers = await Promise.all(names.map(async (name) => {
  const id = name.slice(0, -SUFFIX.length);
  const source = path.join(selectedDir, name);
  const metadata = await sharp(source).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 1200 || metadata.height < 700) {
    throw new Error(`Invalid source dimensions for ${name}: ${metadata.width}x${metadata.height}`);
  }
  return { id, name, source, width: metadata.width, height: metadata.height,
    key: `guide-photos/${id}/cover.jpg` };
}));

const records = [];
for (let index = 0; index < covers.length; index += 100) {
  const result = await ddb.send(new BatchGetCommand({
    RequestItems: {
      [TABLE]: {
        Keys: covers.slice(index, index + 100).map(({ id }) => ({ id })),
        ConsistentRead: true,
      },
    },
  }));
  records.push(...(result.Responses?.[TABLE] ?? []));
  if ((result.UnprocessedKeys?.[TABLE]?.Keys ?? []).length > 0) {
    throw new Error('DynamoDB returned unprocessed cover tour keys. Retry the command.');
  }
}

const byId = new Map(records.map((record) => [record.id, record]));
const missing = covers.filter(({ id }) => !byId.has(id)).map(({ id }) => id);
const mismatched = covers.filter(({ id, key }) => byId.get(id)?.coverPhotoKey !== key)
  .map(({ id, key }) => ({ id, expected: key, actual: byId.get(id)?.coverPhotoKey }));
if (missing.length || mismatched.length) {
  throw new Error(JSON.stringify({ missing, mismatched }, null, 2));
}

await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
const versioning = await s3.send(new GetBucketVersioningCommand({ Bucket: BUCKET }));
let existing = 0;
const existingKeys = new Set();
for (const { key } of covers) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    existing += 1;
    existingKeys.add(key);
  } catch (error) {
    if (error?.$metadata?.httpStatusCode !== 404 && error?.name !== 'NotFound') throw error;
  }
}

const coversToUpload = onlyNew
  ? covers.filter(({ key }) => !existingKeys.has(key))
  : covers;

console.log(JSON.stringify({
  dryRun: !confirm,
  onlyNew,
  selectedDir,
  selectedCovers: covers.length,
  databaseRecords: records.length,
  existingObjectsToReplace: existing,
  newObjects: covers.length - existing,
  objectsToUpload: coversToUpload.length,
  bucketVersioning: versioning.Status ?? 'Disabled',
  dimensions: [...new Set(covers.map(({ width, height }) => `${width}x${height}`))],
}, null, 2));
if (!confirm) process.exit(0);

for (const [index, cover] of coversToUpload.entries()) {
  const body = await sharp(cover.source)
    .rotate()
    .resize(1536, 1024, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 88, chromaSubsampling: '4:4:4', mozjpeg: true })
    .toBuffer();
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: cover.key,
    Body: body,
    ContentType: 'image/jpeg',
    CacheControl: 'public, max-age=3600, must-revalidate',
    Metadata: { source: 'ai-generated-cover', tourid: cover.id },
  }));
  const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: cover.key }));
  if (head.ContentType !== 'image/jpeg' || Number(head.ContentLength ?? 0) !== body.length) {
    throw new Error(`S3 verification failed for ${cover.key}`);
  }
  console.log(`[${index + 1}/${coversToUpload.length}] ${cover.key} (${body.length} bytes)`);
}

const verified = [];
for (const { id, key } of covers) {
  const record = byId.get(id);
  const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
  verified.push(Boolean(record && record.coverPhotoKey === key && head.ContentType === 'image/jpeg'));
}
console.log(JSON.stringify({ uploaded: coversToUpload.length, verified: verified.filter(Boolean).length,
  failed: verified.filter((value) => !value).length }, null, 2));
if (verified.some((value) => !value)) process.exit(1);
