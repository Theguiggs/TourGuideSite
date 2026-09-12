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
 *     marqueur français (accent, apostrophe typographique, guillemet).
 * `ALLOWED` est la dette restante : un fichier qui n'en a plus besoin doit en
 * sortir (le test l'exige aussi), pour que la liste ne fasse que fondre.
 */
import fs from 'fs';
import path from 'path';

const ROOTS = ['src/app/guide', 'src/components/studio'];
const FR = /[éèêàçùûôîâœÉÈÀÇ]|’|«|»/;
const JSX_TEXT = />\s*([^<>{}\n]*[A-Za-zÀ-ÿ][^<>{}\n]*)\s*</g;
const LITERAL = /(['"`])((?:(?!\1)[^\\\n]|\\.){3,}?)\1/g;

/** Dette restante (chemins depuis src/). Faire fondre, ne jamais grossir. */
const ALLOWED = new Set<string>([
  'app/guide/login/page.tsx',
  'app/guide/reset-password/page.tsx',
  'app/guide/signup/page.tsx',
  'app/guide/studio/[sessionId]/cleanup/components/POICleanupPanel.tsx',
  'app/guide/studio/[sessionId]/cleanup/components/PhotoLightbox.tsx',
  'app/guide/studio/[sessionId]/cleanup/components/WalkCleanupPanel.tsx',
  'app/guide/studio/[sessionId]/cleanup/components/WalkMap.tsx',
  'app/guide/studio/[sessionId]/layout.tsx',
  'app/guide/studio/[sessionId]/photos/page.tsx',
  'app/guide/studio/[sessionId]/preview/page.tsx',
  'app/guide/studio/[sessionId]/submission/page.tsx',
  'app/guide/studio/layout.tsx',
  'components/studio/advanced-editor/advanced-editor.tsx',
  'components/studio/audio-mixer/ambiance-picker.tsx',
  'components/studio/audio-mixer/ambiance-upload-modal.tsx',
  'components/studio/audio-mixer/audio-mixer.tsx',
  'components/studio/audio-player/audio-player-bar.tsx',
  'components/studio/dashboard/SuggestionCard.tsx',
  'components/studio/editable-map.tsx',
  'components/studio/feedback/ErrorBanner.tsx',
  'components/studio/feedback/Toast.tsx',
  'components/studio/language-audio-section/language-audio-section.tsx',
  'components/studio/language-moderation/language-moderation-badges.tsx',
  'components/studio/language-preview/language-preview-player.tsx',
  'components/studio/language-scene-list/language-scene-list.tsx',
  'components/studio/language-scene-list/scene-retry-card.tsx',
  'components/studio/preview-map.tsx',
  'components/studio/quality-feedback/quality-feedback.tsx',
  'components/studio/quota-display/quota-display.tsx',
  'components/studio/satisfaction-score/satisfaction-score.tsx',
  'components/studio/scene-list-item/scene-list-item.tsx',
  'components/studio/split-editor/split-editor.tsx',
  'components/studio/staleness-alert/manually-edited-modal.tsx',
  'components/studio/takes-list/takes-list.tsx',
  'components/studio/teleprompter/teleprompter.tsx',
  'components/studio/tour-comment-thread.tsx',
  'components/studio/translation-selector/translation-selector.tsx',
  'components/studio/tts-controls/tts-controls.tsx',
  'components/studio/wizard-general/SessionTerrainCard.tsx',
  'components/studio/wizard-general/ThemeChips.tsx',
  'components/studio/wizard/WizField.tsx',
]);

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
        if (FR.test(v) && !v.startsWith('@/') && !v.startsWith('./') && !v.startsWith('../')) { frLiteral = true; break; }
      }
      const rawJsx = [...src.matchAll(JSX_TEXT)].some((m) => FR.test(m[1]));
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
