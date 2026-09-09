import fs from 'node:fs';
import path from 'node:path';

function sourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(absolute);
    return /\.[jt]sx?$/.test(entry.name) ? [absolute] : [];
  });
}

function violations(root: string, forbidden: RegExp[]): string[] {
  return sourceFiles(root).flatMap((file) => {
    const source = fs.readFileSync(file, 'utf8');
    return forbidden.some((pattern) => pattern.test(source))
      ? [path.relative(process.cwd(), file)]
      : [];
  });
}

describe('frontières de fabrication de narration', () => {
  const generationPatterns = [
    /@\/lib\/api\/tts/,
    /\brequestTTS\s*\(/,
    /\bgetTTSStatus\s*\(/,
    /TTSControls/,
    /LanguageAudioSection/,
    /batch-translation-service/,
    /\brequestTranslation\s*\(/,
    /\bgetTranslationStatus\s*\(/,
  ];

  it('interdit toute capacité de génération dans les pages Guide', () => {
    const guideRoot = path.join(process.cwd(), 'src', 'app', 'guide');
    expect(violations(guideRoot, [
      ...generationPatterns,
      /@\/lib\/api\/language-purchase/,
      /useLanguagePurchaseStore/,
      /LanguageSceneList/,
      /TourInfoTranslation/,
      /LanguageTabs/,
    ])).toEqual([]);
  });

  it('interdit toute capacité de génération dans les routes de modération Admin', () => {
    const moderationRoot = path.join(process.cwd(), 'src', 'app', 'admin', 'moderation');
    expect(violations(moderationRoot, generationPatterns)).toEqual([]);
  });
});
