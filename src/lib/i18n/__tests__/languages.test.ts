import { LANGUAGES, LANG_FLAGS, LANG_NAMES, languageFlag, languageLabel, languageName } from '../languages';

describe('languages', () => {
  it('couvre toutes les langues vendues ou vendables, coréen et arabe compris', () => {
    for (const code of ['fr', 'en', 'es', 'de', 'it', 'nl', 'pt', 'ja', 'zh', 'ko', 'ar']) {
      expect(LANGUAGES[code]).toBeDefined();
      expect(LANG_FLAGS[code]).toBeTruthy();
      expect(LANG_NAMES[code]).toBeTruthy();
    }
  });

  it('rend l’endonyme au visiteur et le nom traduit à l’interface', () => {
    expect(languageName('de')).toBe('Deutsch');
    expect(languageLabel('de')).toBe('Allemand');
    expect(languageLabel('de', 'en')).toBe('German');
  });

  it('ne plante jamais sur une langue inconnue : code en majuscules, pas de drapeau', () => {
    expect(languageName('xx')).toBe('XX');
    expect(languageLabel(' XX ')).toBe(' XX ');
    expect(languageFlag('xx')).toBeNull();
    expect(languageFlag('FR')).toBe('🇫🇷');
  });
});
