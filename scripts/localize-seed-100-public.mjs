/**
 * Generate translations and TTS for the 100 curated seed tours on the public DB.
 *
 * Scope is deliberately hard-locked to ids starting with `seed-100-`.
 * The script is resumable: completed translations/audio are skipped on rerun.
 *
 * Usage:
 *   $env:MICROSERVICE_API_KEY='...'
 *   node scripts/localize-seed-100-public.mjs --confirm
 */

import { requireBackend } from './_backend.mjs';
import { createHash } from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import {
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

const REGION = 'us-east-1';
const BACKEND_SUFFIX = (() => { const b = requireBackend(); return `${b.appId}-${b.env}`; })();
const PREFIX = 'seed-100-';
const EXPECTED_TOURS = 100;
const EXPECTED_SCENES = 755;
const GUIDE_ID = '159473d2-8509-4d01-aa14-180d87772225';
const OWNER_SUB = '84a88428-e0e1-70d8-6a57-ec9f1421822e';
const OWNER = `${OWNER_SUB}::${OWNER_SUB}`;
const IDENTITY_ID = 'us-east-1:0ebd3fdc-511f-c6b4-c885-c1694d6baac3';
const BUCKET = 'amplify-tourguideapp-stef-tourguideassetsbucket8b8-nwmcsixu8au1';
const SERVICE_URL = process.env.MICROSERVICE_URL || 'http://127.0.0.1:8000';
const API_KEY = process.env.MICROSERVICE_API_KEY;
const TARGET_LANGUAGES = ['en', 'es', 'de', 'it'];
const ALL_LANGUAGES = ['fr', ...TARGET_LANGUAGES];
const TRANSLATION_BATCH_SIZE = 32;
const TTS_CONCURRENCY = 2;

if (!process.argv.includes('--confirm')) {
  console.error('Refusing to mutate the public backend without --confirm.');
  process.exit(2);
}
if (!API_KEY) {
  console.error('MICROSERVICE_API_KEY is required.');
  process.exit(2);
}

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);
const s3 = new S3Client({ region: REGION });
const headers = { 'Content-Type': 'application/json', 'X-API-Key': API_KEY };
const table = (name) => `${name}-${BACKEND_SUFFIX}`;
const isSeed = (item) => String(item?.id || '').startsWith(PREFIX);
const isRealAudio = (key) => typeof key === 'string' && key.endsWith('.wav');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function asObject(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return { ...value };
}

function sourceHash(text, title) {
  // Matches src/types/studio.ts hashSourceText (FNV-1a, not SHA).
  const value = `${text ?? ''}\0${title ?? ''}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

async function scanAll(name) {
  const items = [];
  let exclusiveStartKey;
  do {
    const result = await ddb.send(new ScanCommand({
      TableName: table(name),
      ExclusiveStartKey: exclusiveStartKey,
    }));
    items.push(...(result.Items || []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return items;
}

async function serviceFetch(path, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      const response = await fetch(`${SERVICE_URL}${path}`, {
        ...options,
        headers: { ...headers, ...(options.headers || {}) },
        signal: AbortSignal.timeout(60_000),
      });
      if (response.status === 429 || response.status >= 500) {
        lastError = new Error(`${path} returned ${response.status}: ${await response.text()}`);
        await sleep(Math.min(15_000, attempt * 2_000));
        continue;
      }
      if (!response.ok) {
        throw new Error(`${path} returned ${response.status}: ${await response.text()}`);
      }
      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 6) await sleep(Math.min(15_000, attempt * 2_000));
    }
  }
  throw lastError || new Error(`${path} failed`);
}

async function waitForJob(jobId, timeoutMs = 30 * 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const body = await serviceFetch(`/v1/jobs/${jobId}`);
    if (body.status === 'completed') return body;
    if (body.status === 'failed' || body.ok === false) {
      throw new Error(`Job ${jobId} failed: ${body.error || 'unknown error'}`);
    }
    await sleep(1_000);
  }
  throw new Error(`Job ${jobId} timed out`);
}

async function translateBatch(texts, targetLanguage) {
  const submitted = await serviceFetch('/v1/translate/batch', {
    method: 'POST',
    body: JSON.stringify({ texts, source_lang: 'fr', target_lang: targetLanguage }),
  });
  if (!submitted.ok || !submitted.job_id) {
    throw new Error(`Translation submit failed: ${JSON.stringify(submitted)}`);
  }
  const result = await waitForJob(submitted.job_id);
  if (!Array.isArray(result.translations) || result.translations.length !== texts.length) {
    throw new Error(`Translation result length mismatch for ${targetLanguage}`);
  }
  return result.translations;
}

async function generateAudio(text, language) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const submitted = await serviceFetch('/v1/tts/generate', {
        method: 'POST',
        body: JSON.stringify({ text, language }),
      });
      if (!submitted.ok || !submitted.job_id) {
        throw new Error(`TTS submit failed: ${JSON.stringify(submitted)}`);
      }
      const result = await waitForJob(submitted.job_id);
      const audio = Buffer.from(result.audio_base64 || '', 'base64');
      if (
        audio.length < 1_024 ||
        audio.subarray(0, 4).toString('ascii') !== 'RIFF' ||
        audio.subarray(8, 12).toString('ascii') !== 'WAVE'
      ) {
        throw new Error(`Invalid WAV payload (${audio.length} bytes)`);
      }
      return audio;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(attempt * 5_000);
    }
  }
  throw lastError;
}

async function mapConcurrent(items, concurrency, worker) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

function audioKey(sessionId, sceneIndex, language) {
  return `guide-studio/${IDENTITY_ID}/${sessionId}/audio/scene_${sceneIndex}_${language}.wav`;
}

async function putWav(key, body) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: 'audio/wav',
    Metadata: { generated: 'tts', scope: 'seed-100' },
  }));
}

async function preflight() {
  const health = await serviceFetch('/health', { method: 'GET' });
  if (!health.tts || !health.translation) {
    throw new Error(`Microservice capabilities missing: ${JSON.stringify(health)}`);
  }
  await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));

  const [allTours, allSessions, allScenes, allSegments, allPurchases] = await Promise.all([
    scanAll('GuideTour'),
    scanAll('StudioSession'),
    scanAll('StudioScene'),
    scanAll('SceneSegment'),
    scanAll('TourLanguagePurchase'),
  ]);
  const tours = allTours.filter(isSeed).sort((a, b) => a.id.localeCompare(b.id));
  const sessions = allSessions.filter(isSeed).sort((a, b) => a.id.localeCompare(b.id));
  const scenes = allScenes.filter(isSeed).sort((a, b) => a.id.localeCompare(b.id));
  const sessionIds = new Set(sessions.map((item) => item.id));
  const sceneIds = new Set(scenes.map((item) => item.id));
  const segments = allSegments.filter((item) => sceneIds.has(item.sceneId));
  const purchases = allPurchases.filter((item) => sessionIds.has(item.sessionId));

  if (tours.length !== EXPECTED_TOURS || sessions.length !== EXPECTED_TOURS || scenes.length !== EXPECTED_SCENES) {
    throw new Error(`Scope mismatch: tours=${tours.length}, sessions=${sessions.length}, scenes=${scenes.length}`);
  }
  if (tours.some((item) => item.status !== 'published') || sessions.some((item) => item.status !== 'published')) {
    throw new Error('All seed-100 tours and sessions must be published before localization.');
  }
  if (tours.some((item) => item.guideId !== GUIDE_ID || item.owner !== OWNER)) {
    throw new Error('Unexpected guide identity in seed-100 tours.');
  }
  if (scenes.some((item) => !item.transcriptText || !item.sessionId || !sessionIds.has(item.sessionId))) {
    throw new Error('Every seed-100 scene must have source text and a valid session.');
  }

  const toursById = new Map(tours.map((item) => [item.id, item]));
  const sessionsById = new Map(sessions.map((item) => [item.id, item]));
  for (const session of sessions) {
    if (!session.tourId || !toursById.has(session.tourId)) {
      throw new Error(`Invalid tour link on session ${session.id}`);
    }
  }
  console.log(`Preflight OK: ${tours.length} tours, ${sessions.length} sessions, ${scenes.length} scenes.`);
  return { tours, sessions, scenes, segments, purchases, toursById, sessionsById };
}

async function translateScenes(context, language) {
  const segmentByKey = new Map(
    context.segments.map((item) => [`${item.sceneId}:${item.language}`, item]),
  );
  const tasks = [];
  for (const scene of context.scenes) {
    const existing = segmentByKey.get(`${scene.id}:${language}`);
    if (!existing?.transcriptText) tasks.push({ scene, field: 'transcriptText', text: scene.transcriptText });
    if (scene.title && !existing?.translatedTitle) tasks.push({ scene, field: 'translatedTitle', text: scene.title });
  }
  console.log(`${language.toUpperCase()}: ${tasks.length} scene fields to translate.`);

  for (let start = 0; start < tasks.length; start += TRANSLATION_BATCH_SIZE) {
    const batch = tasks.slice(start, start + TRANSLATION_BATCH_SIZE);
    const translations = await translateBatch(batch.map((item) => item.text), language);
    const grouped = new Map();
    for (let index = 0; index < batch.length; index += 1) {
      const task = batch[index];
      const values = grouped.get(task.scene.id) || {};
      values[task.field] = translations[index];
      grouped.set(task.scene.id, values);
    }
    for (const [sceneId, values] of grouped) {
      const scene = batch.find((item) => item.scene.id === sceneId).scene;
      const key = `${scene.id}:${language}`;
      const existing = segmentByKey.get(key);
      const now = new Date().toISOString();
      const item = {
        ...(existing || {}),
        id: existing?.id || `${scene.id}-seg-${language}`,
        sceneId: scene.id,
        owner: OWNER,
        segmentIndex: 0,
        language,
        transcriptText: values.transcriptText || existing?.transcriptText,
        translatedTitle: values.translatedTitle || existing?.translatedTitle,
        status: isRealAudio(existing?.audioKey) ? 'tts_generated' : 'translated',
        ttsGenerated: isRealAudio(existing?.audioKey),
        translationProvider: 'marianmt',
        manuallyEdited: existing?.manuallyEdited || false,
        costProvider: existing?.costProvider ?? 0,
        costCharged: existing?.costCharged ?? 0,
        sourceUpdatedAt: scene.updatedAt || now,
        sourceTextHash: sourceHash(scene.transcriptText, scene.title),
        createdAt: existing?.createdAt || now,
        updatedAt: now,
        __typename: 'SceneSegment',
      };
      await ddb.send(new PutCommand({ TableName: table('SceneSegment'), Item: item }));
      if (existing) Object.assign(existing, item);
      else context.segments.push(item);
      segmentByKey.set(key, existing || item);
    }
    console.log(`${language.toUpperCase()}: translated ${Math.min(start + batch.length, tasks.length)}/${tasks.length} fields.`);
  }
}

async function translateMetadata(context, language) {
  const tasks = [];
  for (const session of context.sessions) {
    const titles = asObject(session.translatedTitles);
    const descriptions = asObject(session.translatedDescriptions);
    const tour = context.toursById.get(session.tourId);
    if (session.title && !titles[language]) tasks.push({ session, field: 'title', text: session.title });
    if (tour?.description && !descriptions[language]) tasks.push({ session, field: 'description', text: tour.description });
  }
  console.log(`${language.toUpperCase()}: ${tasks.length} metadata fields to translate.`);
  for (let start = 0; start < tasks.length; start += TRANSLATION_BATCH_SIZE) {
    const batch = tasks.slice(start, start + TRANSLATION_BATCH_SIZE);
    const translations = await translateBatch(batch.map((item) => item.text), language);
    const grouped = new Map();
    for (let index = 0; index < batch.length; index += 1) {
      const task = batch[index];
      const values = grouped.get(task.session.id) || {};
      values[task.field] = translations[index];
      grouped.set(task.session.id, values);
    }
    for (const [sessionId, values] of grouped) {
      const session = context.sessionsById.get(sessionId);
      const titles = asObject(session.translatedTitles);
      const descriptions = asObject(session.translatedDescriptions);
      if (values.title) titles[language] = values.title;
      if (values.description) descriptions[language] = values.description;
      const now = new Date().toISOString();
      await ddb.send(new UpdateCommand({
        TableName: table('StudioSession'),
        Key: { id: sessionId },
        UpdateExpression: 'SET translatedTitles = :titles, translatedDescriptions = :descriptions, updatedAt = :now',
        ExpressionAttributeValues: { ':titles': titles, ':descriptions': descriptions, ':now': now },
      }));
      session.translatedTitles = titles;
      session.translatedDescriptions = descriptions;
    }
  }
}

async function generateSourceTts(context) {
  const missing = context.scenes.filter((scene) => !isRealAudio(scene.studioAudioKey));
  console.log(`FR: ${missing.length} source audio files to generate.`);
  let completed = 0;
  await mapConcurrent(missing, TTS_CONCURRENCY, async (scene) => {
    const audio = await generateAudio(scene.transcriptText, 'fr');
    const key = audioKey(scene.sessionId, scene.sceneIndex, 'fr');
    await putWav(key, audio);
    const now = new Date().toISOString();
    await ddb.send(new UpdateCommand({
      TableName: table('StudioScene'),
      Key: { id: scene.id },
      UpdateExpression: 'SET studioAudioKey = :key, baseAudioSource = :source, #status = :status, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':key': key, ':source': 'tts', ':status': 'finalized', ':now': now },
    }));
    scene.studioAudioKey = key;
    completed += 1;
    if (completed % 10 === 0 || completed === missing.length) console.log(`FR TTS: ${completed}/${missing.length}`);
  });
}

async function generateTranslatedTts(context, language) {
  const segmentByKey = new Map(
    context.segments.map((item) => [`${item.sceneId}:${item.language}`, item]),
  );
  const missing = context.scenes
    .map((scene) => ({ scene, segment: segmentByKey.get(`${scene.id}:${language}`) }))
    .filter(({ segment }) => segment?.transcriptText && !isRealAudio(segment.audioKey));
  if (missing.length + context.segments.filter((item) => item.language === language && isRealAudio(item.audioKey)).length !== EXPECTED_SCENES) {
    throw new Error(`${language}: translations incomplete before TTS.`);
  }
  console.log(`${language.toUpperCase()}: ${missing.length} translated audio files to generate.`);
  let completed = 0;
  await mapConcurrent(missing, TTS_CONCURRENCY, async ({ scene, segment }) => {
    const audio = await generateAudio(segment.transcriptText, language);
    const key = audioKey(scene.sessionId, scene.sceneIndex, language);
    await putWav(key, audio);
    const now = new Date().toISOString();
    await ddb.send(new UpdateCommand({
      TableName: table('SceneSegment'),
      Key: { id: segment.id },
      UpdateExpression: 'SET audioKey = :key, audioSource = :source, ttsGenerated = :yes, #status = :status, updatedAt = :now',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':key': key, ':source': 'tts', ':yes': true, ':status': 'tts_generated', ':now': now },
    }));
    segment.audioKey = key;
    completed += 1;
    if (completed % 10 === 0 || completed === missing.length) {
      console.log(`${language.toUpperCase()} TTS: ${completed}/${missing.length}`);
    }
  });
}

async function submitLanguagePurchases(context, language) {
  const purchaseByKey = new Map(
    context.purchases.map((item) => [`${item.sessionId}:${item.language}`, item]),
  );
  const segments = context.segments.filter((item) => item.language === language);
  const segmentByScene = new Map(segments.map((item) => [item.sceneId, item]));
  let submitted = 0;
  for (const session of context.sessions) {
    const sessionScenes = context.scenes.filter((item) => item.sessionId === session.id);
    if (sessionScenes.some((scene) => {
      const segment = segmentByScene.get(scene.id);
      return !segment?.transcriptText || !isRealAudio(segment.audioKey);
    })) {
      throw new Error(`${language}: session ${session.id} is incomplete.`);
    }
    const existing = purchaseByKey.get(`${session.id}:${language}`);
    const now = new Date().toISOString();
    const item = {
      ...(existing || {}),
      id: existing?.id || `${session.id}-purchase-${language}`,
      guideId: GUIDE_ID,
      owner: OWNER,
      sessionId: session.id,
      language,
      qualityTier: 'standard',
      provider: 'marianmt',
      purchaseType: 'single',
      amountCents: existing?.amountCents ?? 0,
      moderationStatus: 'submitted',
      status: 'active',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      __typename: 'TourLanguagePurchase',
    };
    await ddb.send(new PutCommand({ TableName: table('TourLanguagePurchase'), Item: item }));
    submitted += 1;
  }
  console.log(`${language.toUpperCase()}: ${submitted} language versions submitted for moderation.`);
}

async function listSeedAudioKeys() {
  const keys = new Set();
  let continuationToken;
  do {
    const result = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: `guide-studio/${IDENTITY_ID}/seed-100-`,
      ContinuationToken: continuationToken,
    }));
    for (const item of result.Contents || []) if (item.Key) keys.add(item.Key);
    continuationToken = result.NextContinuationToken;
  } while (continuationToken);
  return keys;
}

async function verify() {
  const [scenes, segments, purchases, sessions, s3Keys] = await Promise.all([
    scanAll('StudioScene').then((items) => items.filter(isSeed)),
    scanAll('SceneSegment'),
    scanAll('TourLanguagePurchase'),
    scanAll('StudioSession').then((items) => items.filter(isSeed)),
    listSeedAudioKeys(),
  ]);
  const sceneIds = new Set(scenes.map((item) => item.id));
  const sessionIds = new Set(sessions.map((item) => item.id));
  const seedSegments = segments.filter((item) => sceneIds.has(item.sceneId));
  const seedPurchases = purchases.filter((item) => sessionIds.has(item.sessionId));
  const errors = [];
  for (const scene of scenes) {
    if (!isRealAudio(scene.studioAudioKey) || !s3Keys.has(scene.studioAudioKey)) errors.push(`FR audio ${scene.id}`);
  }
  for (const language of TARGET_LANGUAGES) {
    const localized = seedSegments.filter((item) => item.language === language);
    if (localized.length !== EXPECTED_SCENES) errors.push(`${language} segment count=${localized.length}`);
    for (const segment of localized) {
      if (!segment.transcriptText || !isRealAudio(segment.audioKey) || !s3Keys.has(segment.audioKey)) {
        errors.push(`${language} incomplete ${segment.sceneId}`);
      }
    }
    const langPurchases = seedPurchases.filter((item) => item.language === language);
    if (langPurchases.length !== EXPECTED_TOURS || langPurchases.some((item) => item.moderationStatus !== 'submitted')) {
      errors.push(`${language} purchases invalid (${langPurchases.length})`);
    }
    for (const session of sessions) {
      if (!asObject(session.translatedTitles)[language] || !asObject(session.translatedDescriptions)[language]) {
        errors.push(`${language} metadata ${session.id}`);
      }
    }
  }
  const expectedAudio = EXPECTED_SCENES * ALL_LANGUAGES.length;
  const result = {
    sourceScenes: scenes.length,
    translatedSegments: seedSegments.length,
    languagePurchases: seedPurchases.length,
    s3AudioFiles: s3Keys.size,
    expectedAudio,
    errors: errors.length,
  };
  console.log(`FINAL_VERIFICATION ${JSON.stringify(result)}`);
  if (errors.length) {
    console.error(errors.slice(0, 20).join('\n'));
    throw new Error(`Final verification failed with ${errors.length} errors.`);
  }
}

async function run() {
  const context = await preflight();
  if (process.argv.includes('--preflight-only')) {
    console.log('Preflight-only run completed.');
    return;
  }
  // The source-language soundtrack is customer-facing as soon as a tour is
  // published, so generate it before the longer four-language translation run.
  await generateSourceTts(context);
  for (const language of TARGET_LANGUAGES) {
    await translateScenes(context, language);
    await translateMetadata(context, language);
  }
  for (const language of TARGET_LANGUAGES) {
    await generateTranslatedTts(context, language);
    await submitLanguagePurchases(context, language);
  }
  await verify();
  console.log('Localization completed successfully.');
}

run().catch((error) => {
  const fingerprint = createHash('sha256').update(String(error?.stack || error)).digest('hex').slice(0, 12);
  console.error(`FATAL [${fingerprint}]`, error);
  process.exit(1);
});
