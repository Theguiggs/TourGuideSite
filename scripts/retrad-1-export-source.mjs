/**
 * retrad-1-export-source.mjs — exporte le corpus source FR des visites publiées.
 *
 * Produit content/translations/source/{tourId}.json (un fichier par visite) et
 * un index.json de pilotage. Lecture seule : n'écrit rien dans AWS.
 *
 *   node scripts/retrad-1-export-source.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { scanAll, hashSourceText, asMap, ensureDirs, banner, SOURCE_DIR, TRANS_DIR, LANGS } from './retrad-lib.mjs';

banner('retrad-1 — export du corpus source FR');
ensureDirs();

const [tours, sessions, scenes, segments] = await Promise.all([
  scanAll('GuideTour'),
  scanAll('StudioSession'),
  scanAll('StudioScene'),
  scanAll('SceneSegment'),
]);

const published = tours.filter((t) => t.status === 'published');
const sessionById = new Map(sessions.map((s) => [s.id, s]));

const scenesBySession = new Map();
for (const sc of scenes) {
  if (sc.archived) continue;
  if (!scenesBySession.has(sc.sessionId)) scenesBySession.set(sc.sessionId, []);
  scenesBySession.get(sc.sessionId).push(sc);
}

const segmentsByScene = new Map();
for (const sg of segments) {
  if (!segmentsByScene.has(sg.sceneId)) segmentsByScene.set(sg.sceneId, []);
  segmentsByScene.get(sg.sceneId).push(sg);
}

const index = [];
let totalChars = 0;
let noScenes = 0;

for (const tour of published) {
  const session = sessionById.get(tour.sessionId);
  const list = (scenesBySession.get(tour.sessionId) || []).sort(
    (a, b) => (a.sceneIndex ?? 0) - (b.sceneIndex ?? 0),
  );
  if (list.length === 0) { noScenes++; continue; }

  const sceneEntries = list.map((sc) => ({
    sceneId: sc.id,
    index: sc.sceneIndex ?? 0,
    title: sc.title ?? '',
    text: sc.transcriptText ?? '',
    hash: hashSourceText(sc.transcriptText, sc.title),
    chars: (sc.transcriptText ?? '').length,
    // id des segments déjà en base, par langue — le seed met à jour en place
    existingSegments: Object.fromEntries(
      (segmentsByScene.get(sc.id) || []).map((sg) => [sg.language ?? '?', sg.id]),
    ),
  }));

  const chars = sceneEntries.reduce((a, s) => a + s.chars, 0);
  totalChars += chars;

  const payload = {
    tourId: tour.id,
    sessionId: tour.sessionId,
    guideId: tour.guideId,
    owner: tour.owner ?? session?.owner ?? null,
    city: tour.city,
    title: tour.title ?? '',
    description: tour.description ?? '',
    themes: session?.themes ?? [],
    baseLanguage: session?.language ?? 'fr',
    chars,
    targetLangs: LANGS,
    // Ce que la traduction machine actuelle a laissé — pour comparaison seulement.
    previousTranslatedDescriptions: asMap(tour.translatedDescriptions),
    scenes: sceneEntries,
  };

  fs.writeFileSync(path.join(SOURCE_DIR, `${tour.id}.json`), JSON.stringify(payload, null, 2), 'utf8');

  index.push({
    tourId: tour.id,
    city: tour.city,
    title: tour.title ?? '',
    scenes: sceneEntries.length,
    chars,
  });
}

index.sort((a, b) => a.city.localeCompare(b.city, 'fr'));
fs.writeFileSync(
  path.join(TRANS_DIR, 'index.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), langs: LANGS, tours: index }, null, 2),
  'utf8',
);

console.log(`  visites publiées      : ${published.length}`);
console.log(`  exportées             : ${index.length}${noScenes ? ` (${noScenes} sans scène, ignorées)` : ''}`);
console.log(`  caractères FR source  : ${totalChars.toLocaleString('fr-FR')}`);
console.log(`  à produire (${LANGS.length} langues) : ~${(totalChars * LANGS.length).toLocaleString('fr-FR')} caractères`);
console.log(`\n  → ${SOURCE_DIR}`);
