/**
 * retrad-3-seed.mjs — injecte les traductions relues dans le backend.
 *
 * Lit content/translations/out/{tourId}.json (produit par la session de
 * traduction) et écrit :
 *   - SceneSegment  : transcriptText + translatedTitle, status 'translated',
 *                     SANS audioKey (l'audio sera fabriqué à la demande) ;
 *   - StudioSession : translatedTitles + translatedDescriptions ;
 *   - GuideTour     : translatedDescriptions (le champ que lit le catalogue).
 *
 * availableLanguages reste ['fr'] : aucune langue d'écoute n'est annoncée tant
 * qu'aucun audio n'existe pour elle.
 *
 * Idempotent : relancer n'écrit ni doublon ni seconde version. La validation
 * refuse tout fichier dont les sceneId ne recouvrent pas exactement la source.
 *
 *   node scripts/retrad-3-seed.mjs                    # valide tout, n'écrit rien
 *   node scripts/retrad-3-seed.mjs --apply            # écrit tout ce qui est prêt
 *   node scripts/retrad-3-seed.mjs --apply --tour <id>
 */

import fs from 'node:fs';
import path from 'node:path';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  doc, table, scanAll, asMap, banner, hasFlag,
  LANGS, SOURCE_DIR, OUT_DIR,
} from './retrad-lib.mjs';

const APPLY = hasFlag('apply');
const onlyIdx = process.argv.indexOf('--tour');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

banner(`retrad-3 — seed des traductions  [${APPLY ? 'ÉCRITURE' : 'VALIDATION'}]`);

const outFiles = fs.existsSync(OUT_DIR)
  ? fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.json')).sort()
  : [];
if (outFiles.length === 0) {
  console.log(`  Aucun fichier dans ${OUT_DIR}. Rien à faire.`);
  process.exit(0);
}

// ── Validation, fichier par fichier ────────────────────────────────────────
const ready = [];
const rejected = [];

for (const file of outFiles) {
  const tourId = file.replace(/\.json$/, '');
  if (ONLY && tourId !== ONLY) continue;
  const errors = [];
  let out;
  let src;
  try {
    out = JSON.parse(fs.readFileSync(path.join(OUT_DIR, file), 'utf8'));
  } catch (e) {
    rejected.push({ tourId, errors: [`JSON illisible : ${e.message}`] });
    continue;
  }
  try {
    src = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, `${tourId}.json`), 'utf8'));
  } catch {
    rejected.push({ tourId, errors: ['source absente — lancer retrad-1'] });
    continue;
  }

  const srcIds = src.scenes.map((s) => s.sceneId);
  for (const lang of LANGS) {
    const block = out[lang];
    if (!block) { errors.push(`${lang} : bloc absent`); continue; }
    if (!block.title || !block.title.trim()) errors.push(`${lang} : titre vide`);
    if (!block.description || !block.description.trim()) errors.push(`${lang} : description vide`);
    const scenes = block.scenes ?? [];
    if (scenes.length !== srcIds.length) {
      errors.push(`${lang} : ${scenes.length} scènes traduites pour ${srcIds.length} sources`);
      continue;
    }
    const gotIds = scenes.map((s) => s.sceneId);
    const missing = srcIds.filter((id) => !gotIds.includes(id));
    const extra = gotIds.filter((id) => !srcIds.includes(id));
    if (missing.length) errors.push(`${lang} : sceneId manquants ${missing.join(', ')}`);
    if (extra.length) errors.push(`${lang} : sceneId inconnus ${extra.join(', ')}`);
    for (const sc of scenes) {
      if (!sc.text || !sc.text.trim()) errors.push(`${lang}/${sc.sceneId} : texte vide`);
      if (!sc.title || !sc.title.trim()) errors.push(`${lang}/${sc.sceneId} : titre vide`);
      const source = src.scenes.find((s) => s.sceneId === sc.sceneId);
      // Garde de volume : une traduction deux fois plus courte ou trois fois
      // plus longue que la source signale une troncature ou un délire, pas une
      // langue verbeuse.
      if (source && sc.text) {
        const ratio = sc.text.length / Math.max(1, source.text.length);
        if (ratio < 0.5 || ratio > 3) {
          errors.push(`${lang}/${sc.sceneId} : longueur suspecte (${Math.round(ratio * 100)} % de la source)`);
        }
      }
    }
  }
  if (errors.length) rejected.push({ tourId, errors });
  else ready.push({ tourId, out, src });
}

console.log(`  fichiers valides : ${ready.length}`);
if (rejected.length) {
  console.log(`  fichiers refusés : ${rejected.length}`);
  for (const r of rejected) {
    console.log(`    x ${r.tourId}`);
    for (const e of r.errors.slice(0, 6)) console.log(`        ${e}`);
    if (r.errors.length > 6) console.log(`        … +${r.errors.length - 6}`);
  }
}
if (!APPLY) {
  console.log('\n  VALIDATION seule — rien écrit. Relancer avec --apply.');
  process.exit(rejected.length ? 1 : 0);
}
if (ready.length === 0) process.exit(1);

// ── Écriture ───────────────────────────────────────────────────────────────
const segments = await scanAll('SceneSegment');
const segById = new Map();
for (const s of segments) segById.set(`${s.sceneId}::${s.language}`, s);

const tours = await scanAll('GuideTour');
const tourById = new Map(tours.map((t) => [t.id, t]));
const sessions = await scanAll('StudioSession');
const sessionById = new Map(sessions.map((s) => [s.id, s]));

const now = new Date().toISOString();
let segWritten = 0;
let tourWritten = 0;
let sessWritten = 0;

for (const { tourId, out, src } of ready) {
  const titles = {};
  const descriptions = {};

  for (const lang of LANGS) {
    const block = out[lang];
    titles[lang] = block.title.trim();
    descriptions[lang] = block.description.trim();

    for (const sc of block.scenes) {
      const source = src.scenes.find((s) => s.sceneId === sc.sceneId);
      const existing = segById.get(`${sc.sceneId}::${lang}`);
      const id = existing?.id ?? `${sc.sceneId}-seg-${lang}`;
      await doc.send(new UpdateCommand({
        TableName: table('SceneSegment'),
        Key: { id },
        // REMOVE : si un audio traîne encore, il ne correspond plus au texte.
        // translationProvider est retiré : l'énumération du schéma ne connaît
        // que marianmt/deepl/openai — y laisser marianmt serait un mensonge.
        UpdateExpression:
          'SET #tn = :tn, sceneId = :sc, segmentIndex = :si, #lg = :lg, transcriptText = :tx, '
          + 'translatedTitle = :ti, #st = :st, ttsGenerated = :f, manuallyEdited = :f, '
          + 'sourceTextHash = :h, sourceUpdatedAt = :now, costProvider = :z, costCharged = :z, '
          + '#ow = if_not_exists(#ow, :ow), createdAt = if_not_exists(createdAt, :now), updatedAt = :now '
          + 'REMOVE audioKey, audioSource, translationProvider',
        ExpressionAttributeNames: {
          '#tn': '__typename', '#lg': 'language', '#st': 'status', '#ow': 'owner',
        },
        ExpressionAttributeValues: {
          ':tn': 'SceneSegment',
          ':sc': sc.sceneId,
          ':si': 0,
          ':lg': lang,
          ':tx': sc.text.trim(),
          ':ti': sc.title.trim(),
          ':st': 'translated',
          ':f': false,
          ':h': source.hash,
          ':now': now,
          ':z': 0,
          ':ow': existing?.owner ?? src.owner ?? null,
        },
      }));
      segWritten++;
    }
  }

  // StudioSession : titres + descriptions traduits (surface Studio / modération)
  const session = sessionById.get(src.sessionId);
  if (session) {
    await doc.send(new UpdateCommand({
      TableName: table('StudioSession'),
      Key: { id: src.sessionId },
      UpdateExpression: 'SET translatedTitles = :t, translatedDescriptions = :d, updatedAt = :now',
      ExpressionAttributeValues: {
        ':t': { ...asMap(session.translatedTitles), ...titles },
        ':d': { ...asMap(session.translatedDescriptions), ...descriptions },
        ':now': now,
      },
    }));
    sessWritten++;
  }

  // GuideTour : translatedDescriptions est le champ que lit le catalogue.
  // (GuideTour n'a pas de translatedTitles — champ absent du schéma, cf. story 3.)
  const tour = tourById.get(tourId);
  if (tour) {
    await doc.send(new UpdateCommand({
      TableName: table('GuideTour'),
      Key: { id: tourId },
      UpdateExpression: 'SET translatedDescriptions = :d, updatedAt = :now',
      ExpressionAttributeValues: {
        ':d': { ...asMap(tour.translatedDescriptions), ...descriptions },
        ':now': now,
      },
    }));
    tourWritten++;
  }
  console.log(`  ok ${tourId}`);
}

console.log(`\n  SceneSegment écrits : ${segWritten}`);
console.log(`  StudioSession mis à jour : ${sessWritten}`);
console.log(`  GuideTour mis à jour     : ${tourWritten}`);
console.log(`  availableLanguages inchangé (['fr']) — aucune langue d'écoute annoncée sans audio.`);
