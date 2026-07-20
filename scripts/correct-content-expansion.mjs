import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ARTIFACTS = path.join(ROOT, 'artifacts', 'content-expansion');
const VALIDATION_PATH = path.join(ARTIFACTS, 'validation.json');
const BATCH_SIZE = 5;
const CONCURRENCY = 4;

const validation = JSON.parse(fs.readFileSync(VALIDATION_PATH, 'utf8'));
const failuresBySlug = new Map();
for (const failure of validation.failures) {
  if (!failure.scene) continue;
  const failures = failuresBySlug.get(failure.slug) ?? [];
  failures.push(failure);
  failuresBySlug.set(failure.slug, failures);
}

const entries = [...failuresBySlug.entries()];
const batches = [];
for (let index = 0; index < entries.length; index += BATCH_SIZE) {
  batches.push(entries.slice(index, index + BATCH_SIZE));
}

function promptFor(batch) {
  const instructions = batch.map(([slug, failures]) => {
    const scenes = failures.map((failure) => {
      const minimum = Math.ceil(failure.before * 1.45);
      const maximum = Math.floor(failure.before * 1.55);
      const target = Math.round(failure.before * 1.5);
      return `  - scene ${failure.scene}: ${failure.after} mots actuellement; cible ${target}, plage autorisee ${minimum}-${maximum}`;
    }).join('\n');
    return `- content/tours/${slug}/script-narration.md\n${scenes}`;
  }).join('\n');

  return `Tu corriges une passe editoriale deja realisee pour Murmure. Modifie UNIQUEMENT les scenes listees dans les fichiers suivants :
${instructions}

Le comptage inclut tout le contenu de la scene sauf la ligne GPS et le separateur Markdown. Ajuste chaque scene vers la cible indiquee et respecte strictement la plage autorisee. Pour une scene trop courte, ajoute une observation concrete, une transition orale ou une explication prudente fondee uniquement sur les faits deja presents. Pour une scene trop longue, resserre les formulations sans retirer de fait. N'invente aucune date, citation, personne, lieu ou anecdote. Conserve le tutoiement, les titres, les metadonnees, le GPS, l'ordre et le nombre de scenes. Ne modifie aucune scene absente de la liste et aucun autre fichier. Compte les mots apres modification avant de terminer.`;
}

function runBatch(batch, index) {
  return new Promise((resolve) => {
    const label = `correction-${String(index + 1).padStart(2, '0')}`;
    const log = fs.createWriteStream(path.join(ARTIFACTS, `${label}.log`), { flags: 'w' });
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
      resolve({ label, code: -1, error: error.message });
    });
    child.on('close', (code) => {
      log.end();
      resolve({ label, code: code ?? -1 });
    });
  });
}

console.log(JSON.stringify({ tours: entries.length, scenes: validation.failures.length, batches: batches.length }));
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < batches.length) {
    const index = cursor++;
    console.log(`START correction-${index + 1}`);
    const result = await runBatch(batches[index], index);
    results.push(result);
    console.log(`END ${result.label}: code=${result.code}`);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
fs.writeFileSync(path.join(ARTIFACTS, 'correction-summary.json'), JSON.stringify(results, null, 2));
const failed = results.filter((result) => result.code !== 0);
console.log(JSON.stringify({ completed: results.length, failed: failed.length }));
process.exitCode = failed.length ? 1 : 0;
