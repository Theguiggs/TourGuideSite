import { breadcrumbJsonLd, guideJsonLd, tourJsonLd } from '../json-ld';
import { SITE_URL } from '@/lib/site';

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
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 4.6, reviewCount: 12 });
    // Une clé S3 n'est pas une image publiable.
    expect(ld.image).toBeUndefined();
  });

  it('dérive le pays de la ville, et pointe la fiche EN sur /en', () => {
    const ld = tourJsonLd({ ...tour, city: 'Barcelone', citySlug: 'barcelone' }, 'en');
    expect(ld.url).toBe(`${SITE_URL}/en/catalogue/barcelone/la-promenade-des-anglais`);
    expect((ld.itinerary as { address: { addressCountry: string } }).address.addressCountry).toBe('ES');
  });

  it('une visite gratuite a une offre à 0, une visite sur abonnement seul n’en a pas', () => {
    expect((tourJsonLd({ ...tour, purchaseType: 'free' }, 'fr').offers as { price: string }).price).toBe('0.00');
    expect(tourJsonLd({ ...tour, purchaseType: 'subscription_only' }, 'fr').offers).toBeUndefined();
    expect(tourJsonLd({ ...tour, reviewCount: 0 }, 'fr').aggregateRating).toBeUndefined();
  });
});

describe('guideJsonLd / breadcrumbJsonLd', () => {
  it('ne rend que des URL absolues', () => {
    const ld = guideJsonLd(
      { displayName: 'Marie', bio: 'Bio', photoUrl: '/images/marie.jpg', city: 'Monaco', specialties: [], languages: ['fr'], slug: 'marie' },
      [{ title: 'Rocher', shortDescription: 'x', citySlug: 'monaco', slug: 'rocher' }],
    );
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
});
