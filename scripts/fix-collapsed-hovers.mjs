#!/usr/bin/env node
/**
 * Fix hover states collapsed by the DS migration.
 *
 * Le codemod précédent a remplacé `bg-teal-600 hover:bg-teal-700` par
 * `bg-grenadine hover:bg-grenadine` — hover sans effet visuel.
 * On remplace par `bg-grenadine hover:opacity-90` (Tailwind v4 ne supporte
 * pas `bg-grenadine/90` avec le preset legacy actuel).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const isDryRun = process.argv.includes('--dry-run');

const COLORS = ['grenadine', 'grenadine-soft', 'mer', 'mer-soft', 'ocre', 'ocre-soft', 'olive', 'olive-soft', 'success', 'danger', 'info', 'warning', 'ink', 'paper-deep', 'paper-soft'];

const REPLACEMENTS = [];
for (const color of COLORS) {
  // bg-X hover:bg-X → bg-X hover:opacity-90
  REPLACEMENTS.push([
    new RegExp(`\\bbg-${color}\\b(\\s+[^"'\`}]*?)?\\s+hover:bg-${color}\\b`, 'g'),
    `bg-${color}$1 hover:opacity-90`,
  ]);
  // text-X hover:text-X → text-X hover:opacity-80
  REPLACEMENTS.push([
    new RegExp(`\\btext-${color}\\b(\\s+[^"'\`}]*?)?\\s+hover:text-${color}\\b`, 'g'),
    `text-${color}$1 hover:opacity-80`,
  ]);
  // border-X hover:border-X → border-X hover:opacity-80
  REPLACEMENTS.push([
    new RegExp(`\\bborder-${color}\\b(\\s+[^"'\`}]*?)?\\s+hover:border-${color}\\b`, 'g'),
    `border-${color}$1 hover:opacity-80`,
  ]);
}

// Promote `transition-colors` → `transition` so opacity is also animated
REPLACEMENTS.push([/\btransition-colors\b/g, 'transition']);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next') continue;
      walk(full, acc);
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

let touchedFiles = 0;
let totalReplacements = 0;

for (const target of ['src/app/guide/studio', 'src/components/studio']) {
  const files = walk(path.resolve(PROJECT_ROOT, target));
  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    let updated = original;
    let fileCount = 0;
    for (const [pattern, replacement] of REPLACEMENTS) {
      updated = updated.replace(pattern, (match, ...rest) => {
        fileCount += 1;
        if (typeof replacement === 'string') {
          return replacement.replace(/\$(\d)/g, (_, i) => rest[Number(i) - 1] ?? '');
        }
        return replacement(match);
      });
    }
    if (fileCount > 0) {
      touchedFiles += 1;
      totalReplacements += fileCount;
      if (!isDryRun) fs.writeFileSync(file, updated, 'utf8');
      console.log(`${isDryRun ? '[dry] ' : '[ok]  '}${path.relative(PROJECT_ROOT, file)} — ${fileCount}`);
    }
  }
}

console.log(`\nTouched ${touchedFiles} files, ${totalReplacements} replacements (${isDryRun ? 'DRY' : 'APPLIED'})`);
