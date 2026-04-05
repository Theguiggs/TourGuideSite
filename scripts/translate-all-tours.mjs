/**
 * translate-all-tours.mjs — Translate ALL tours for a guide into EN+ES
 * using the real MarianMT microservice + TTS, then create SceneSegments + purchases.
 *
 * Usage:
 *   node scripts/translate-all-tours.mjs
 *
 * Prerequisites:
 *   - Microservice running on localhost:8000 with API key
 *   - AWS credentials configured
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const APP_ID = '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV = 'NONE';
const REGION = 'us-east-1';
const OWNER_SUB = '94a8a4f8-c071-7044-275f-e2db387cf370';
const OWNER = `${OWNER_SUB}::${OWNER_SUB}`;
const GUIDE_ID = '41ea28da-e472-4f21-8b23-69a2b3a59816';
const S3_BUCKET = 'amplify-tourguide-steff-s-tourguideassetsbucket8b8-zj0ssbc9viom';
const IDENTITY_ID = 'us-east-1:0ebd3fdc-5119-c17e-8e7e-45090986e665';
const TTS_URL = 'http://localhost:8000';
const API_KEY = 'tourguide-tts-2026';
const LANGS = ['en', 'es', 'de'];
const MAX_TTS_TEXT = 2000;

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);
const s3 = new S3Client({ region: REGION });

function table(name) { return `${name}-${APP_ID}-${ENV}`; }
const now = new Date().toISOString();
const headers = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true', 'X-API-Key': API_KEY };

// ═══════════════════════════════════════════════════════════
// Translation (sentence-by-sentence for quality)
// ═══════════════════════════════════════════════════════════

function splitSentences(text) {
  if (text.length < 150) return [text];
  const parts = text.match(/[^.!?]*[.!?]+(?:\s|$)|[^.!?]+$/g);
  if (!parts || parts.length <= 1) return [text];
  return parts.map(s => s.trim()).filter(Boolean);
}

async function translate(text, sourceLang, targetLang) {
  if (!text || text.length < 5) return text;
  const sentences = splitSentences(text);
  const translated = [];
  for (const sentence of sentences) {
    const resp = await fetch(`${TTS_URL}/v1/translate/marianmt`, {
      method: 'POST', headers,
      body: JSON.stringify({ text: sentence, source_lang: sourceLang, target_lang: targetLang }),
    });
    if (!resp.ok) throw new Error(`Translation ${resp.status}: ${await resp.text()}`);
    const data = await resp.json();
    if (!data.ok) throw new Error(`Translation failed: ${JSON.stringify(data)}`);
    translated.push(data.translated_text);
  }
  return translated.join(' ');
}

// ═══════════════════════════════════════════════════════════
// TTS generation
// ═══════════════════════════════════════════════════════════

async function generateTTS(text, language) {
  if (!text || text.length < 5) return null;
  // Split long text into chunks
  const sentences = splitSentences(text);
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > MAX_TTS_TEXT && current) { chunks.push(current.trim()); current = s; }
    else current += s;
  }
  if (current.trim()) chunks.push(current.trim());

  const buffers = [];
  for (const chunk of chunks) {
    const resp = await fetch(`${TTS_URL}/v1/tts/generate`, {
      method: 'POST', headers,
      body: JSON.stringify({ text: chunk, language }),
    });
    if (!resp.ok) throw new Error(`TTS ${resp.status}`);
    const data = await resp.json();
    if (!data.ok || !data.audio_base64) throw new Error('TTS no audio');
    buffers.push(Buffer.from(data.audio_base64, 'base64'));
  }
  return buffers.length === 1 ? buffers[0] : Buffer.concat(buffers);
}

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════

async function run() {
  // 1. Check microservice
  console.log('Checking microservice...');
  const health = await fetch(`${TTS_URL}/health`, { headers }).then(r => r.json());
  if (!health.tts) { console.error('TTS not available'); process.exit(1); }
  console.log('Microservice OK\n');

  // 2. Load all sessions + scenes for guide
  const allSessions = (await dynamo.send(new ScanCommand({ TableName: table('StudioSession') }))).Items
    .filter(s => s.owner?.includes(OWNER_SUB));
  const allScenes = (await dynamo.send(new ScanCommand({ TableName: table('StudioScene') }))).Items
    .filter(s => s.owner?.includes(OWNER_SUB));
  const existingSegs = (await dynamo.send(new ScanCommand({ TableName: table('SceneSegment') }))).Items || [];
  const existingPurchases = (await dynamo.send(new ScanCommand({ TableName: table('TourLanguagePurchase') }))).Items || [];

  console.log(`${allSessions.length} sessions, ${allScenes.length} scenes, ${existingSegs.length} existing segments, ${existingPurchases.length} existing purchases\n`);

  let segCreated = 0, segSkipped = 0, ttsCreated = 0, purchaseCreated = 0, errors = 0;

  for (const session of allSessions) {
    const sessionScenes = allScenes
      .filter(sc => sc.sessionId === session.id)
      .sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));

    if (sessionScenes.length === 0) continue;

    const tourId = session.tourId?.replace('-session', '') || session.tourId;
    console.log(`\n${session.title} (${sessionScenes.length} scenes)`);

    for (const lang of LANGS) {
      // Create purchase if missing
      const existingPurchase = existingPurchases.find(p => p.sessionId === session.id && p.language === lang);
      if (!existingPurchase) {
        await dynamo.send(new PutCommand({
          TableName: table('TourLanguagePurchase'),
          Item: {
            id: `${session.id}-purchase-${lang}`,
            guideId: GUIDE_ID, owner: OWNER, sessionId: session.id,
            language: lang, qualityTier: 'standard', provider: 'marianmt',
            purchaseType: 'single', amountCents: 199,
            moderationStatus: 'draft', status: 'active',
            createdAt: now, updatedAt: now, __typename: 'TourLanguagePurchase',
          },
        }));
        purchaseCreated++;
      }

      // Translate + TTS each scene
      for (const scene of sessionScenes) {
        const segId = `${scene.id}-seg-${lang}`;

        // Skip if segment already exists with text
        const existing = existingSegs.find(s => s.sceneId === scene.id && s.language === lang);
        if (existing?.transcriptText) {
          segSkipped++;
          continue;
        }

        const sourceText = scene.transcriptText;
        if (!sourceText || sourceText.length < 10) {
          segSkipped++;
          continue;
        }

        try {
          // Translate
          process.stdout.write(`  ${lang.toUpperCase()} scene ${scene.sceneIndex}: ${(scene.title || '').substring(0, 30)}... `);
          const translatedText = await translate(sourceText, session.language || 'fr', lang);
          const translatedTitle = scene.title ? await translate(scene.title, session.language || 'fr', lang) : null;

          // TTS
          const audioBuffer = await generateTTS(translatedText, lang);
          let audioKey = null;
          if (audioBuffer) {
            audioKey = `guide-studio/${IDENTITY_ID}/${session.id}/audio/scene_${scene.sceneIndex}_${lang}.bin`;
            await s3.send(new PutObjectCommand({
              Bucket: S3_BUCKET, Key: audioKey, Body: audioBuffer, ContentType: 'audio/wav',
            }));
            ttsCreated++;
          }

          // Save segment
          const segItem = {
            id: existing?.id || segId,
            sceneId: scene.id, owner: OWNER, segmentIndex: 0,
            language: lang, transcriptText: translatedText,
            status: audioKey ? 'tts_generated' : 'translated',
            ttsGenerated: !!audioKey, translationProvider: 'marianmt',
            manuallyEdited: false, costProvider: 0, costCharged: 0,
            createdAt: now, updatedAt: now, __typename: 'SceneSegment',
            ...(translatedTitle ? { translatedTitle } : {}),
            ...(audioKey ? { audioKey } : {}),
            sourceUpdatedAt: scene.updatedAt || now,
          };
          await dynamo.send(new PutCommand({ TableName: table('SceneSegment'), Item: segItem }));
          segCreated++;

          const kb = audioBuffer ? `${(audioBuffer.length / 1024).toFixed(0)}KB` : 'no-audio';
          console.log(`OK (${kb})`);
        } catch (e) {
          console.log(`FAILED: ${e.message?.substring(0, 60)}`);
          errors++;
        }
      }

      // Translate session title + description
      try {
        const translatedTitle = session.title ? await translate(session.title, session.language || 'fr', lang) : null;
        const desc = session.tourId ? await (async () => {
          const tours = (await dynamo.send(new ScanCommand({
            TableName: table('GuideTour'),
            FilterExpression: 'id = :id',
            ExpressionAttributeValues: { ':id': session.tourId },
          }))).Items;
          return tours?.[0]?.description || '';
        })() : '';
        const translatedDesc = desc ? await translate(desc, session.language || 'fr', lang) : null;

        if (translatedTitle || translatedDesc) {
          // Read existing translations and merge
          const existingTitles = session.translatedTitles ? (typeof session.translatedTitles === 'string' ? JSON.parse(session.translatedTitles) : session.translatedTitles) : {};
          const existingDescs = session.translatedDescriptions ? (typeof session.translatedDescriptions === 'string' ? JSON.parse(session.translatedDescriptions) : session.translatedDescriptions) : {};
          if (translatedTitle) existingTitles[lang] = translatedTitle;
          if (translatedDesc) existingDescs[lang] = translatedDesc;

          await dynamo.send(new UpdateCommand({
            TableName: table('StudioSession'),
            Key: { id: session.id },
            UpdateExpression: 'SET translatedTitles = :t, translatedDescriptions = :d, updatedAt = :now',
            ExpressionAttributeValues: { ':t': existingTitles, ':d': existingDescs, ':now': now },
          }));
          console.log(`  ${lang.toUpperCase()} session info translated`);
        }
      } catch (e) {
        console.log(`  ${lang.toUpperCase()} session info FAILED: ${e.message?.substring(0, 60)}`);
      }
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Segments: ${segCreated} created, ${segSkipped} skipped`);
  console.log(`TTS audio: ${ttsCreated} generated`);
  console.log(`Purchases: ${purchaseCreated} created`);
  if (errors) console.log(`Errors: ${errors}`);
}

run().catch(e => { console.error('FATAL:', e); process.exit(1); });
