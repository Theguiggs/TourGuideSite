/**
 * retrad-next.mjs — imprime la source des N prochaines visites à traduire.
 *
 * Une visite est « faite » dès que raw/{tourId}.txt existe : la reprise après
 * interruption est automatique, il n'y a pas de registre à tenir.
 *
 *   node scripts/retrad-next.mjs 2      # les 2 prochaines
 *   node scripts/retrad-next.mjs --count
 */

import fs from 'node:fs';
import path from 'node:path';
import { SOURCE_DIR, TRANS_DIR } from './retrad-lib.mjs';

const RAW_DIR = path.join(TRANS_DIR, 'raw');
fs.mkdirSync(RAW_DIR, { recursive: true });

const index = JSON.parse(fs.readFileSync(path.join(TRANS_DIR, 'index.json'), 'utf8'));
const done = new Set(
  fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.txt')).map((f) => f.replace(/\.txt$/, '')),
);
const pending = index.tours.filter((t) => !done.has(t.tourId));

if (process.argv.includes('--count')) {
  const doneChars = index.tours.filter((t) => done.has(t.tourId)).reduce((a, t) => a + t.chars, 0);
  const allChars = index.tours.reduce((a, t) => a + t.chars, 0);
  console.log(`faites ${done.size}/${index.tours.length} visites | ${doneChars.toLocaleString('fr-FR')} / ${allChars.toLocaleString('fr-FR')} car. (${Math.round((doneChars / allChars) * 100)} %)`);
  process.exit(0);
}

const n = Number(process.argv[2] ?? 1);
for (const t of pending.slice(0, n)) {
  const src = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, `${t.tourId}.json`), 'utf8'));
  console.log(`\n========== ${src.tourId}  (${src.city}, ${src.scenes.length} scènes, ${src.chars} car.) ==========`);
  console.log(`TITLE=${src.title}`);
  console.log(`DESC=${src.description}`);
  for (const sc of src.scenes) {
    console.log(`\n@@SCENE=${sc.sceneId}`);
    console.log(`@@STITLE=${sc.title}`);
    console.log(sc.text);
  }
}
console.log(`\n---------- restantes après ce lot : ${Math.max(0, pending.length - n)} ----------`);
