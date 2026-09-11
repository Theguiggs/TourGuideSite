/**
 * Garde SEO (lot 0.6) : le gabarit racine ajoute déjà « | Murmure » à chaque
 * titre. Un suffixe de marque écrit en dur dans une page rendait
 * « Aide — Murmure | Murmure » dans Google, avec quatre séparateurs différents
 * selon la page. Seules les pages d'accueil posent un titre absolu.
 */
import fs from 'node:fs';
import path from 'node:path';

const APP_DIR = path.join(process.cwd(), 'src', 'app');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      walk(full, out);
    } else if (/^(page|layout)\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Le titre de page vit au premier niveau de `metadata` (2 espaces) ou de
// l'objet rendu par `generateMetadata` (4 espaces). Les titres `openGraph` /
// `twitter`, plus profonds, ne reçoivent pas le gabarit : ils portent la
// marque eux-mêmes, et c'est voulu.
const HARDCODED_SUFFIX = /^ {2,4}title:\s*(?:['"`]|\{\s*absolute:\s*['"`])[^\n]*?\s[—\-·|]\s*Murmure['"`]/m;

describe('titres des pages', () => {
  const files = walk(APP_DIR);

  it('trouve des pages à examiner', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  it("n'écrit jamais le suffixe de marque en dur : le gabarit racine s'en charge", () => {
    const offenders = files
      .filter((f) => !/[\\/]src[\\/]app[\\/](en[\\/])?page\.tsx$/.test(f))
      .filter((f) => HARDCODED_SUFFIX.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(process.cwd(), f));
    expect(offenders).toEqual([]);
  });

  it('les pages d’accueil posent un titre absolu (la marque en tête, sans doublon)', () => {
    for (const f of ['page.tsx', path.join('en', 'page.tsx')]) {
      const src = fs.readFileSync(path.join(APP_DIR, f), 'utf8');
      expect(src).toMatch(/title:\s*\{\s*absolute:\s*['"]Murmure — /);
    }
  });

  it('le gabarit racine porte la marque une seule fois, avec accents', () => {
    const layout = fs.readFileSync(path.join(APP_DIR, 'layout.tsx'), 'utf8');
    expect(layout).toContain("template: '%s | Murmure'");
    expect(layout).toContain('Visites guidées audio immersives');
    expect(layout).not.toMatch(/Decouvrez|guidees|creees|passionnes|Telecharger/);
  });
});
