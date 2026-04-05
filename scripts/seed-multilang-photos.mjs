/**
 * seed-multilang-photos.mjs — Complete seed data for multilang review:
 * 1. SceneSegments (EN + ES) for each scene — translated text + audio keys
 * 2. TourLanguagePurchases (EN + ES) with moderationStatus 'submitted'
 * 3. Upload photos from tour_photos/ to S3
 *
 * Prerequisites:
 *   - seed-tours-06.mjs already ran (GuideTours, StudioSessions, StudioScenes exist)
 *   - AWS CLI configured (us-east-1)
 *   - tour_photos/ directory with subdirectories per tour
 *
 * Usage:
 *   node scripts/seed-multilang-photos.mjs --user-id <cognito-sub>
 *   node scripts/seed-multilang-photos.mjs --user-id <cognito-sub> --skip-photos
 *   node scripts/seed-multilang-photos.mjs --user-id <cognito-sub> --clean
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════

const APP_ID = '4z7fvz7n2bh5rpixdgihjmhdpa';
const ENV = 'NONE';
const REGION = 'us-east-1';
const SEED_PREFIX = 'tour06-';
const S3_BUCKET = 'amplify-tourguide-steff-s-tourguideassetsbucket8b8-zj0ssbc9viom';
const PHOTOS_DIR = join(__dirname, '..', 'tour_photos');

const LANGUAGES = ['en', 'es'];

// Parse CLI args
const args = process.argv.slice(2);
const userIdIdx = args.indexOf('--user-id');
if (userIdIdx === -1 || !args[userIdIdx + 1]) {
  console.error('Usage: node scripts/seed-multilang-photos.mjs --user-id <cognito-sub> [--skip-photos] [--clean]');
  process.exit(1);
}
const USER_ID = args[userIdIdx + 1];
const SKIP_PHOTOS = args.includes('--skip-photos');
const DO_CLEAN = args.includes('--clean');

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION }),
  { marshallOptions: { removeUndefinedValues: true } },
);
const s3 = new S3Client({ region: REGION });

function table(name) { return `${name}-${APP_ID}-${ENV}`; }
const now = new Date().toISOString();

function put(tableName, item) {
  return dynamo.send(
    new PutCommand({
      TableName: table(tableName),
      Item: { createdAt: now, updatedAt: now, __typename: tableName, ...item },
    }),
  );
}

// ═══════════════════════════════════════════════════════════
// Simple translation placeholders (prefix with lang tag)
// Real translations would come from the microservice
// ═══════════════════════════════════════════════════════════

const TRANSLATION_PREFIXES = {
  en: {
    prefix: '[EN] ',
    titleMap: {
      'Arènes de Cimiez': 'Cimiez Arena',
      'Musée et Site archéologique de Cimiez': 'Cimiez Archaeological Museum',
      'Musée Matisse': 'Matisse Museum',
      'Monastère de Cimiez et ses jardins': 'Cimiez Monastery and Gardens',
      'Musée National Marc Chagall': 'Marc Chagall National Museum',
      'Boulevard de Cimiez — Villas Belle Époque': 'Boulevard de Cimiez — Belle Époque Villas',
      'Parc des Arènes — Oliveraie': 'Arena Park — Olive Grove',
    },
  },
  es: {
    prefix: '[ES] ',
    titleMap: {
      'Arènes de Cimiez': 'Arena de Cimiez',
      'Musée et Site archéologique de Cimiez': 'Museo y Sitio Arqueológico de Cimiez',
      'Musée Matisse': 'Museo Matisse',
      'Monastère de Cimiez et ses jardins': 'Monasterio de Cimiez y sus Jardines',
      'Musée National Marc Chagall': 'Museo Nacional Marc Chagall',
      'Boulevard de Cimiez — Villas Belle Époque': 'Boulevard de Cimiez — Villas Belle Époque',
      'Parc des Arènes — Oliveraie': 'Parque de la Arena — Olivar',
    },
  },
};

function translateTitle(title, lang) {
  return TRANSLATION_PREFIXES[lang]?.titleMap[title] || `${TRANSLATION_PREFIXES[lang]?.prefix || ''}${title}`;
}

function translateText(text, lang) {
  if (!text) return null;
  // For seed purposes: prefix each sentence with lang tag
  // In production, the microservice would do real translation
  const prefix = lang === 'en' ? '[EN Translation] ' : '[ES Traducción] ';
  return prefix + text.substring(0, 500) + (text.length > 500 ? '...' : '');
}

// ═══════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════

async function cleanMultilang() {
  const tables = ['SceneSegment', 'TourLanguagePurchase'];
  let total = 0;
  for (const t of tables) {
    const fullName = table(t);
    let lastKey;
    const ids = [];
    do {
      const scan = await dynamo.send(
        new ScanCommand({
          TableName: fullName,
          ProjectionExpression: 'id',
          ExclusiveStartKey: lastKey,
        }),
      );
      for (const item of scan.Items ?? []) {
        if (typeof item.id === 'string' && item.id.startsWith(SEED_PREFIX)) {
          ids.push(item.id);
        }
      }
      lastKey = scan.LastEvaluatedKey;
    } while (lastKey);

    for (let i = 0; i < ids.length; i += 25) {
      await dynamo.send(
        new BatchWriteCommand({
          RequestItems: {
            [fullName]: ids.slice(i, i + 25).map((id) => ({
              DeleteRequest: { Key: { id } },
            })),
          },
        }),
      );
    }
    if (ids.length) console.log(`  Cleaned ${t}: ${ids.length} items`);
    total += ids.length;
  }
  return total;
}

// ═══════════════════════════════════════════════════════════
// Photo mapping: tour_photos folder → tour IDs
// ═══════════════════════════════════════════════════════════

const PHOTO_FOLDER_MAP = {
  'tour01_Nice_Tresors_Vieux_Nice': 'tour06-nice-baroque',
  'tour02_Nice_Promenade_des_Anglais': 'tour06-nice-promenade',
  'tour03_Nice_Cimiez_Rome_Matisse': 'tour06-nice-cimiez',
  'tour04_Cannes_Suquet_Croisette': 'tour06-cannes-suquet',
  'tour05_Cannes_Iles_Lerins': 'tour06-cannes-lerins',
  'tour06_Antibes_Remparts_Picasso': 'tour06-antibes-picasso',
  'tour07_Menton_Jardins_Eden': 'tour06-menton-jardins',
  'tour08_Saint_Paul_Village_Artistes': 'tour06-saintpaul-artistes',
  'tour09_Eze_Nid_Aigle': 'tour06-eze-nid-aigle',
  'tour10_Vence_Chapelle_Matisse': 'tour06-vence-matisse',
  'tour11_Grasse_Routes_Parfum': 'tour06-grasse-parfum',
  'tour12_Villefranche_Rade_Doree': 'tour06-villefranche-rade',
  'tour13_Nice_Street_Food': 'tour06-nice-streetfood',
  'tour14_Nice_Scandales_Glamour': 'tour06-nice-scandales',
  'tour15_Nice_Legendes_Fantomes': 'tour06-nice-insolite',
};

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════

async function run() {
  if (DO_CLEAN) {
    console.log('Cleaning existing multilang data...');
    const cleaned = await cleanMultilang();
    console.log(`Cleaned ${cleaned} items.\n`);
  }

  console.log('=== Seed Multilang + Photos ===\n');

  // 1. Scan all StudioScenes with tour06- prefix
  console.log('Loading existing scenes from DynamoDB...');
  const sceneTable = table('StudioScene');
  let lastKey;
  const allScenes = [];
  do {
    const scan = await dynamo.send(
      new ScanCommand({
        TableName: sceneTable,
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of scan.Items ?? []) {
      if (item.id?.startsWith(SEED_PREFIX)) {
        allScenes.push(item);
      }
    }
    lastKey = scan.LastEvaluatedKey;
  } while (lastKey);

  console.log(`  Found ${allScenes.length} scenes\n`);

  // Group scenes by sessionId
  const scenesBySession = new Map();
  for (const scene of allScenes) {
    const sid = scene.sessionId;
    if (!scenesBySession.has(sid)) scenesBySession.set(sid, []);
    scenesBySession.get(sid).push(scene);
  }

  // 2. Resolve guide profile
  const guideProfileTable = table('GuideProfile');
  let guideId = null;
  {
    const scan = await dynamo.send(
      new ScanCommand({
        TableName: guideProfileTable,
        FilterExpression: 'userId = :uid',
        ExpressionAttributeValues: { ':uid': USER_ID },
      }),
    );
    guideId = scan.Items?.[0]?.id || 'unknown-guide';
  }
  console.log(`  Guide: ${guideId}\n`);

  // 3. Create SceneSegments + TourLanguagePurchases
  let segCount = 0;
  let purchaseCount = 0;

  for (const [sessionId, scenes] of scenesBySession) {
    const sortedScenes = scenes.sort((a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0));
    const tourId = sessionId.replace('-session', '');

    console.log(`  ${tourId} (${sortedScenes.length} scenes)`);

    for (const lang of LANGUAGES) {
      // Create TourLanguagePurchase
      await put('TourLanguagePurchase', {
        id: `${SEED_PREFIX}purchase-${tourId}-${lang}`,
        guideId,
        owner: `${USER_ID}::${USER_ID}`,
        sessionId,
        language: lang,
        qualityTier: 'standard',
        provider: 'marianmt',
        purchaseType: 'single',
        amountCents: 199,
        moderationStatus: 'submitted',
        status: 'active',
        refundedAt: null,
      });
      purchaseCount++;

      // Create SceneSegments for each scene
      for (const scene of sortedScenes) {
        const translatedTitle = translateTitle(scene.title || `Scene ${scene.sceneIndex}`, lang);
        const translatedNarration = translateText(scene.transcriptText, lang);

        await put('SceneSegment', {
          id: `${scene.id}-seg-${lang}`,
          sceneId: scene.id,
          owner: `${USER_ID}::${USER_ID}`,
          segmentIndex: 0,
          language: lang,
          transcriptText: translatedNarration,
          translatedTitle,
          audioKey: `guide-audio/${tourId}/scene_${scene.sceneIndex}_${lang}.aac`,
          ttsGenerated: true,
          translationProvider: 'marianmt',
          status: 'tts_generated',
          manuallyEdited: false,
          costProvider: 0,
          costCharged: 0,
          startTimeMs: null,
          endTimeMs: null,
          sourceSegmentId: null,
          sourceUpdatedAt: scene.updatedAt || now,
        });
        segCount++;
      }
    }
  }

  console.log(`\n  Created ${segCount} SceneSegments (${LANGUAGES.join('+')})`);
  console.log(`  Created ${purchaseCount} TourLanguagePurchases\n`);

  // 4. Upload photos to S3
  if (!SKIP_PHOTOS) {
    console.log('=== Uploading Photos to S3 ===\n');

    if (!existsSync(PHOTOS_DIR)) {
      console.log(`  Photos directory not found: ${PHOTOS_DIR}`);
      console.log('  Skipping photo upload.\n');
    } else {
      let photoCount = 0;
      const folders = readdirSync(PHOTOS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const folder of folders) {
        const tourId = PHOTO_FOLDER_MAP[folder];
        if (!tourId) {
          console.log(`  Skipping unknown folder: ${folder}`);
          continue;
        }

        const folderPath = join(PHOTOS_DIR, folder);
        const files = readdirSync(folderPath).filter((f) => f.endsWith('.jpg') || f.endsWith('.png'));

        for (let i = 0; i < files.length; i++) {
          const filePath = join(folderPath, files[i]);
          const s3Key = `guide-photos/${tourId}/poi_${i}.jpg`;

          try {
            const body = readFileSync(filePath);
            await s3.send(new PutObjectCommand({
              Bucket: S3_BUCKET,
              Key: s3Key,
              Body: body,
              ContentType: files[i].endsWith('.png') ? 'image/png' : 'image/jpeg',
            }));
            photoCount++;
          } catch (err) {
            console.log(`  FAILED: ${s3Key} — ${err.message}`);
          }
        }
        console.log(`  ${tourId}: ${files.length} photos uploaded`);
      }
      console.log(`\n  Total photos uploaded: ${photoCount}`);
    }
  } else {
    console.log('Skipping photo upload (--skip-photos).\n');
  }

  console.log('\n=== Done ===');
  console.log(`  ${segCount} segments, ${purchaseCount} purchases`);
  console.log('  Admin queue should now show submitted languages for all tours.');
}

run().catch((err) => {
  console.error('SEED FAILED:', err);
  process.exit(1);
});
