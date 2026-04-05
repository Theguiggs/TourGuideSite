/**
 * generate-tts-seed.mjs — Generate TTS audio for all seeded scenes
 *
 * Calls the local TTS microservice (localhost:8000) to generate audio
 * from each scene's transcriptText, then uploads to S3.
 *
 * Usage:
 *   node scripts/generate-tts-seed.mjs
 *   node scripts/generate-tts-seed.mjs --tour tour06-nice-cimiez   (single tour)
 *   node scripts/generate-tts-seed.mjs --dry-run                    (check without generating)
 *
 * Prerequisites:
 *   - TTS microservice running on localhost:8000
 *   - AWS CLI configured (us-east-1)
 *   - seed-tours-06.mjs already ran
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const APP_ID = '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV = 'NONE';
const REGION = 'us-east-1';
const SEED_PREFIX = 'tour06-';
const S3_BUCKET = 'amplify-tourguide-steff-s-tourguideassetsbucket8b8-zj0ssbc9viom';
const TTS_URL = process.env.NEXT_PUBLIC_MICROSERVICE_URL || 'http://localhost:8000';
const API_KEY = process.env.NEXT_PUBLIC_MICROSERVICE_API_KEY || '';
const MAX_TEXT_LENGTH = 2000; // TTS models have limits — truncate if needed

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const tourFilter = args.includes('--tour') ? args[args.indexOf('--tour') + 1] : null;

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);
const s3 = new S3Client({ region: REGION });

function table(name) { return `${name}-${APP_ID}-${ENV}`; }

// ═══════════════════════════════════════════════════════════
// TTS generation — calls microservice
// ═══════════════════════════════════════════════════════════

async function generateTTS(text, language = 'fr') {
  // Split long text into chunks (TTS models work better with shorter text)
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > MAX_TEXT_LENGTH && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // Generate TTS for each chunk
  const audioBuffers = [];
  for (const chunk of chunks) {
    const response = await fetch(`${TTS_URL}/v1/tts/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
      },
      body: JSON.stringify({ text: chunk, language }),
    });

    if (!response.ok) {
      throw new Error(`TTS failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.ok || !data.audio_base64) {
      throw new Error(`TTS returned error: ${JSON.stringify(data).substring(0, 200)}`);
    }

    audioBuffers.push(Buffer.from(data.audio_base64, 'base64'));
  }

  // Concatenate all chunks (simple concatenation for WAV — works for playback)
  if (audioBuffers.length === 1) return audioBuffers[0];
  return Buffer.concat(audioBuffers);
}

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════

async function run() {
  // 1. Check TTS microservice
  console.log(`Checking TTS microservice at ${TTS_URL}...`);
  try {
    const health = await fetch(`${TTS_URL}/health`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(API_KEY ? { 'X-API-Key': API_KEY } : {}),
      },
    });
    const data = await health.json();
    console.log(`  Status: ${health.status}, TTS: ${data.tts ? 'OK' : 'DOWN'}\n`);
    if (!data.tts) {
      console.error('TTS service is not available. Start the microservice first.');
      process.exit(1);
    }
  } catch (e) {
    console.error(`Cannot reach TTS microservice at ${TTS_URL}: ${e.message}`);
    console.error('Start the microservice first: python microservice/main.py');
    process.exit(1);
  }

  // 2. Load scenes
  console.log('Loading scenes from DynamoDB...');
  const sceneTable = table('StudioScene');
  let lastKey;
  const allScenes = [];
  do {
    const scan = await dynamo.send(new ScanCommand({
      TableName: sceneTable,
      ExclusiveStartKey: lastKey,
    }));
    for (const item of scan.Items ?? []) {
      if (item.id?.startsWith(SEED_PREFIX)) {
        if (tourFilter && !item.sessionId?.includes(tourFilter)) continue;
        allScenes.push(item);
      }
    }
    lastKey = scan.LastEvaluatedKey;
  } while (lastKey);

  allScenes.sort((a, b) => {
    if (a.sessionId !== b.sessionId) return a.sessionId.localeCompare(b.sessionId);
    return (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0);
  });

  console.log(`  Found ${allScenes.length} scenes${tourFilter ? ` (filtered: ${tourFilter})` : ''}\n`);

  if (DRY_RUN) {
    console.log('DRY RUN — would generate TTS for:');
    let currentSession = '';
    for (const scene of allScenes) {
      if (scene.sessionId !== currentSession) {
        currentSession = scene.sessionId;
        console.log(`\n  ${currentSession.replace('-session', '')}:`);
      }
      const textLen = (scene.transcriptText || '').length;
      console.log(`    ${scene.sceneIndex}: ${scene.title} (${textLen} chars)`);
    }
    console.log(`\n  Total: ${allScenes.length} audio files to generate`);
    return;
  }

  // 3. Generate TTS for each scene
  let success = 0;
  let failed = 0;
  let currentSession = '';

  for (const scene of allScenes) {
    if (scene.sessionId !== currentSession) {
      currentSession = scene.sessionId;
      console.log(`\n${currentSession.replace('-session', '')}:`);
    }

    const text = scene.transcriptText;
    if (!text || text.length < 10) {
      console.log(`  ${scene.sceneIndex}: ${scene.title} — SKIP (no text)`);
      continue;
    }

    const tourId = scene.sessionId.replace('-session', '');
    const s3Key = `guide-audio/${tourId}/scene_${scene.sceneIndex}.aac`;

    try {
      process.stdout.write(`  ${scene.sceneIndex}: ${scene.title} (${text.length} chars)... `);

      const audioBuffer = await generateTTS(text, 'fr');

      // Upload to S3
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: audioBuffer,
        ContentType: 'audio/wav',
      }));

      // Update scene in DynamoDB to confirm audio key
      await dynamo.send(new UpdateCommand({
        TableName: sceneTable,
        Key: { id: scene.id },
        UpdateExpression: 'SET studioAudioKey = :key, updatedAt = :now',
        ExpressionAttributeValues: {
          ':key': s3Key,
          ':now': new Date().toISOString(),
        },
      }));

      console.log(`OK (${(audioBuffer.length / 1024).toFixed(0)} KB)`);
      success++;
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  Success: ${success}/${allScenes.length}`);
  if (failed > 0) console.log(`  Failed: ${failed}`);
  console.log(`  Audio files in S3: guide-audio/{tourId}/scene_N.aac`);
}

run().catch((err) => {
  console.error('FAILED:', err);
  process.exit(1);
});
