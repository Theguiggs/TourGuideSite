/**
 * Garde i18n du Studio.
 *
 * Le Studio se traduit par `useStudioLocale()` : `t('fr', 'en')` ou un objet
 * `copy` par langue. 46 fichiers sur 92 rendaient du français brut, et un
 * guide qui basculait en anglais gardait la moitié de l'interface en français.
 *
 * Deux règles, sur `src/app/guide/**` et `src/components/studio/**` :
 *  1. un fichier qui contient du français doit importer `useStudioLocale` ;
 *  2. aucun nœud texte JSX brut (`>Texte français<`) ne doit porter de
 *     marqueur français (accent, apostrophe typographique, guillemet),
 *     même écrit en échappement `\u00e9` ou en entité `&eacute;`.
 * `ALLOWED` est la dette restante : un fichier qui n'en a plus besoin doit en
 * sortir (le test l'exige aussi), pour que la liste ne fasse que fondre.
 */
import fs from 'fs';
import path from 'path';

const ROOTS = ['src/app/guide', 'src/components/studio'];
const FR = /[éèêàçùûôîâœÉÈÀÇ]|’|«|»/;
const JSX_TEXT = />\s*([^<>{}\n]*[A-Za-zÀ-ÿ][^<>{}\n]*)\s*</g;
const LITERAL = /(['"`])((?:(?!\1)[^\\\n]|\\.){3,}?)\1/g;

/** Un accent écrit `\u00e9` ou `&eacute;` reste un accent : on décode avant de juger. */
const ENTITIES: Record<string, string> = { eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', ccedil: 'ç', ugrave: 'ù', ocirc: 'ô', icirc: 'î', acirc: 'â', rsquo: '’', laquo: '«', raquo: '»' };
function decode(text: string): string {
  return text
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&([a-z]+);/g, (whole, name: string) => ENTITIES[name] ?? whole);
}

/** Dette restante (chemins depuis src/). Faire fondre, ne jamais grossir. */
const ALLOWED = new Set<string>([]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (entry.name !== '__tests__') out.push(...walk(full)); }
    else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx')) out.push(full);
  }
  return out;
}

export function studioI18nOffenders(): string[] {
  const offenders: string[] = [];
  for (const root of ROOTS) {
    for (const file of walk(path.join(process.cwd(), root))) {
      const src = fs.readFileSync(file, 'utf-8');
      const rel = path.relative(path.join(process.cwd(), 'src'), file).replace(/\\/g, '/');
      const usesLocale = src.includes('useStudioLocale');
      let frLiteral = false;
      for (const m of src.matchAll(LITERAL)) {
        const v = m[2];
        if (FR.test(decode(v)) && !v.startsWith('@/') && !v.startsWith('./') && !v.startsWith('../')) { frLiteral = true; break; }
      }
      const rawJsx = [...src.matchAll(JSX_TEXT)].some((m) => FR.test(decode(m[1])));
      if ((frLiteral && !usesLocale) || rawJsx) offenders.push(rel);
    }
  }
  return offenders.sort();
}

describe('i18n du Studio', () => {
  const offenders = studioI18nOffenders();

  it('ne laisse aucun nouveau fichier rendre du français hors de useStudioLocale', () => {
    expect(offenders.filter((f) => !ALLOWED.has(f))).toEqual([]);
  });

  it('fait fondre la dette : un fichier corrigé sort de la liste', () => {
    expect([...ALLOWED].filter((f) => !offenders.includes(f))).toEqual([]);
  });
});
