/**
 * Garde du design system (lot 5).
 *
 * Le preset Tailwind du DS REMPLACE les échelles par défaut : `text-sm`,
 * `text-xs`, `bg-gray-100`, `text-teal-700`… ne génèrent AUCUN CSS ici. Ces
 * classes n'étaient pas hors charte, elles étaient mortes : les éléments
 * héritaient d'une taille ou d'une couleur au hasard. Cette garde interdit
 * leur retour, ainsi que les couleurs inventées en hexadécimal hors des
 * quelques fichiers qui ne peuvent pas importer les jetons.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = [path.join(process.cwd(), 'src', 'app'), path.join(process.cwd(), 'src', 'components')];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') walk(full, out);
    } else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function offenders(test: (line: string, file: string) => boolean): string[] {
  const out: string[] = [];
  for (const file of ROOTS.flatMap((r) => walk(r))) {
    const rel = path.relative(process.cwd(), file).replace(/\\/g, '/');
    fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
      if (test(line, rel)) out.push(`${rel}:${i + 1}`);
    });
  }
  return out;
}

const FOREIGN_PALETTE =
  /\b(bg|text|border|ring|from|to|via|outline|divide|placeholder)-(teal|gray|slate|zinc|red|green|blue|yellow|amber|orange|purple|indigo|emerald|neutral|stone|sky|cyan|lime|pink|rose|violet|fuchsia)-[0-9]{2,3}\b/;
const DEAD_SCALE = /\b(text-sm|text-xs|text-\[1[01]px\]|bg-white)\b/;

// Fichiers qui ne peuvent pas importer les jetons (Edge, page d'erreur
// globale) : les valeurs y sont recopiées, commentées, et doivent rester
// celles des jetons. `#ffffff` sur les marqueurs de carte est un blanc pur voulu.
// `layout.tsx` : `viewport.themeColor` exige une chaîne littérale.
const HEX_ALLOWED = [/^src\/app\/og\//, /^src\/app\/opengraph-image\.tsx$/, /^src\/app\/global-error\.tsx$/, /^src\/app\/layout\.tsx$/];
const HEX = /#[0-9a-fA-F]{6}\b/;

describe('design system', () => {
  it('aucune couleur de la palette Tailwind par défaut (elle ne compile pas ici)', () => {
    expect(offenders((l) => FOREIGN_PALETTE.test(l))).toEqual([]);
  });

  it('aucune échelle morte : text-sm/xs, text-[10px], bg-white', () => {
    expect(offenders((l) => DEAD_SCALE.test(l))).toEqual([]);
  });

  it('aucune couleur hexadécimale inventée hors des fichiers qui ne peuvent pas importer les jetons', () => {
    expect(
      offenders((l, file) => {
        if (HEX_ALLOWED.some((rx) => rx.test(file))) return false;
        const hexes = l.match(new RegExp(HEX.source, 'g')) ?? [];
        return hexes.some((h) => h.toLowerCase() !== '#ffffff');
      }),
    ).toEqual([]);
  });

  it('les fichiers autorisés recopient des valeurs de jetons, pas des variantes', () => {
    const TOKENS = new Set(['#f4ecdd', '#efe4d0', '#e8dcc4', '#ffffff', '#102a43', '#2c3e50', '#c1262a', '#fbe5e2', '#c68b3e', '#f5e4c7', '#8a5c22', '#2b6e8a', '#d7e5ec', '#6b7a45', '#e2e5d2', '#4f7942']);
    expect(
      offenders((l, file) => {
        if (!HEX_ALLOWED.some((rx) => rx.test(file))) return false;
        const hexes = l.match(new RegExp(HEX.source, 'g')) ?? [];
        return hexes.some((h) => !TOKENS.has(h.toLowerCase()));
      }),
    ).toEqual([]);
  });
});
