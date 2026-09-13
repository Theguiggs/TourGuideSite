import { tourMetadata, tourSeoDescription, tourSeoTitle } from '../tour-metadata';
import { SITE_LOCALES } from '@/lib/i18n/locales';
import { publicUrl } from '@/lib/seo/urls';

const tour = { title: 'Vieux Nice', city: 'Nice', shortDescription: 'Ruelles', description: 'Long' };
/** Visite publiée FR (source) + EN traduit et narré. */
const bilingue = {
  ...tour,
  sourceLanguage: 'fr',
  availableLanguages: ['fr', 'en'],
  translatedTitles: { en: 'Old Nice' },
  translatedDescriptions: { en: 'Alleys' },
};

describe('tourMetadata', () => {
  it('keeps source-language metadata aligned with rendered source text', () => {
    const source = { ...tour, sourceLanguage: 'de-DE', translatedTitles: { de: 'Stale translation' }, translatedDescriptions: { de: 'Stale description' } };
    expect(tourMetadata(source, 'nice', 'vieux-nice', 'de').title).toBe('Vieux Nice — Audiotour in Nice');
  });

  it('part du texte traduit que la fiche affiche, pas d’une autre source', () => {
    const description = 'Beschreibung der Altstadt von Nizza. '.repeat(10);
    const meta = tourMetadata({ ...tour, sourceLanguage: 'fr', availableLanguages: ['fr', 'de'], translatedTitles: { de: 'Altstadt' }, translatedDescriptions: { de: description } }, 'nice', 'vieux-nice', 'de');
    expect(meta.title).toBe('Altstadt — Audiotour in Nice');
    expect(description.startsWith(String(meta.description).replace('…', ''))).toBe(true);
  });

  it('donne à la fiche EN la même parure OG/Twitter que la FR, en anglais', () => {
    const en = tourMetadata(bilingue, 'nice', 'vieux-nice', 'en');
    expect(en.alternates?.canonical).toBe(publicUrl('/catalogue/nice/vieux-nice', 'en'));
    expect(en.title).toBe('Old Nice — audio tour in Nice');
    expect(en.openGraph).toMatchObject({
      title: 'Old Nice — audio tour in Nice',
      type: 'article',
      locale: 'en_GB',
      url: en.alternates?.canonical,
      images: [{ url: '/og/tour/nice/vieux-nice?locale=en', alt: 'Old Nice — audio tour in Nice' }],
    });
    expect(en.twitter).toMatchObject({ card: 'summary_large_image', title: 'Old Nice — audio tour in Nice', images: en.openGraph?.images });
  });

  it('la FR garde sa locale et son alt', () => {
    const fr = tourMetadata(tour, 'nice', 'vieux-nice', 'fr');
    expect(fr.alternates?.canonical).toBe(publicUrl('/catalogue/nice/vieux-nice', 'fr'));
    expect(fr.openGraph).toMatchObject({ locale: 'fr_FR', images: [{ alt: 'Vieux Nice — visite audio à Nice' }] });
  });

  it('retombe sur une accroche par langue quand la visite n’en a pas', () => {
    const bare = { title: 'X', city: 'Nice', shortDescription: '', description: '', duration: 45 };
    expect(tourMetadata(bare, 'nice', 'x', 'en').description).toContain('An immersive audio walking tour.');
    expect(tourMetadata(bare, 'nice', 'x', 'fr').description).toContain('Une visite à découvrir.');
  });
});

describe('titre et description de recherche (SEO-4)', () => {
  it('nomme la visite et sa ville dans chaque langue', () => {
    for (const locale of SITE_LOCALES) {
      const title = tourSeoTitle('Vieux Nice', 'Nice', locale);
      expect(title.startsWith('Vieux Nice — ')).toBe(true);
      expect(title).toContain('Nice');
    }
    expect(tourSeoTitle('Vieux Nice', 'Nice', 'fr')).toBe('Vieux Nice — visite audio à Nice');
    expect(tourSeoTitle('Vieux Nice', 'Nice', 'nl')).toBe('Vieux Nice — audiotour in Nice');
    // Un titre distinct par langue : la fiche ne sert pas six fois le même.
    expect(new Set(SITE_LOCALES.map(l => tourSeoTitle('Vieux Nice', 'Nice', l))).size).toBeGreaterThan(3);
  });

  it('vise 120 à 160 caractères, sans couper un mot en deux', () => {
    const long = { city: 'Nice', duration: 45, shortDescription: '', description:
      'Une promenade dans les ruelles baroques du Vieux-Nice, entre marchés, façades ocre et cours cachées, racontée par une guide qui y a grandi et connaît chaque porte cochère.' };
    for (const locale of SITE_LOCALES) {
      const description = tourSeoDescription(long, locale);
      expect(description.length).toBeLessThanOrEqual(160);
      expect(description.length).toBeGreaterThanOrEqual(120);
      expect(description).not.toMatch(/\s…$/);
    }
  });

  it('complète une description trop courte par un fait, jamais par du vide', () => {
    const court = { city: 'Nice', duration: 45, shortDescription: 'Ruelles baroques.', description: '' };
    for (const locale of SITE_LOCALES) {
      const description = tourSeoDescription(court, locale);
      expect(description.startsWith('Ruelles baroques.')).toBe(true);
      expect(description.length).toBeGreaterThan('Ruelles baroques.'.length);
      expect(description).toContain('Nice');
      expect(description).toContain('45');
      expect(description.length).toBeLessThanOrEqual(160);
    }
  });

  it('n’invente pas de durée quand la visite n’en déclare pas', () => {
    expect(tourSeoDescription({ city: 'Nice', duration: 0, shortDescription: 'Ruelles.', description: '' }, 'fr'))
      .toBe('Ruelles. Visite audio guidée à Nice, à écouter à votre rythme.');
  });

  it('garde une description déjà bien dimensionnée telle quelle', () => {
    const juste = 'Une promenade dans les ruelles baroques du Vieux-Nice, entre marchés colorés, façades ocre et cours cachées du vieux port.';
    expect(juste.length).toBeGreaterThanOrEqual(120);
    expect(tourSeoDescription({ city: 'Nice', duration: 45, shortDescription: '', description: juste }, 'fr')).toBe(juste);
  });
});

describe('variantes annoncées', () => {
  it('n’annonce que les langues réellement publiées, x-default compris', () => {
    const languages = tourMetadata(bilingue, 'nice', 'vieux-nice', 'fr').alternates?.languages ?? {};
    expect(Object.keys(languages).sort()).toEqual(['en', 'fr', 'x-default']);
    expect(languages['x-default']).toBe(publicUrl('/catalogue/nice/vieux-nice', 'fr'));
  });

  it('refuse l’index sur une langue sans contenu, sans créer de doublon annoncé', () => {
    const nl = tourMetadata(bilingue, 'nice', 'vieux-nice', 'nl');
    expect(nl.robots).toEqual({ index: false, follow: true });
    expect(nl.alternates?.languages).toBeUndefined();
    expect(nl.alternates?.canonical).toBe(publicUrl('/catalogue/nice/vieux-nice', 'nl'));
  });

  it('une traduction de métadonnées sans narration vendue ne suffit pas', () => {
    const metadataSeule = { ...bilingue, translatedTitles: { en: 'Old Nice', nl: 'Oud Nice' }, translatedDescriptions: { en: 'Alleys', nl: 'Steegjes' } };
    expect(Object.keys(tourMetadata(metadataSeule, 'nice', 'vieux-nice', 'fr').alternates?.languages ?? {}).sort())
      .toEqual(['en', 'fr', 'x-default']);
  });

  it('x-default retombe sur la première langue publiée quand le français ne l’est pas', () => {
    const anglophone = { ...tour, sourceLanguage: 'en', availableLanguages: ['en'] };
    const languages = tourMetadata(anglophone, 'london', 'soho', 'en').alternates?.languages ?? {};
    expect(Object.keys(languages).sort()).toEqual(['en', 'x-default']);
    expect(languages['x-default']).toBe(publicUrl('/catalogue/london/soho', 'en'));
  });
});
