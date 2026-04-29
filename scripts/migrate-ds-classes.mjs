#!/usr/bin/env node
/**
 * DS class migration codemod.
 *
 * Le preset DS (`@tourguide/design-system/tailwind`) REMPLACE la palette
 * Tailwind par défaut. Les classes `gray-*`, `red-*`, `teal-*`, etc. ne
 * génèrent aucun CSS — d'où la perte de lisibilité du studio.
 *
 * Ce script remappe vers les couleurs DS :
 *   gray  → ink + paper       (texte / fond)
 *   teal  → grenadine         (CTA principaux DS)
 *   red   → danger / grenadine-soft
 *   green → success / olive-soft
 *   amber → ocre / ocre-soft
 *   indigo / blue → mer
 *   yellow → ocre
 *
 * Usage:
 *   node scripts/migrate-ds-classes.mjs --dry-run     # affiche le diff
 *   node scripts/migrate-ds-classes.mjs               # applique
 *   node scripts/migrate-ds-classes.mjs --path=src/components/studio
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const pathArg = args.find((a) => a.startsWith('--path='));
const targets = pathArg
  ? [pathArg.replace('--path=', '')]
  : ['src/app/guide/studio', 'src/components/studio'];

/** Mapping order matters: longest/most-specific first. */
const REPLACEMENTS = [
  // ─────────── Grays — texte (du plus sombre au plus clair) ───────────
  [/\b(text|placeholder|caret|decoration)-gray-900\b/g, '$1-ink'],
  [/\b(text|placeholder|caret|decoration)-gray-800\b/g, '$1-ink'],
  [/\b(text|placeholder|caret|decoration)-gray-700\b/g, '$1-ink-80'],
  [/\b(text|placeholder|caret|decoration)-gray-600\b/g, '$1-ink-80'],
  [/\b(text|placeholder|caret|decoration)-gray-500\b/g, '$1-ink-60'],
  [/\b(text|placeholder|caret|decoration)-gray-400\b/g, '$1-ink-40'],
  [/\b(text|placeholder|caret|decoration)-gray-300\b/g, '$1-ink-20'],

  // ─────────── Grays — fonds ───────────
  [/\bbg-gray-900\b/g, 'bg-ink'],
  [/\bbg-gray-800\b/g, 'bg-ink'],
  [/\bbg-gray-700\b/g, 'bg-ink-80'],
  [/\bbg-gray-600\b/g, 'bg-ink-80'],
  [/\bbg-gray-500\b/g, 'bg-ink-60'],
  [/\bbg-gray-400\b/g, 'bg-ink-40'],
  [/\bbg-gray-300\b/g, 'bg-paper-deep'],
  [/\bbg-gray-200\b/g, 'bg-paper-deep'],
  [/\bbg-gray-100\b/g, 'bg-paper-soft'],
  [/\bbg-gray-50\b/g, 'bg-paper-soft'],

  // ─────────── Grays — bordures, divide, ring ───────────
  [/\b(border|divide|ring|outline)-gray-900\b/g, '$1-ink'],
  [/\b(border|divide|ring|outline)-gray-800\b/g, '$1-ink'],
  [/\b(border|divide|ring|outline)-gray-700\b/g, '$1-ink-80'],
  [/\b(border|divide|ring|outline)-gray-600\b/g, '$1-ink-80'],
  [/\b(border|divide|ring|outline)-gray-500\b/g, '$1-ink-60'],
  [/\b(border|divide|ring|outline)-gray-400\b/g, '$1-ink-40'],
  [/\b(border|divide|ring|outline)-gray-300\b/g, '$1-line'],
  [/\b(border|divide|ring|outline)-gray-200\b/g, '$1-line'],
  [/\b(border|divide|ring|outline)-gray-100\b/g, '$1-line'],

  // ─────────── Teals (CTA, accents primaires) → grenadine ───────────
  [/\b(text|placeholder|caret|decoration)-teal-(?:50|100|200|300|400|500|600|700|800|900)\b/g, '$1-grenadine'],
  [/\b(border|divide|ring|outline)-teal-(?:50|100|200|300)\b/g, '$1-grenadine-soft'],
  [/\b(border|divide|ring|outline)-teal-(?:400|500|600|700|800|900)\b/g, '$1-grenadine'],
  [/\bbg-teal-(?:50|100|200)\b/g, 'bg-grenadine-soft'],
  [/\bbg-teal-(?:300|400|500|600|700|800|900)\b/g, 'bg-grenadine'],

  // ─────────── Reds (erreurs, danger) → danger / grenadine-soft ───────────
  [/\b(text|placeholder|caret|decoration)-red-(?:400|500|600|700|800|900)\b/g, '$1-danger'],
  [/\b(text|placeholder|caret|decoration)-red-(?:50|100|200|300)\b/g, '$1-grenadine-soft'],
  [/\b(border|divide|ring|outline)-red-(?:50|100|200|300)\b/g, '$1-grenadine-soft'],
  [/\b(border|divide|ring|outline)-red-(?:400|500|600|700|800|900)\b/g, '$1-danger'],
  [/\bbg-red-(?:50|100|200)\b/g, 'bg-grenadine-soft'],
  [/\bbg-red-(?:300|400|500|600|700|800|900)\b/g, 'bg-danger'],

  // ─────────── Greens → success / olive-soft ───────────
  [/\b(text|placeholder|caret|decoration)-(?:green|emerald)-(?:400|500|600|700|800|900)\b/g, '$1-success'],
  [/\b(text|placeholder|caret|decoration)-(?:green|emerald)-(?:50|100|200|300)\b/g, '$1-olive'],
  [/\b(border|divide|ring|outline)-(?:green|emerald)-(?:50|100|200|300)\b/g, '$1-olive-soft'],
  [/\b(border|divide|ring|outline)-(?:green|emerald)-(?:400|500|600|700|800|900)\b/g, '$1-success'],
  [/\bbg-(?:green|emerald)-(?:50|100|200)\b/g, 'bg-olive-soft'],
  [/\bbg-(?:green|emerald)-(?:300|400|500|600|700|800|900)\b/g, 'bg-success'],

  // ─────────── Ambers / yellows / orange → ocre / ocre-soft ───────────
  [/\b(text|placeholder|caret|decoration)-(?:amber|yellow|orange)-(?:400|500|600|700|800|900)\b/g, '$1-ocre'],
  [/\b(text|placeholder|caret|decoration)-(?:amber|yellow|orange)-(?:50|100|200|300)\b/g, '$1-ocre'],
  [/\b(border|divide|ring|outline)-(?:amber|yellow|orange)-(?:50|100|200|300)\b/g, '$1-ocre-soft'],
  [/\b(border|divide|ring|outline)-(?:amber|yellow|orange)-(?:400|500|600|700|800|900)\b/g, '$1-ocre'],
  [/\bbg-(?:amber|yellow|orange)-(?:50|100|200)\b/g, 'bg-ocre-soft'],
  [/\bbg-(?:amber|yellow|orange)-(?:300|400|500|600|700|800|900)\b/g, 'bg-ocre'],

  // ─────────── Indigo / blue / sky / cyan → mer ───────────
  [/\b(text|placeholder|caret|decoration)-(?:indigo|blue|sky|cyan)-(?:400|500|600|700|800|900)\b/g, '$1-mer'],
  [/\b(text|placeholder|caret|decoration)-(?:indigo|blue|sky|cyan)-(?:50|100|200|300)\b/g, '$1-mer'],
  [/\b(border|divide|ring|outline)-(?:indigo|blue|sky|cyan)-(?:50|100|200|300)\b/g, '$1-mer-soft'],
  [/\b(border|divide|ring|outline)-(?:indigo|blue|sky|cyan)-(?:400|500|600|700|800|900)\b/g, '$1-mer'],
  [/\bbg-(?:indigo|blue|sky|cyan)-(?:50|100|200)\b/g, 'bg-mer-soft'],
  [/\bbg-(?:indigo|blue|sky|cyan)-(?:300|400|500|600|700|800|900)\b/g, 'bg-mer'],

  // ─────────── Purple → mer (pas de couleur DS dédiée) ───────────
  [/\b(text|placeholder|caret|decoration)-(?:purple|violet|fuchsia|pink|rose)-(?:400|500|600|700|800|900)\b/g, '$1-grenadine'],
  [/\b(text|placeholder|caret|decoration)-(?:purple|violet|fuchsia|pink|rose)-(?:50|100|200|300)\b/g, '$1-grenadine'],
  [/\b(border|divide|ring|outline)-(?:purple|violet|fuchsia|pink|rose)-(?:50|100|200|300)\b/g, '$1-grenadine-soft'],
  [/\b(border|divide|ring|outline)-(?:purple|violet|fuchsia|pink|rose)-(?:400|500|600|700|800|900)\b/g, '$1-grenadine'],
  [/\bbg-(?:purple|violet|fuchsia|pink|rose)-(?:50|100|200)\b/g, 'bg-grenadine-soft'],
  [/\bbg-(?:purple|violet|fuchsia|pink|rose)-(?:300|400|500|600|700|800|900)\b/g, 'bg-grenadine'],

  // ─────────── Slate / zinc / neutral / stone (alias gray) ───────────
  [/\b(text|placeholder|caret|decoration)-(?:slate|zinc|neutral|stone)-(?:700|800|900)\b/g, '$1-ink'],
  [/\b(text|placeholder|caret|decoration)-(?:slate|zinc|neutral|stone)-(?:500|600)\b/g, '$1-ink-60'],
  [/\b(text|placeholder|caret|decoration)-(?:slate|zinc|neutral|stone)-(?:300|400)\b/g, '$1-ink-40'],
  [/\b(border|divide|ring|outline)-(?:slate|zinc|neutral|stone)-(?:200|300)\b/g, '$1-line'],
  [/\bbg-(?:slate|zinc|neutral|stone)-(?:50|100)\b/g, 'bg-paper-soft'],
  [/\bbg-(?:slate|zinc|neutral|stone)-(?:200|300)\b/g, 'bg-paper-deep'],
];

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

let totalFiles = 0;
let touchedFiles = 0;
let totalReplacements = 0;
const sampleDiffs = [];

for (const target of targets) {
  const absTarget = path.resolve(PROJECT_ROOT, target);
  if (!fs.existsSync(absTarget)) {
    console.error(`Target not found: ${absTarget}`);
    continue;
  }
  const files = walk(absTarget);
  totalFiles += files.length;

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    let updated = original;
    let fileCount = 0;

    for (const [pattern, replacement] of REPLACEMENTS) {
      updated = updated.replace(pattern, (match, ...rest) => {
        fileCount += 1;
        return replacement.replace(/\$(\d)/g, (_, i) => rest[Number(i) - 1] ?? '');
      });
    }

    if (fileCount > 0) {
      touchedFiles += 1;
      totalReplacements += fileCount;

      const rel = path.relative(PROJECT_ROOT, file);

      if (isDryRun) {
        if (sampleDiffs.length < 3) {
          const beforeLines = original.split('\n');
          const afterLines = updated.split('\n');
          const diffs = [];
          for (let i = 0; i < beforeLines.length; i += 1) {
            if (beforeLines[i] !== afterLines[i]) {
              diffs.push(`  L${i + 1}:`);
              diffs.push(`    - ${beforeLines[i]}`);
              diffs.push(`    + ${afterLines[i]}`);
              if (diffs.length > 12) break;
            }
          }
          sampleDiffs.push(`\n[${rel}] ${fileCount} replacements\n${diffs.join('\n')}`);
        }
      } else {
        fs.writeFileSync(file, updated, 'utf8');
      }

      console.log(`${isDryRun ? '[dry] ' : '[ok]  '}${rel} — ${fileCount} replacements`);
    }
  }
}

console.log('\n────────────────────────────────────────');
console.log(`Files scanned:   ${totalFiles}`);
console.log(`Files touched:   ${touchedFiles}`);
console.log(`Replacements:    ${totalReplacements}`);
console.log(`Mode:            ${isDryRun ? 'DRY RUN' : 'APPLIED'}`);

if (isDryRun && sampleDiffs.length > 0) {
  console.log('\n─── Sample diffs ───');
  console.log(sampleDiffs.join('\n'));
}
