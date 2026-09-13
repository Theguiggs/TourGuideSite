import { tourMetadata } from '../tour-metadata';

const tour = { title: 'Vieux Nice', city: 'Nice', shortDescription: 'Ruelles', description: 'Long' };

describe('tourMetadata', () => {
  it('keeps source-language metadata aligned with rendered source text', () => {
    const source = { ...tour, sourceLanguage: 'de-DE', translatedTitles: { de: 'Stale translation' }, translatedDescriptions: { de: 'Stale description' } };
    expect(tourMetadata(source, 'nice', 'vieux-nice', 'de')).toMatchObject({ title: tour.title, description: tour.shortDescription });
  });

  it('uses the same translated description projection as visible cards', () => {
    const description = 'Beschreibung '.repeat(20);
    expect(tourMetadata({ ...tour, sourceLanguage: 'fr', translatedTitles: { de: 'Altstadt' }, translatedDescriptions: { de: description } }, 'nice', 'vieux-nice', 'de'))
      .toMatchObject({ title: 'Altstadt', description: description.slice(0, 100) });
  });
  it('donne à la fiche EN la même parure OG/Twitter que la FR, en anglais', () => {
    const en = tourMetadata(tour, 'nice', 'vieux-nice', 'en');
    expect(en.alternates?.canonical).toBe('/en/catalogue/nice/vieux-nice');
    expect(en.openGraph).toMatchObject({
      title: 'Vieux Nice | Murmure',
      type: 'article',
      locale: 'en_US',
      images: [{ url: '/og/tour/nice/vieux-nice?locale=en', alt: 'Vieux Nice — audio tour in Nice' }],
    });
    expect(en.twitter).toMatchObject({ card: 'summary_large_image', title: 'Vieux Nice | Murmure' });
  });

  it('la FR garde sa locale et son alt', () => {
    const fr = tourMetadata(tour, 'nice', 'vieux-nice', 'fr');
    expect(fr.alternates?.canonical).toBe('/catalogue/nice/vieux-nice');
    expect(fr.openGraph).toMatchObject({ locale: 'fr_FR', images: [{ alt: 'Vieux Nice — visite audio à Nice' }] });
  });

  it('retombe sur une accroche par langue quand la visite n’en a pas', () => {
    const bare = { title: 'X', city: 'Nice', shortDescription: '', description: '' };
    expect(tourMetadata(bare, 'nice', 'x', 'en').description).toBe('An immersive audio walking tour.');
    expect(tourMetadata(bare, 'nice', 'x', 'fr').description).toBe('Une visite à découvrir.');
  });
});
