/**
 * retrad-2-purge-audio.mjs — invalide l'audio TTS issu de la traduction MarianMT.
 *
 * Ce que le script fait, dans cet ordre :
 *   1. sauvegarde JSON des SceneSegment et des champs multilingues des GuideTour ;
 *   2. GARDE : vérifie qu'aucune clé à supprimer n'est une clé audio de base
 *      (StudioScene.studioAudioKey / originalAudioKey). Toute collision annule tout ;
 *   3. copie chaque objet sous archive-tts-marianmt/<clé> puis supprime l'original ;
 *   4. efface audioKey/audioSource des SceneSegment non-fr (le TEXTE est conservé) ;
 *   5. remet GuideTour.availableLanguages à ['fr'] et vide translatedAudioKeys.
 *
 * Le français — StudioScene.transcriptText et studioAudioKey — n'est jamais touché.
 *
 *   node scripts/retrad-2-purge-audio.mjs            # simulation (défaut)
 *   node scripts/retrad-2-purge-audio.mjs --apply    # exécution
 */

import fs from 'node:fs';
import path from 'node:path';
import { S3Client, CopyObjectCommand, DeleteObjectsCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  doc, table, scanAll, asMap, ensureDirs, banner, hasFlag,
  REGION, BASE_LANG, ARCHIVE_PREFIX, BACKUP_DIR, resolveBackend,
} from './retrad-lib.mjs';

const APPLY = hasFlag('apply');
const CONCURRENCY = 16;

banner(`retrad-2 — purge de l'audio traduit  [${APPLY ? 'EXÉCUTION' : 'SIMULATION'}]`);
ensureDirs();

const { bucket } = resolveBackend();
const s3 = new S3Client({ region: REGION });

// ── 1. Lecture + sauvegarde ────────────────────────────────────────────────
const [tours, scenes, segments] = await Promise.all([
  scanAll('GuideTour'), scanAll('StudioScene'), scanAll('SceneSegment'),
]);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupSeg = path.join(BACKUP_DIR, `scene-segments-${stamp}.json`);
const backupTour = path.join(BACKUP_DIR, `guide-tours-ml-${stamp}.json`);
fs.writeFileSync(backupSeg, JSON.stringify(segments, null, 2), 'utf8');
fs.writeFileSync(backupTour, JSON.stringify(
  tours.map((t) => ({
    id: t.id, status: t.status, availableLanguages: t.availableLanguages,
    translatedAudioKeys: asMap(t.translatedAudioKeys),
    languageAudioTypes: asMap(t.languageAudioTypes),
    translatedDescriptions: asMap(t.translatedDescriptions),
  })), null, 2), 'utf8');
console.log(`  sauvegarde : ${path.basename(backupSeg)} (${segments.length} segments)`);
console.log(`  sauvegarde : ${path.basename(backupTour)} (${tours.length} visites)\n`);

// ── 2. Clés à supprimer + garde anti-collision ─────────────────────────────
const baseKeys = new Set(
  scenes.flatMap((s) => [s.studioAudioKey, s.originalAudioKey]).filter(Boolean),
);

const targets = new Set();
const translatedSegments = segments.filter((s) => (s.language ?? BASE_LANG) !== BASE_LANG);
for (const s of translatedSegments) if (s.audioKey) targets.add(s.audioKey);
for (const t of tours) {
  for (const [lang, map] of Object.entries(asMap(t.translatedAudioKeys))) {
    if (lang === BASE_LANG) continue;
    for (const key of Object.values(map ?? {})) if (key) targets.add(key);
  }
}

const collisions = [...targets].filter((k) => baseKeys.has(k));
if (collisions.length > 0) {
  console.error(`\n  ✖ ARRÊT : ${collisions.length} clé(s) à supprimer sont aussi de l'audio de base.`);
  console.error(collisions.slice(0, 10).join('\n'));
  process.exit(1);
}
console.log(`  clés audio de base protégées : ${baseKeys.size}`);
console.log(`  objets S3 à archiver puis supprimer : ${targets.size}  (collision avec la base : 0)`);
console.log(`  segments traduits concernés : ${translatedSegments.length}\n`);

if (!APPLY) {
  console.log('  SIMULATION — rien n\'a été modifié. Relancer avec --apply.');
  console.log(`  exemples :\n    ${[...targets].slice(0, 3).join('\n    ')}`);
  process.exit(0);
}

// ── 3. Archivage puis suppression S3 ───────────────────────────────────────
const keys = [...targets];
let copied = 0, missing = 0, failed = 0;
const deletable = [];

async function archiveOne(key) {
  try {
    await s3.send(new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${encodeURIComponent(key).replace(/%2F/g, '/')}`,
      Key: ARCHIVE_PREFIX + key,
    }));
    copied++; deletable.push(key);
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      missing++; deletable.push(key); // déjà absent : rien à archiver, rien à perdre
    } else {
      failed++;
      console.warn(`    ! copie impossible ${key} : ${err?.name ?? err}`);
    }
  }
}

console.log(`  archivage sous ${ARCHIVE_PREFIX} …`);
for (let i = 0; i < keys.length; i += CONCURRENCY) {
  await Promise.all(keys.slice(i, i + CONCURRENCY).map(archiveOne));
  if ((i / CONCURRENCY) % 10 === 0) process.stdout.write(`\r    ${copied + missing}/${keys.length}`);
}
console.log(`\r    archivés : ${copied} | déjà absents : ${missing} | échecs : ${failed}          `);

if (failed > 0) {
  console.error('\n  ✖ ARRÊT avant suppression : des copies ont échoué. Rien n\'est supprimé.');
  process.exit(1);
}

let deleted = 0;
for (let i = 0; i < deletable.length; i += 1000) {
  const batch = deletable.slice(i, i + 1000);
  const res = await s3.send(new DeleteObjectsCommand({
    Bucket: bucket, Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
  }));
  deleted += batch.length - (res.Errors?.length ?? 0);
  for (const e of res.Errors ?? []) console.warn(`    ! suppression ${e.Key} : ${e.Message}`);
}
console.log(`    supprimés : ${deleted}\n`);

// ── 4. SceneSegment : on efface l'audio, on garde le texte ─────────────────
let segUpdated = 0;
for (const s of translatedSegments) {
  await doc.send(new UpdateCommand({
    TableName: table('SceneSegment'),
    Key: { id: s.id },
    UpdateExpression: 'REMOVE audioKey, audioSource SET ttsGenerated = :f, #st = :st, updatedAt = :now',
    ExpressionAttributeNames: { '#st': 'status' },
    ExpressionAttributeValues: { ':f': false, ':st': 'translated', ':now': new Date().toISOString() },
  }));
  segUpdated++;
  if (segUpdated % 200 === 0) process.stdout.write(`\r  SceneSegment mis à jour : ${segUpdated}`);
}
console.log(`\r  SceneSegment mis à jour : ${segUpdated} (texte conservé, audio effacé)`);

// ── 5. GuideTour : plus aucune langue d'écoute annoncée hors français ──────
let tourUpdated = 0;
for (const t of tours) {
  const hadKeys = Object.keys(asMap(t.translatedAudioKeys)).length > 0;
  const hadLangs = (t.availableLanguages ?? []).some((l) => l !== BASE_LANG);
  if (!hadKeys && !hadLangs) continue;
  const audioTypes = asMap(t.languageAudioTypes);
  await doc.send(new UpdateCommand({
    TableName: table('GuideTour'),
    Key: { id: t.id },
    UpdateExpression: 'REMOVE translatedAudioKeys SET availableLanguages = :l, languageAudioTypes = :a, updatedAt = :now',
    ExpressionAttributeValues: {
      ':l': [BASE_LANG],
      // Sans preuve de source, la mention vaut tts (règle unique du SPEC).
      ':a': { [BASE_LANG]: audioTypes[BASE_LANG] ?? 'tts' },
      ':now': new Date().toISOString(),
    },
  }));
  tourUpdated++;
}
console.log(`  GuideTour mis à jour    : ${tourUpdated} (availableLanguages → ['fr'])`);
console.log(`\n  Terminé. Le texte FR et l'audio FR sont intacts.`);
