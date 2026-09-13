import { breadcrumbJsonLd, guideJsonLd, siteJsonLd, tourJsonLd } from '../json-ld';
import { SITE_URL } from '@/lib/site';
import { publicUrl } from '@/lib/seo/urls';
import { SITE_LOCALES } from '@/lib/i18n/locales';

const tour = {
  title: 'La Promenade des Anglais',
  shortDescription: 'Le front de mer',
  description: 'Long texte',
  city: 'Nice',
  citySlug: 'nice',
  slug: 'la-promenade-des-anglais',
  duration: 45,
  priceCents: 499,
  purchaseType: 'paid' as const,
  availableLanguages: ['fr', 'en'],
  averageRating: 4.6,
  reviewCount: 12,
  imageUrl: 'guide-studio/x/cover.jpg',
};

describe('tourJsonLd', () => {
  it('décrit une visite payante avec son offre, son URL absolue et ses langues', () => {
    const ld = tourJsonLd(tour, 'fr');
    expect(ld['@type']).toBe('TouristTrip');
    expect(ld.url).toBe(`${SITE_URL}/catalogue/nice/la-promenade-des-anglais`);
    expect(ld.offers).toMatchObject({ price: '4.99', priceCurrency: 'EUR', url: ld.url });
    expect(ld.inLanguage).toEqual(['fr', 'en']);
    expect(ld.estimatedDuration).toBe('PT45M');
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.6, reviewCount: 12, bestRating: 5 });
    // Une clé S3 n'est pas une image publiable.
    expect(ld.image).toBeUndefined();
  });

  it('dérive le pays de la ville, et suit la langue de la page', () => {
    const ld = tourJsonLd({ ...tour, city: 'Barcelone', citySlug: 'barcelone' }, 'en');
    expect(ld.url).toBe(`${SITE_URL}/en/catalogue/barcelone/la-promenade-des-anglais`);
    expect((ld.itinerary as { address: { addressCountry: string } }).address.addressCountry).toBe('ES');
    for (const locale of SITE_LOCALES) {
      expect(tourJsonLd(tour, locale).url).toBe(publicUrl('/catalogue/nice/la-promenade-des-anglais', locale));
    }
  });

  it('une visite gratuite a une offre à 0, une visite sur abonnement seul n’en a pas', () => {
    expect((tourJsonLd({ ...tour, purchaseType: 'free' }, 'fr').offers as { price: string }).price).toBe('0.00');
    expect(tourJsonLd({ ...tour, purchaseType: 'subscription_only' }, 'fr').offers).toBeUndefined();
  });

  it('ne publie une note que si la page en affiche une', () => {
    expect(tourJsonLd({ ...tour, reviewCount: 0 }, 'fr').aggregateRating).toBeUndefined();
    expect(tourJsonLd({ ...tour, averageRating: 0 }, 'fr').aggregateRating).toBeUndefined();
  });

  it('ne garde qu’une image publique en HTTPS absolu', () => {
    expect(tourJsonLd({ ...tour, imageUrl: 'https://media.murmure-visit.com/cover.jpg' }, 'fr').image)
      .toBe('https://media.murmure-visit.com/cover.jpg');
    expect(tourJsonLd({ ...tour, imageUrl: 'http://media/cover.jpg' }, 'fr').image).toBeUndefined();
    expect(tourJsonLd({ ...tour, imageUrl: '/images/cover.jpg' }, 'fr').image).toBeUndefined();
  });

  describe('offre de lancement gratuite', () => {
    it('met le prix structuré à zéro, comme le badge visible', () => {
      const ld = tourJsonLd(tour, 'fr', { launchOfferActive: true, launchOfferEndsAt: '2026-12-31T23:00:00.000Z' });
      expect(ld.offers).toMatchObject({ price: '0.00', priceCurrency: 'EUR', priceValidUntil: '2026-12-31' });
    });

    it('ouvre aussi une visite réservée à l’abonnement, puisque la page l’ouvre', () => {
      const ld = tourJsonLd({ ...tour, purchaseType: 'subscription_only' }, 'fr', { launchOfferActive: true });
      expect(ld.offers).toMatchObject({ price: '0.00' });
    });

    it('laisse le prix catalogue quand l’offre est terminée', () => {
      expect((tourJsonLd(tour, 'fr', { launchOfferActive: false }).offers as { price: string }).price).toBe('4.99');
    });
  });
});

describe('guideJsonLd / breadcrumbJsonLd', () => {
  const guide = { displayName: 'Marie', bio: 'Bio', photoUrl: '/images/marie.jpg', city: 'Monaco', specialties: [], languages: ['fr'], slug: 'marie' };
  const tours = [{ title: 'Rocher', shortDescription: 'x', citySlug: 'monaco', slug: 'rocher' }];

  it('ne rend que des URL absolues', () => {
    const ld = guideJsonLd(guide, tours);
    expect(ld.url).toBe(`${SITE_URL}/guides/marie`);
    expect(ld.image).toBe(`${SITE_URL}/images/marie.jpg`);
    expect((ld.address as { addressCountry: string }).addressCountry).toBe('MC');
    expect((ld.makesOffer as Array<{ url: string }>)[0].url).toBe(`${SITE_URL}/catalogue/monaco/rocher`);

    const crumbs = breadcrumbJsonLd([{ name: 'Accueil', path: '/' }, { name: 'Catalogue', path: '/catalogue' }, { name: 'Marie' }]);
    const items = crumbs.itemListElement as Array<{ item?: string; position: number }>;
    expect(items[0].item).toBe(`${SITE_URL}/`);
    expect(items[1].item).toBe(`${SITE_URL}/catalogue`);
    expect(items[2].item).toBeUndefined();
    expect(items[2].position).toBe(3);
  });

  it('localise URL et intitulés du guide', () => {
    const de = guideJsonLd(guide, tours, 'de');
    expect(de.url).toBe(`${SITE_URL}/de/guides/marie`);
    expect((de.makesOffer as Array<{ url: string }>)[0].url).toBe(`${SITE_URL}/de/catalogue/monaco/rocher`);
    expect(guideJsonLd(guide, tours, 'en').jobTitle).toBe('Tour guide');
    expect(guideJsonLd(guide, tours, 'fr').jobTitle).toBe('Guide touristique');
    for (const locale of SITE_LOCALES) expect(typeof guideJsonLd(guide, tours, locale).jobTitle).toBe('string');
  });
});

describe('siteJsonLd', () => {
  it('présente l’éditeur et le site, dans la langue de la page', () => {
    for (const locale of SITE_LOCALES) {
      const [organization, website] = siteJsonLd(locale);
      expect(organization['@type']).toBe('Organization');
      expect(organization.url).toBe(SITE_URL);
      expect(website['@type']).toBe('WebSite');
      expect(website.url).toBe(publicUrl('/', locale));
      expect(website.publisher).toEqual({ '@id': `${SITE_URL}/#organization` });
      const action = website.potentialAction as { target: { urlTemplate: string } };
      expect(action.target.urlTemplate).toBe(`${publicUrl('/catalogue', locale)}?q={search_term_string}`);
    }
    expect(siteJsonLd('de')[1].inLanguage).toBe('de-DE');
  });
});
