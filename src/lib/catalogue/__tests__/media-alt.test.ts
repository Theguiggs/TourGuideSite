import { SITE_LOCALES } from '@/lib/i18n/locales';
import { stepImageAlt, tourCoverAlt } from '../media-alt';

describe('alternatives textuelles du catalogue', () => {
  it('décrit une couverture par la visite ET sa ville, dans chaque langue', () => {
    for (const locale of SITE_LOCALES) {
      const alt = tourCoverAlt('Vieux Nice', 'Nice', locale);
      expect(alt.startsWith('Vieux Nice — ')).toBe(true);
      expect(alt).toContain('Nice');
      expect(alt).not.toBe('Vieux Nice');
    }
    expect(tourCoverAlt('Vieux Nice', 'Nice', 'fr')).toBe('Vieux Nice — visite audio à Nice');
    expect(tourCoverAlt('Vieux Nice', 'Nice', 'de')).toBe('Vieux Nice — Audiotour in Nice');
  });

  it('situe une photo d’étape dans son parcours', () => {
    for (const locale of SITE_LOCALES) {
      const alt = stepImageAlt({ stepTitle: 'Place Rossetti', position: 3, tourTitle: 'Vieux Nice', city: 'Nice' }, locale);
      expect(alt).toContain('Place Rossetti');
      expect(alt).toContain('3');
      expect(alt).toContain('Vieux Nice');
      expect(alt).toContain('Nice');
    }
    expect(stepImageAlt({ stepTitle: 'Place Rossetti', position: 3, tourTitle: 'Vieux Nice', city: 'Nice' }, 'fr'))
      .toBe('Place Rossetti — étape 3 de la visite audio « Vieux Nice » à Nice');
  });

  it('ne révèle rien d’une étape verrouillée', () => {
    for (const locale of SITE_LOCALES) {
      expect(stepImageAlt({ stepTitle: 'Secret', position: 4, tourTitle: 'Vieux Nice', city: 'Nice', locked: true }, locale)).toBe('');
    }
  });

  it('retombe sur le titre seul quand la visite ou la ville manque', () => {
    expect(stepImageAlt({ stepTitle: 'Place Rossetti', position: 3 }, 'fr')).toBe('Place Rossetti');
    expect(stepImageAlt({ stepTitle: 'Place Rossetti', position: 3, tourTitle: 'Vieux Nice' }, 'fr')).toBe('Place Rossetti');
  });
});
