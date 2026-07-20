import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SEED_SCRIPT = path.join(ROOT, 'scripts', 'seed-100-visites.mjs');
const LOG_DIR = path.join(ROOT, 'artifacts', 'content-expansion');
const EXCLUDED = new Set(['biarritz-table-basque', 'nice-matisse-chagall-collines']);
const COMPLETED = new Set([
  'nice-nissa-la-bella',
  'nice-cuisine-nissarde',
  'biarritz-berceau-du-surf',
  'biarritz-villas-et-architectes',
]);
const CONCURRENCY = 4;
const BATCH_SIZE = 5;

const source = fs.readFileSync(SEED_SCRIPT, 'utf8');
const slugBlock = source.match(/const SLUGS = \[([\s\S]*?)\n\];/)?.[1];
if (!slugBlock) throw new Error('Unable to parse SLUGS from seed script');
const allSlugs = [...slugBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]);
const slugs = allSlugs.filter((slug) => !EXCLUDED.has(slug) && !COMPLETED.has(slug));
const batches = [];
for (let index = 0; index < slugs.length; index += BATCH_SIZE) {
  batches.push(slugs.slice(index, index + BATCH_SIZE));
}

fs.mkdirSync(LOG_DIR, { recursive: true });

function promptFor(batch) {
  const files = batch.map((slug) => `- content/tours/${slug}/script-narration.md`).join('\n');
  return `Tu es éditeur senior des visites audio Murmure. Modifie UNIQUEMENT ces fichiers :
${files}

Pour chaque scène de chaque fichier, allonge le corps narratif de 45 à 55 % par rapport au nombre de mots actuel. Conserve exactement le format Markdown, les métadonnées, titres, ordre, GPS et tutoiement. Préserve tous les faits existants. N'invente aucune date, citation, personne, lieu ou anecdote historique. Enrichis seulement par l'observation précise de ce que le visiteur voit, l'explication de la portée des faits déjà présents, des détails sensoriels non factuels, une respiration orale naturelle et de meilleures transitions.

Contraintes : aucun remplissage, aucune répétition entre scènes, aucun SSML. Une scène ordinaire vise environ 280 à 340 mots ; une scène héros peut atteindre 400 mots. Mets à jour la ligne Durée narration proportionnellement si elle existe. Ne change jamais le nombre de scènes. Après les modifications, compte les mots scène par scène et corrige tout ratio hors 1,45 à 1,55. N'édite aucun autre fichier. Termine par un bilan très court.`;
}

function runBatch(batch, index) {
  return new Promise((resolve) => {
    const label = `batch-${String(index + 1).padStart(2, '0')}`;
    const logPath = path.join(LOG_DIR, `${label}.log`);
    const log = fs.createWriteStream(logPath, { flags: 'w' });
    const child = spawn('codex', [
      'exec',
      '--ephemeral',
      '--dangerously-bypass-hook-trust',
      '-s', 'workspace-write',
      '-C', ROOT,
      '-',
    ], { cwd: ROOT, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    child.stdin.end(promptFor(batch));
    child.on('error', (error) => {
      log.end(`\nSPAWN ERROR: ${error.message}\n`);
      resolve({ label, batch, code: -1, error: error.message });
    });
    child.on('close', (code) => {
      log.end();
      resolve({ label, batch, code: code ?? -1 });
    });
  });
}

console.log(JSON.stringify({ total: slugs.length, batches: batches.length, concurrency: CONCURRENCY }));
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < batches.length) {
    const index = cursor++;
    console.log(`START batch-${index + 1}: ${batches[index].join(', ')}`);
    const result = await runBatch(batches[index], index);
    results.push(result);
    console.log(`END ${result.label}: code=${result.code}`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
const failed = results.filter((result) => result.code !== 0);
fs.writeFileSync(path.join(LOG_DIR, 'summary.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ completed: results.length, failed: failed.length }));
process.exitCode = failed.length ? 1 : 0;
