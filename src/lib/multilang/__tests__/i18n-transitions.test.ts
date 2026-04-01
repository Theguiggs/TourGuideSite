import {
  getTransitionMessage,
  isTransitionLangSupported,
  getSupportedTransitionLangs,
} from '../i18n-transitions';

describe('i18n-transitions', () => {
  describe('getTransitionMessage', () => {
    it('returns French transition message', () => {
      expect(getTransitionMessage('fr', 'Notre-Dame')).toBe(
        'Dirigez-vous vers Notre-Dame',
      );
    });

    it('returns English transition message', () => {
      expect(getTransitionMessage('en', 'Big Ben')).toBe(
        'Head towards Big Ben',
      );
    });

    it('returns Spanish transition message', () => {
      expect(getTransitionMessage('es', 'La Sagrada Familia')).toBe(
        'Diríjase hacia La Sagrada Familia',
      );
    });

    it('returns German transition message', () => {
      expect(getTransitionMessage('de', 'Brandenburger Tor')).toBe(
        'Gehen Sie Richtung Brandenburger Tor',
      );
    });

    it('returns Italian transition message', () => {
      expect(getTransitionMessage('it', 'Colosseo')).toBe(
        'Dirigetevi verso Colosseo',
      );
    });

    it('handles POI names with special characters', () => {
      expect(getTransitionMessage('fr', "L'Arc de Triomphe")).toBe(
        "Dirigez-vous vers L'Arc de Triomphe",
      );
      expect(getTransitionMessage('de', 'Münchhausen-Straße')).toBe(
        'Gehen Sie Richtung Münchhausen-Straße',
      );
      expect(getTransitionMessage('es', 'Plaza de España')).toBe(
        'Diríjase hacia Plaza de España',
      );
    });

    it('falls back to English for unsupported languages', () => {
      expect(getTransitionMessage('ja', 'Tokyo Tower')).toBe(
        'Head towards Tokyo Tower',
      );
      expect(getTransitionMessage('zh', '天安门')).toBe(
        'Head towards 天安门',
      );
    });
  });

  describe('isTransitionLangSupported', () => {
    it('returns true for supported languages', () => {
      expect(isTransitionLangSupported('fr')).toBe(true);
      expect(isTransitionLangSupported('en')).toBe(true);
      expect(isTransitionLangSupported('es')).toBe(true);
      expect(isTransitionLangSupported('de')).toBe(true);
      expect(isTransitionLangSupported('it')).toBe(true);
    });

    it('returns false for unsupported languages', () => {
      expect(isTransitionLangSupported('ja')).toBe(false);
      expect(isTransitionLangSupported('xyz')).toBe(false);
    });
  });

  describe('getSupportedTransitionLangs', () => {
    it('returns all 5 EU languages', () => {
      const langs = getSupportedTransitionLangs();
      expect(langs).toHaveLength(5);
      expect(langs).toContain('fr');
      expect(langs).toContain('en');
      expect(langs).toContain('es');
      expect(langs).toContain('de');
      expect(langs).toContain('it');
    });
  });
});
