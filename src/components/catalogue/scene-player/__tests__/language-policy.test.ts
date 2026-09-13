import { audioLanguageCode, audioVariants, languageInventory, availableAudioLanguages, chooseAudioLanguage, resolveSceneAudio, fallbackSceneCount } from '../language-policy';

const sources = audioVariants([
  { id: 's1', title: '', order: 0, description: '', photos: [], audioUrl: 'https://media/base-1', translatedAudioUrls: { en: 'https://media/en-1', de: 'https://media/de-1' } },
  { id: 's2', title: '', order: 1, description: '', photos: [], audioUrl: 'https://media/base-2', translatedAudioUrls: { ' EN_us ': 'https://media/en-us-2', es: '' } },
  { id: 'privee', title: '', order: 2, description: '', photos: [], translatedAudioUrls: { ja: 'https://media/ja-3' } },
]);
const inventory = languageInventory(sources);

describe('LW-3 — politique des langues', () => {
  it('propose la source et seulement les traductions servies des scènes de la liste', () => {
    expect(availableAudioLanguages(inventory, 'fr', ['s1', 's2'])).toEqual(['fr', 'de', 'en', 'en-us']);
    expect(JSON.stringify(inventory)).not.toContain('https://');
  });
  it.each([
    ['de', 'en', 'de'], ['ja', 'en', 'en'], [null, 'es', 'fr'], [null, 'de', 'de'],
  ])('préférence %s, locale %s → %s', (preferred, locale, expected) => {
    expect(chooseAudioLanguage(['fr', 'en', 'de'], 'fr', locale!, preferred)).toBe(expected);
  });
  it('accepte une variante de la locale sans confondre ses URLs', () => {
    expect(chooseAudioLanguage(['fr', 'en-us'], 'fr', 'en')).toBe('en-us');
    expect(resolveSceneAudio(sources, 's2', 'en-us', 'fr')).toEqual({ url: 'https://media/en-us-2', language: 'en-us' });
  });
  it('résout la traduction puis l’original, jamais une autre traduction', () => {
    expect(resolveSceneAudio(sources, 's1', 'en', 'fr')).toEqual({ url: 'https://media/en-1', language: 'en' });
    expect(resolveSceneAudio(sources, 's2', 'en', 'fr')).toEqual({ url: 'https://media/base-2', language: 'fr' });
    expect(resolveSceneAudio(sources, 'privee', 'en', 'fr')).toBeNull();
  });
  it('compte les replis possibles seulement et ne suppose pas une source française', () => {
    expect(fallbackSceneCount(inventory, ['s1', 's2', 'privee'], 'en', 'fr')).toBe(1);
    expect(fallbackSceneCount(inventory, ['s1', 's2'], 'fr', 'fr')).toBe(0);
    expect(availableAudioLanguages(null, 'und', ['s1'])).toEqual(['und']);
  });
  it.each(['', 'https://secret', '__proto__', null])('rejette le code invalide %s', (code) => {
    expect(audioLanguageCode(code)).toBeNull();
  });
});
