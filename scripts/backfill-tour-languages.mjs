/**
 * One-shot backfill: populate GuideTour.availableLanguages + translatedAudioKeys
 * for tours whose languages were APPROVED before those fields existed.
 *
 * Reads the active sandbox tables directly (IAM creds), mirroring the logic now
 * run on approval in language-purchase.ts. Safe/idempotent: only writes the two
 * consumer-facing fields, recomputed from current approved purchases + segments.
 *
 *   node scripts/backfill-tour-languages.mjs
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';

const API = 't5nxxao3orh6za2bjj6uegulru'; // active sandbox AppSync API id
const REGION = 'us-east-1';
const T = m => `${m}-${API}-NONE`;
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const isRealAudio = k => !!k && !k.startsWith('tts-') && !k.endsWith('.bin');

async function scanAll(table) {
  let items = [];
  let ExclusiveStartKey;
  do {
    const r = await ddb.send(new ScanCommand({ TableName: table, ExclusiveStartKey }));
    items = items.concat(r.Items ?? []);
    ExclusiveStartKey = r.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return items;
}

async function main() {
  const purchases = await scanAll(T('TourLanguagePurchase'));
  const approved = purchases.filter(p => p.moderationStatus === 'approved' && p.status === 'active');
  console.log(`Approved+active purchases: ${approved.length}`);

  const bySession = {};
  for (const p of approved) {
    (bySession[p.sessionId] ??= new Set()).add(p.language);
  }

  const allSegments = await scanAll(T('SceneSegment'));
  const allScenes = await scanAll(T('StudioScene'));

  for (const [sessionId, langSet] of Object.entries(bySession)) {
    const sess = (await ddb.send(new GetCommand({ TableName: T('StudioSession'), Key: { id: sessionId } }))).Item;
    if (!sess?.tourId) {
      console.log(`skip ${sessionId} — no tourId`);
      continue;
    }
    const baseLang = sess.language ?? 'fr';
    const scenes = allScenes.filter(s => s.sessionId === sessionId && !s.archived);

    const translatedAudioKeys = {};
    for (const lang of langSet) {
      if (lang === baseLang) continue;
      const map = {};
      for (const sc of scenes) {
        const seg = allSegments.find(
          s => s.sceneId === sc.id && s.language === lang && isRealAudio(s.audioKey),
        );
        if (seg) map[sc.id] = seg.audioKey;
      }
      if (Object.keys(map).length > 0) translatedAudioKeys[lang] = map;
    }

    const availableLanguages = [baseLang, ...[...langSet].filter(l => l !== baseLang)];

    // Per-language audio source for the honesty disclosure (mirrors the web's
    // getLanguageAudioTypes): base from the studio/original key heuristic,
    // translated langs from each SceneSegment's audioSource.
    const languageAudioTypes = {};
    const baseSources = new Set();
    for (const sc of scenes) {
      // Prefer the reliable StudioScene.baseAudioSource marker; fall back to the
      // ambiguous filename heuristic only for legacy scenes that lack it.
      if (sc.baseAudioSource === 'tts' || sc.baseAudioSource === 'recording') {
        baseSources.add(sc.baseAudioSource);
      } else {
        const k = (sc.studioAudioKey ?? sc.originalAudioKey ?? '');
        if (k) baseSources.add(k.includes('tts') ? 'tts' : 'recording');
      }
    }
    languageAudioTypes[baseLang] = baseSources.size === 1 ? [...baseSources][0] : (baseSources.size ? 'mixed' : 'recording');
    for (const lang of langSet) {
      if (lang === baseLang) continue;
      const srcs = new Set();
      for (const sc of scenes) {
        const seg = allSegments.find(s => s.sceneId === sc.id && s.language === lang && isRealAudio(s.audioKey));
        if (seg) srcs.add((seg.audioSource ?? (seg.ttsGenerated ? 'tts' : 'recording')));
      }
      if (srcs.size > 0) languageAudioTypes[lang] = srcs.size === 1 ? [...srcs][0] : 'mixed';
    }

    await ddb.send(new UpdateCommand({
      TableName: T('GuideTour'),
      Key: { id: sess.tourId },
      UpdateExpression: 'SET availableLanguages = :l, translatedAudioKeys = :t, languageAudioTypes = :a',
      ExpressionAttributeValues: { ':l': availableLanguages, ':t': translatedAudioKeys, ':a': languageAudioTypes },
    }));

    console.log(
      `backfilled tour ${sess.tourId}: langs=[${availableLanguages.join(',')}] ` +
      `translatedAudio=${Object.entries(translatedAudioKeys).map(([l, m]) => `${l}:${Object.keys(m).length}`).join(' ') || 'none'} ` +
      `audioTypes=${JSON.stringify(languageAudioTypes)}`,
    );
  }
  console.log('Done.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
