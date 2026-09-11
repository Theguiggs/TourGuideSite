/**
 * Garde de contraste (lot 4). Les ratios sont calculés, pas supposés :
 * l'ocre `#C68B3E` fait 2,5:1 sur papier, `ink60` à 0,6 faisait 3,9:1.
 * Et deux motifs interdits dans les classes : fond ocre plein avec texte
 * clair, texte ocre nu sur surface claire.
 */
import fs from 'node:fs';
import path from 'node:path';
import { tgColors } from '@murmure/design-system';

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
function parse(color: string): [number, number, number, number] {
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = color.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!rgba) throw new Error(`couleur illisible : ${color}`);
  return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] === undefined ? 1 : Number(rgba[4])];
}
function composite(fg: string, bg: string): [number, number, number] {
  const [r, g, b, a] = parse(fg);
  const [br, bgc, bb] = parse(bg);
  return [r * a + br * (1 - a), g * a + bgc * (1 - a), b * a + bb * (1 - a)];
}
function luminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}
export function contrast(fg: string, bg: string): number {
  const l1 = luminance(composite(fg, bg));
  const l2 = luminance(composite(bg, bg));
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

describe('contraste des jetons', () => {
  it('le texte ocre sur papier atteint AA', () => {
    expect(contrast(tgColors.ocreInk, tgColors.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tgColors.ocreInk, tgColors.ocreSoft)).toBeGreaterThanOrEqual(4.5);
  });
  it('ink60 sur papier atteint AA ; ink40 reste décoratif', () => {
    expect(contrast(tgColors.ink60, tgColors.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tgColors.ink40, tgColors.paper)).toBeLessThan(4.5);
  });
  it('sur fond ocre, l’encre passe et le papier ne passe pas', () => {
    expect(contrast(tgColors.ink, tgColors.ocre)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tgColors.paper, tgColors.ocre)).toBeLessThan(3);
  });
});

const ROOTS = [path.join(process.cwd(), 'src', 'app'), path.join(process.cwd(), 'src', 'components')];
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') walk(full, out);
    } else if (entry.name.endsWith('.tsx')) out.push(full);
  }
  return out;
}
// Le prompteur est une surface sombre par construction (fond encre) :
// l'ocre y est lisible, l'encre n'y est pas.
const notDark = (file: string) => !file.endsWith('teleprompter.tsx');

function offenders(test: (line: string) => boolean, keep: (file: string) => boolean = () => true): string[] {
  const out: string[] = [];
  for (const file of ROOTS.flatMap((r) => walk(r)).filter(keep)) {
    fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
      if (test(line)) out.push(`${path.relative(process.cwd(), file)}:${i + 1}`);
    });
  }
  return out;
}

describe('classes de couleur', () => {
  it('jamais de texte clair sur fond ocre plein (dans la même liste de classes)', () => {
    expect(offenders((l) => /\bbg-ocre\b(?!-)[^'"`]*\btext-(white|paper)\b/.test(l), notDark)).toEqual([]);
  });
  it('jamais de texte ocre nu sur surface claire (ocre-ink à la place)', () => {
    expect(
      offenders(
        (l) => /\btext-ocre\b(?!-)/.test(l) && !/\bbg-ink\b|\bbg-ardoise\b/.test(l) && !/hover:text-ocre/.test(l),
        notDark,
      ),
    ).toEqual([]);
  });
  it('le focus global vient du jeton, pas d’une couleur étrangère', () => {
    const css = fs.readFileSync(path.join(process.cwd(), 'src', 'app', 'globals.css'), 'utf8');
    expect(css).toMatch(/:focus-visible\s*\{[^}]*var\(--tg-focus-ring, var\(--tg-color-ink\)\)/);
    expect(css).not.toContain('#0d9488');
  });
});
