import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RELEASE_ROOT = path.resolve(ROOT, '..', '.release-web-i18n');
const require = createRequire(path.join(RELEASE_ROOT, 'package.json'));
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  ScanCommand,
  TransactWriteCommand,
} = require('@aws-sdk/lib-dynamodb');

const APP_ID = process.env.APP_ID || 't5nxxao3orh6za2bjj6uegulru';
const ENV = process.env.AMPLIFY_ENV || 'NONE';
const REGION = process.env.AWS_REGION || 'us-east-1';
const CONFIRM = process.argv.includes('--confirm');
const PREFIX = 'seed-100-';
const EXCLUDED = new Set(['biarritz-table-basque', 'nice-matisse-chagall-collines']);
const ARTIFACTS = path.join(ROOT, 'artifacts', 'content-expansion');
const WPM = 150;

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);
const table = (name) => `${name}-${APP_ID}-${ENV}`;

const seedSource = fs.readFileSync(path.join(ROOT, 'scripts', 'seed-100-visites.mjs'), 'utf8');
const slugBlock = seedSource.match(/const SLUGS = \[([\s\S]*?)\n\];/)?.[1];
if (!slugBlock) throw new Error('Unable to parse SLUGS from seed script');
const slugs = [...slugBlock.matchAll(/'([^']+)'/g)]
  .map((match) => match[1])
  .filter((slug) => !EXCLUDED.has(slug));

function parseScenes(markdown) {
  return markdown.split(/^##\s+Scène\s+/m).slice(1).map((block, sceneIndex) => {
    const lines = block.split('\n');
    const gpsIndex = lines.findIndex((line) => line.startsWith('**GPS'));
    if (gpsIndex < 0) throw new Error(`Scene ${sceneIndex + 1} has no GPS line`);
    const transcriptText = lines.slice(gpsIndex + 1)
      .join('\n')
      .replace(/^---\s*$/gm, '')
      .trim();
    const words = transcriptText.split(/\s+/).filter(Boolean).length;
    return {
      sceneIndex,
      transcriptText,
      durationSeconds: Math.round((words / WPM) * 60),
    };
  });
}

const localTours = slugs.map((slug) => {
  const tourId = `${PREFIX}${slug}`;
  const sessionId = `${tourId}-session`;
  const markdown = fs.readFileSync(path.join(ROOT, 'content', 'tours', slug, 'script-narration.md'), 'utf8');
  const scenes = parseScenes(markdown).map((scene) => ({
    ...scene,
    id: `${tourId}-scene-${scene.sceneIndex}`,
    sessionId,
  }));
  return { slug, tourId, sessionId, scenes };
});

async function scanPrefix(tableName, projectionExpression, names = {}) {
  const items = [];
  let ExclusiveStartKey;
  do {
    const result = await dynamo.send(new ScanCommand({
      TableName: table(tableName),
      FilterExpression: 'begins_with(id, :prefix)',
      ExpressionAttributeValues: { ':prefix': PREFIX },
      ProjectionExpression: projectionExpression,
      ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
      ExclusiveStartKey,
      ConsistentRead: true,
    }));
    items.push(...(result.Items ?? []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function snapshotRemote() {
  const [tours, scenes] = await Promise.all([
    scanPrefix('GuideTour', 'id, sessionId, #status, updatedAt', { '#status': 'status' }),
    scanPrefix('StudioScene', 'id, sessionId, sceneIndex, transcriptText, durationSeconds, #status, updatedAt', { '#status': 'status' }),
  ]);
  return { tours, scenes };
}

function audit(local, remote) {
  const remoteTours = new Map(remote.tours.map((tour) => [tour.id, tour]));
  const remoteScenes = new Map(remote.scenes.map((scene) => [scene.id, scene]));
  const errors = [];
  for (const tour of local) {
    const remoteTour = remoteTours.get(tour.tourId);
    if (!remoteTour) {
      errors.push(`${tour.slug}: GuideTour missing`);
      continue;
    }
    if (remoteTour.status !== 'draft') errors.push(`${tour.slug}: status is ${remoteTour.status}, expected draft`);
    if (remoteTour.sessionId !== tour.sessionId) errors.push(`${tour.slug}: unexpected sessionId ${remoteTour.sessionId}`);
    const actualScenes = remote.scenes.filter((scene) => scene.sessionId === tour.sessionId);
    if (actualScenes.length !== tour.scenes.length) {
      errors.push(`${tour.slug}: remote scene count ${actualScenes.length}, local ${tour.scenes.length}`);
    }
    for (const scene of tour.scenes) {
      const remoteScene = remoteScenes.get(scene.id);
      if (!remoteScene) errors.push(`${tour.slug}: scene ${scene.sceneIndex} missing`);
      else if (remoteScene.sessionId !== scene.sessionId || remoteScene.sceneIndex !== scene.sceneIndex) {
        errors.push(`${tour.slug}: scene ${scene.sceneIndex} identity mismatch`);
      }
    }
  }
  return errors;
}

async function updateTour(tour) {
  const now = new Date().toISOString();
  const TransactItems = [
    {
      ConditionCheck: {
        TableName: table('GuideTour'),
        Key: { id: tour.tourId },
        ConditionExpression: '#status = :draft AND sessionId = :sessionId',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':draft': 'draft', ':sessionId': tour.sessionId },
      },
    },
    ...tour.scenes.map((scene) => ({
      Update: {
        TableName: table('StudioScene'),
        Key: { id: scene.id },
        UpdateExpression: 'SET transcriptText = :text, durationSeconds = :duration, updatedAt = :updatedAt',
        ConditionExpression: 'attribute_exists(id) AND sessionId = :sessionId AND sceneIndex = :sceneIndex',
        ExpressionAttributeValues: {
          ':text': scene.transcriptText,
          ':duration': scene.durationSeconds,
          ':updatedAt': now,
          ':sessionId': scene.sessionId,
          ':sceneIndex': scene.sceneIndex,
        },
      },
    })),
  ];
  await dynamo.send(new TransactWriteCommand({ TransactItems }));
}

async function runWorkers(tours, concurrency) {
  const results = [];
  let cursor = 0;
  async function worker() {
    while (cursor < tours.length) {
      const tour = tours[cursor++];
      try {
        await updateTour(tour);
        results.push({ slug: tour.slug, ok: true, scenes: tour.scenes.length });
      } catch (error) {
        results.push({ slug: tour.slug, ok: false, error: `${error.name}: ${error.message}` });
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

fs.mkdirSync(ARTIFACTS, { recursive: true });
const before = await snapshotRemote();
const auditErrors = audit(localTours, before);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(ARTIFACTS, `remote-backup-${stamp}.json`);
fs.writeFileSync(backupPath, JSON.stringify({ appId: APP_ID, env: ENV, region: REGION, capturedAt: new Date().toISOString(), ...before }, null, 2));

const localSceneCount = localTours.reduce((sum, tour) => sum + tour.scenes.length, 0);
if (auditErrors.length) {
  console.error(JSON.stringify({ mode: CONFIRM ? 'confirm' : 'dry-run', tours: localTours.length, scenes: localSceneCount, backupPath, auditErrors }, null, 2));
  process.exit(1);
}

if (!CONFIRM) {
  console.log(JSON.stringify({ mode: 'dry-run', tours: localTours.length, scenes: localSceneCount, backupPath, auditErrors: 0 }, null, 2));
  process.exit(0);
}

const results = await runWorkers(localTours, 4);
const failed = results.filter((result) => !result.ok);
const after = await snapshotRemote();
const afterTours = new Map(after.tours.map((tour) => [tour.id, tour]));
const afterScenes = new Map(after.scenes.map((scene) => [scene.id, scene]));
const verificationErrors = [];
for (const tour of localTours) {
  const updateResult = results.find((result) => result.slug === tour.slug);
  if (!updateResult?.ok) continue;
  if (afterTours.get(tour.tourId)?.status !== 'draft') verificationErrors.push(`${tour.slug}: status changed after update`);
  for (const scene of tour.scenes) {
    const remote = afterScenes.get(scene.id);
    if (remote?.transcriptText !== scene.transcriptText || remote?.durationSeconds !== scene.durationSeconds) {
      verificationErrors.push(`${tour.slug}: scene ${scene.sceneIndex} verification failed`);
    }
  }
}

const report = {
  mode: 'confirm',
  tours: localTours.length,
  scenes: localSceneCount,
  updatedTours: results.filter((result) => result.ok).length,
  updatedScenes: results.filter((result) => result.ok).reduce((sum, result) => sum + result.scenes, 0),
  failed,
  verificationErrors,
  backupPath,
};
fs.writeFileSync(path.join(ARTIFACTS, 'remote-sync-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exitCode = failed.length || verificationErrors.length ? 1 : 0;
