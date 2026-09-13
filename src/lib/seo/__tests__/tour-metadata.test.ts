import { tourMetadata } from '../tour-metadata';
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
    expect(tourMetadata(source, 'nice', 'vieux-nice', 'de')).toMatchObject({ title: tour.title, description: tour.shortDescription });
  });

  it('uses the same translated description projection as visible cards', () => {
    const description = 'Beschreibung '.repeat(20);
    expect(tourMetadata({ ...tour, sourceLanguage: 'fr', availableLanguages: ['fr', 'de'], translatedTitles: { de: 'Altstadt' }, translatedDescriptions: { de: description } }, 'nice', 'vieux-nice', 'de'))
      .toMatchObject({ title: 'Altstadt', description: description.slice(0, 100) });
  });

  it('donne à la fiche EN la même parure OG/Twitter que la FR, en anglais', () => {
    const en = tourMetadata(bilingue, 'nice', 'vieux-nice', 'en');
    expect(en.alternates?.canonical).toBe(publicUrl('/catalogue/nice/vieux-nice', 'en'));
    expect(en.openGraph).toMatchObject({
      title: 'Old Nice | Murmure',
      type: 'article',
      locale: 'en_GB',
      url: en.alternates?.canonical,
      images: [{ url: '/og/tour/nice/vieux-nice?locale=en', alt: 'Old Nice — audio tour in Nice' }],
    });
    expect(en.twitter).toMatchObject({ card: 'summary_large_image', title: 'Old Nice | Murmure', images: en.openGraph?.images });
  });

  it('la FR garde sa locale et son alt', () => {
    const fr = tourMetadata(tour, 'nice', 'vieux-nice', 'fr');
    expect(fr.alternates?.canonical).toBe(publicUrl('/catalogue/nice/vieux-nice', 'fr'));
    expect(fr.openGraph).toMatchObject({ locale: 'fr_FR', images: [{ alt: 'Vieux Nice — visite audio à Nice' }] });
  });

  it('retombe sur une accroche par langue quand la visite n’en a pas', () => {
    const bare = { title: 'X', city: 'Nice', shortDescription: '', description: '' };
    expect(tourMetadata(bare, 'nice', 'x', 'en').description).toBe('An immersive audio walking tour.');
    expect(tourMetadata(bare, 'nice', 'x', 'fr').description).toBe('Une visite à découvrir.');
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
