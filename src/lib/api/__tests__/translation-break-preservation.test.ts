/**
 * Verifies that SSML <break/> tags survive auto-translation: they must be
 * stripped from what we send to MarianMT (markup is not translatable) and
 * re-inserted at their original positions in the result.
 */
jest.mock('@/config/api-mode', () => ({
  shouldUseStubs: () => false,
  shouldUseRealApi: () => true,
}));

jest.mock('@/lib/api/microservice-config', () => ({
  getMicroserviceUrl: () => '/api/microservice',
  getMicroserviceHeaders: () => ({ 'Content-Type': 'application/json' }),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { requestTranslation } from '../translation';

describe('break tag preservation (marianmt)', () => {
  let sentSentences: string[] = [];

  beforeEach(() => {
    sentSentences = [];
    global.fetch = jest.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse((init?.body as string) ?? '{}');
      sentSentences = body.texts;
      // Echo each sentence prefixed with [es] to simulate a translation.
      return {
        status: 200,
        json: async () => ({ ok: true, translations: body.texts.map((t: string) => `[es]${t}`) }),
      } as unknown as Response;
    }) as unknown as typeof fetch;
  });

  it('keeps <break/> tags out of the translation request', async () => {
    const src = 'Bonjour à tous.\n\n<break time="4s"/>\n\nBienvenue à Grasse.';
    await requestTranslation('seg-1', src, 'fr', 'es', 'standard');
    // The break tag must NOT be among the sentences sent to MarianMT.
    expect(sentSentences.join(' ')).not.toContain('<break');
    expect(sentSentences.some((s) => s.includes('Bonjour'))).toBe(true);
    expect(sentSentences.some((s) => s.includes('Bienvenue'))).toBe(true);
  });

  it('re-inserts the break tag in the translated output', async () => {
    const src = 'Bonjour à tous.\n\n<break time="4s"/>\n\nBienvenue à Grasse.';
    const result = await requestTranslation('seg-1', src, 'fr', 'es', 'standard');
    expect(result.status).toBe('completed');
    expect(result.translatedText).toContain('<break time="4s"/>');
    // Translated text present on both sides of the break.
    expect(result.translatedText).toContain('[es]Bonjour à tous.');
    expect(result.translatedText).toContain('[es]Bienvenue à Grasse.');
  });

  it('preserves multiple break tags in order', async () => {
    const src = 'A.\n\n<break time="2s"/>\n\nB.\n\n<break time="5s"/>\n\nC.';
    const result = await requestTranslation('seg-1', src, 'fr', 'es', 'standard');
    const text = result.translatedText ?? '';
    expect((text.match(/<break/g) ?? []).length).toBe(2);
    // Order preserved: 2s before 5s
    expect(text.indexOf('2s')).toBeLessThan(text.indexOf('5s'));
  });

  it('handles text with no break tags normally', async () => {
    const result = await requestTranslation('seg-1', 'Bonjour le monde.', 'fr', 'es', 'standard');
    expect(result.status).toBe('completed');
    expect(result.translatedText).toContain('[es]');
    expect(result.translatedText).not.toContain('<break');
  });
});
