/**
 * retrad-parse.mjs — convertit les traductions rédigées en texte délimité
 * (content/translations/raw/{tourId}.txt) vers le JSON attendu par retrad-3.
 *
 * Le format brut évite tout échappement : les textes de narration contiennent
 * des guillemets, des apostrophes, des sauts de paragraphe et du balisage SSML
 * — les écrire directement en JSON est une source d'erreurs silencieuses sur
 * 4,7 millions de caractères.
 *
 * Format attendu, marqueurs en début de ligne :
 *
 *   @@LANG=en
 *   @@TITLE=Aix-en-Provence — Squares and Gates
 *   @@DESC=Urban history — reading Aix through its squares…
 *   @@SCENE=seed-100-aix-places-et-portes-scene-0
 *   @@STITLE=Fontaine du Roi René
 *   Stand near the fountain, where the cours Mirabeau begins…
 *
 *   Second paragraph, blank line preserved.
 *   @@SCENE=…
 *
 * Le corps d'une scène court jusqu'au marqueur suivant. Les lignes vides
 * internes deviennent des sauts de paragraphe.
 *
 *   node scripts/retrad-parse.mjs            # convertit tout le dossier raw/
 *   node scripts/retrad-parse.mjs --tour <id>
 */

import fs from 'node:fs';
import path from 'node:path';
import { LANGS, SOURCE_DIR, OUT_DIR, TRANS_DIR, ensureDirs } from './retrad-lib.mjs';

const RAW_DIR = path.join(TRANS_DIR, 'raw');
const onlyIdx = process.argv.indexOf('--tour');
const ONLY = onlyIdx >= 0 ? process.argv[onlyIdx + 1] : null;

ensureDirs();
fs.mkdirSync(RAW_DIR, { recursive: true });

/** Découpe un fichier brut en { lang: { title, description, scenes[] } }. */
export function parseRaw(text) {
  const lines = text.split(/\r?\n/);
  const langs = {};
  let lang = null;
  let scene = null;
  let body = [];

  const flushScene = () => {
    if (!scene) return;
    const content = body.join('\n').replace(/^\n+/, '').replace(/\n+$/, '');
    scene.text = content;
    langs[lang].scenes.push(scene);
    scene = null;
    body = [];
  };

  for (const line of lines) {
    const m = /^@@([A-Z]+)=([\s\S]*)$/.exec(line);
    if (!m) { if (scene) body.push(line); continue; }
    const [, key, value] = m;
    switch (key) {
      case 'LANG':
        flushScene();
        lang = value.trim();
        langs[lang] ??= { title: '', description: '', scenes: [] };
        break;
      case 'TITLE':
        flushScene();
        if (!lang) throw new Error('@@TITLE avant tout @@LANG');
        langs[lang].title = value.trim();
        break;
      case 'DESC':
        flushScene();
        if (!lang) throw new Error('@@DESC avant tout @@LANG');
        langs[lang].description = value.trim();
        break;
      case 'SCENE':
        flushScene();
        scene = { sceneId: value.trim(), title: '', text: '' };
        break;
      case 'STITLE':
        if (!scene) throw new Error(`@@STITLE hors scène : ${value}`);
        scene.title = value.trim();
        break;
      default:
        throw new Error(`marqueur inconnu @@${key}`);
    }
  }
  flushScene();
  return langs;
}

const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.txt')).sort();
let converted = 0;
let failed = 0;

for (const file of files) {
  const tourId = file.replace(/\.txt$/, '');
  if (ONLY && tourId !== ONLY) continue;

  let src;
  try {
    src = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, `${tourId}.json`), 'utf8'));
  } catch {
    console.log(`  x ${tourId} : source absente`);
    failed++;
    continue;
  }

  let langs;
  try {
    langs = parseRaw(fs.readFileSync(path.join(RAW_DIR, file), 'utf8'));
  } catch (e) {
    console.log(`  x ${tourId} : ${e.message}`);
    failed++;
    continue;
  }

  // Contrôles de forme avant écriture — retrad-3 revalide, mais autant échouer ici.
  const problems = [];
  const srcIds = src.scenes.map((s) => s.sceneId);
  const srcById = new Map(src.scenes.map((s) => [s.sceneId, s]));
  for (const lang of LANGS) {
    const b = langs[lang];
    if (!b) { problems.push(`${lang} absent`); continue; }
    if (!b.title) problems.push(`${lang} : titre vide`);
    if (!b.description) problems.push(`${lang} : description vide`);
    if (b.scenes.length !== srcIds.length) {
      problems.push(`${lang} : ${b.scenes.length} scènes pour ${srcIds.length}`);
    }
    for (const sc of b.scenes) {
      if (!srcById.has(sc.sceneId)) { problems.push(`${lang} : sceneId inconnu ${sc.sceneId}`); continue; }
      if (!sc.text) problems.push(`${lang}/${sc.sceneId} : texte vide`);
      if (!sc.title) problems.push(`${lang}/${sc.sceneId} : titre vide`);
      // Le balisage de pause doit être présent à l'identique (CAP-5).
      const want = (srcById.get(sc.sceneId).text.match(/<break[^>]*>/g) ?? []).sort();
      const got = (sc.text.match(/<break[^>]*>/g) ?? []).sort();
      if (want.join('|') !== got.join('|')) {
        problems.push(`${lang}/${sc.sceneId} : balisage de pause divergent (${got.length} pour ${want.length})`);
      }
    }
  }
  if (problems.length) {
    console.log(`  x ${tourId}`);
    for (const p of problems.slice(0, 8)) console.log(`      ${p}`);
    failed++;
    continue;
  }

  const out = { tourId };
  for (const lang of LANGS) out[lang] = langs[lang];
  fs.writeFileSync(path.join(OUT_DIR, `${tourId}.json`), JSON.stringify(out, null, 2), 'utf8');
  converted++;
}

console.log(`\n  convertis : ${converted}${failed ? ` | en échec : ${failed}` : ''}`);
if (failed) process.exit(1);
