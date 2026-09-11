/**
 * Aucun identifiant de pile MORTE ne doit survivre dans le code qui écrit.
 *
 * Deux bacs à sable abandonnés (`t5nxxao3…`, `4z7fvz7n…`) étaient codés en dur
 * dans 26 scripts, un repli serveur et un cron : les scripts « réussissaient »
 * en écrivant dans le vide, le cron rapportait « 0 supprimé » chaque nuit, et
 * un script de remise à zéro totale n'était qu'à une constante de la
 * production. La cible vient désormais de `scripts/_backend.mjs`, seul endroit
 * autorisé à connaître ces identifiants — pour les REFUSER.
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..');
const DEAD_IDS = ['t5nxxao3orh6za2bjj6uegulru', '4z7fvz7n2bh5rpixdgihjmhdpa'];
const SCANNED_DIRS = ['scripts', 'src', 'e2e', '.github', 'microservice'];
const ALLOWED_FILES = new Set([
  path.join('scripts', '_backend.mjs'),
  path.join('src', '__tests__', 'dead-backend-ids.test.ts'),
]);
const SKIP_DIRS = new Set(['node_modules', '__pycache__', '.venv', 'mesures', 'tts-ab']);
const TEXT_EXT = /\.(mjs|cjs|js|ts|tsx|py|ps1|yml|yaml|json|sh)$/;

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (TEXT_EXT.test(entry.name)) yield full;
  }
}

describe('dead backend identifiers', () => {
  it('appear nowhere except in the refusal list of scripts/_backend.mjs', () => {
    const offenders: string[] = [];
    for (const dir of SCANNED_DIRS) {
      const abs = path.join(ROOT, dir);
      if (!fs.existsSync(abs)) continue;
      for (const file of walk(abs)) {
        const rel = path.relative(ROOT, file);
        if (ALLOWED_FILES.has(rel)) continue;
        if (path.basename(rel).startsWith('_tmp-')) continue;
        const text = fs.readFileSync(file, 'utf8');
        for (const id of DEAD_IDS) {
          if (text.includes(id)) offenders.push(`${rel} → ${id}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
