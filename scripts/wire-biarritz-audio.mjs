// ══════════════════════════════════════════════════════════
// wire-biarritz-audio.mjs — branche l'audio TTS dans le draft Biarritz
// ══════════════════════════════════════════════════════════
//
// À lancer APRÈS avoir généré les 9 audios en voix clonée (Colab
// qwen3_tts_colab.ipynb → ZIP → décompressé quelque part).
//
// Pour chaque scène i (0..8) :
//   1. convertit scene_i.wav → AAC (ffmpeg)
//   2. upload vers S3 (bucket VIVANT) sous guide-audio/{tour}/scene_i.aac
//   3. passe la StudioScene i en status=finalized + studioAudioKey + baseAudioSource=tts
// Puis marque GuideTour.languageAudioTypes = {fr:'tts'} (disclosure « voix de synthèse »).
// Le tour RESTE en draft — à toi de le publier ensuite depuis le Studio.
//
// ── Prérequis ──────────────────────────────────────────────
//   • ffmpeg + ffprobe dans le PATH (OK sur ta machine)
//   • Identifiants AWS (~/.aws), région us-east-1
//   • SDK : @aws-sdk/client-s3 + client-dynamodb + lib-dynamodb (déjà installés)
//
// ── Lancement ──────────────────────────────────────────────
//   node scripts/wire-biarritz-audio.mjs --dir="C:/chemin/vers/audio"            # dry-run (aperçu)
//   node scripts/wire-biarritz-audio.mjs --dir="C:/chemin/vers/audio" --confirm  # convertit + upload + écrit
//
//   --dir     dossier contenant scene_0.wav … scene_8.wav (recherche récursive)
//   --confirm effectue réellement conversion/upload/écriture DynamoDB
//   --bucket  override du bucket S3 (défaut = bucket vivant)
// ══════════════════════════════════════════════════════════

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { readFileSync, readdirSync, statSync, mkdtempSync } from 'fs';
import { join, extname } from 'path';
import { tmpdir } from 'os';
import { execFileSync } from 'child_process';

// ── Options ────────────────────────────────────────────────
const args = process.argv.slice(2);
const getOpt = (n, d) => { const p = args.find(a => a.startsWith(`--${n}=`)); return p ? p.split('=').slice(1).join('=') : d; };
const CONFIRM = args.includes('--confirm');
const DIR     = getOpt('dir', './biarritz-audio');
const REGION  = process.env.AWS_REGION || 'us-east-1';
const BUCKET  = getOpt('bucket', 'amplify-tourguideapp-stef-tourguideassetsbucket8b8-nwmcsixu8au1');
const APP_ID  = 't5nxxao3orh6za2bjj6uegulru';
const ENV     = 'NONE';
const TOUR_ID = 'biarritz-caprice-imperatrice';
const SESSION_ID = `${TOUR_ID}-session`;
const N_SCENES = 9;

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));
const s3 = new S3Client({ region: REGION });
const table = (n) => `${n}-${APP_ID}-${ENV}`;

// ── Localiser les fichiers audio (scene_N.*) récursivement ─
function findScenes(dir) {
  const found = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) { walk(full); continue; }
      const m = name.match(/scene[_-]?(\d+)\.(wav|mp3|m4a|aac)$/i);
      if (m) { const idx = parseInt(m[1], 10); if (!found[idx]) found[idx] = full; }
    }
  };
  try { walk(dir); } catch { /* dir absent */ }
  return found;
}

function ffprobeDuration(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nk=1:nw=1', file], { encoding: 'utf8' });
    return Math.round(parseFloat(out.trim()) || 0);
  } catch { return 0; }
}

function toAac(src, dst) {
  execFileSync('ffmpeg', ['-y', '-i', src, '-c:a', 'aac', '-b:a', '128k', '-ar', '44100', '-f', 'adts', dst], { stdio: 'ignore' });
}

async function run() {
  const scenes = findScenes(DIR);
  const present = Object.keys(scenes).map(Number).sort((a, b) => a - b);

  console.log(`\n═══ Branchement audio — Biarritz (draft) ═══`);
  console.log(`  Dossier : ${DIR}`);
  console.log(`  Bucket  : ${BUCKET}`);
  console.log(`  Backend : ${APP_ID}-${ENV} (${REGION})`);
  console.log(`  Trouvé  : ${present.length}/${N_SCENES} scènes\n`);

  const missing = [];
  for (let i = 0; i < N_SCENES; i++) {
    if (scenes[i]) {
      const dur = ffprobeDuration(scenes[i]);
      console.log(`  ✓ scene ${i}: ${scenes[i].split(/[\\/]/).pop()}  (~${Math.round(dur / 60)} min)`);
    } else { missing.push(i); console.log(`  ✖ scene ${i}: MANQUANTE`); }
  }
  if (missing.length) console.log(`\n  ⚠ Scènes manquantes: ${missing.join(', ')} — elles resteront sans audio.`);

  if (!CONFIRM) {
    console.log(`\n  ⚠ DRY-RUN — rien n'a été converti/uploadé/écrit. Ajoute --confirm.\n`);
    return;
  }
  if (!present.length) { console.error('\n  ✖ Aucun fichier audio trouvé sous --dir.\n'); process.exit(1); }

  // garde-fou : le tour draft doit exister
  const gt = await dynamo.send(new GetCommand({ TableName: table('GuideTour'), Key: { id: TOUR_ID } }));
  if (!gt.Item) { console.error(`\n  ✖ GuideTour ${TOUR_ID} introuvable — lance d'abord seed-biarritz-tour.mjs --confirm.\n`); process.exit(1); }

  const tmp = mkdtempSync(join(tmpdir(), 'biarritz-aac-'));
  const nowIso = new Date().toISOString();

  for (const i of present) {
    const src = scenes[i];
    let aac = src;
    if (extname(src).toLowerCase() !== '.aac') { aac = join(tmp, `scene_${i}.aac`); console.log(`  · convert scene ${i} → aac…`); toAac(src, aac); }
    const dur = ffprobeDuration(aac) || ffprobeDuration(src);
    const key = `guide-audio/${TOUR_ID}/scene_${i}.aac`;
    const origKey = `guide-audio/${TOUR_ID}/scene_${i}_original.aac`;
    const body = readFileSync(aac);

    for (const k of [key, origKey]) {
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: k, Body: body, ContentType: 'audio/aac' }));
    }
    console.log(`  ☁️  s3://${BUCKET}/${key}`);

    await dynamo.send(new UpdateCommand({
      TableName: table('StudioScene'), Key: { id: `${TOUR_ID}-scene-${i}` },
      UpdateExpression: 'SET #s=:fin, studioAudioKey=:k, originalAudioKey=:ok, baseAudioSource=:tts, codecStatus=:codec, transcriptionStatus=:tr, qualityScore=:q, durationSeconds=:d, archived=:a, updatedAt=:u',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: {
        ':fin': 'finalized', ':k': key, ':ok': origKey, ':tts': 'tts', ':codec': 'native_aac',
        ':tr': 'completed', ':q': 'good', ':d': dur, ':a': false, ':u': nowIso,
      },
    }));
    console.log(`  ✓ StudioScene ${i} → finalized (${Math.round(dur / 60)} min)`);
  }

  // Disclosure « voix de synthèse » + session cohérente
  await dynamo.send(new UpdateCommand({
    TableName: table('GuideTour'), Key: { id: TOUR_ID },
    UpdateExpression: 'SET languageAudioTypes=:lat, updatedAt=:u',
    ExpressionAttributeValues: { ':lat': JSON.stringify({ fr: 'tts' }), ':u': nowIso },
  }));

  console.log(`\n  ✅ ${present.length} scènes sonorisées. Le tour reste en draft — écoute dans le Studio puis publie.\n`);
}

run().catch((e) => { console.error('\n✖ Échec :', e.message); process.exit(1); });
