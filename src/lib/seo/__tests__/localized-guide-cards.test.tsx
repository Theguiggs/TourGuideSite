import { render, screen } from '@testing-library/react';
import { METADATA_FALLBACK_COPY } from '@/lib/catalogue/localized-tour';

// Composant serveur asynchrone imbriqué : jsdom ne sait pas le rendre, et il
// n'est pas le sujet ici. Son comportement vit dans `preferred-locale.test.ts`
// et dans la passe SEO.
jest.mock('@/components/i18n/language-suggestion', () => ({ LanguageSuggestion: () => null }));
jest.mock('server-only', () => ({}), { virtual: true });
// `guideMetadata` lit le catalogue par la MÊME porte que le sitemap.
jest.mock('@/lib/api/tours-server', () => ({ getGuideTourSummaries: async () => [] }));
jest.mock('@/lib/api/guides-public-server', () => ({
  getGuideBySlug: async () => ({ id: 'guide', displayName: 'Marie', city: 'Nice', specialties: [], languages: [], totalListens: 0, parcoursSignature: 'Source title', slug: 'marie' }),
  getGuidePublicTours: async () => [{ id: 'tour', title: 'Source title', description: 'Source description', shortDescription: 'Source teaser', sourceLanguage: 'fr', city: 'Nice', citySlug: 'nice', slug: 'tour', translatedTitles: { de: 'Übersetzter Titel' }, translatedDescriptions: { de: 'Übersetzte Beschreibung' }, duration: 20, distance: 1, poiCount: 2 }],
}));
jest.mock('@/components/TrackPageView', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/studio/s3-image', () => ({ S3Image: () => null }));
jest.mock('@/components/catalogue/tour-price-badge', () => ({ TourPriceBadge: ({ locale }: { locale: string }) => <span data-testid="price-locale">{locale}</span> }));

import { LocalizedGuidePage } from '@/app/guides/[guideSlug]/page';

it('localizes signature and catalogue cards, preserving signature identity and both badge locales', async () => {
  render(await LocalizedGuidePage({ params: Promise.resolve({ guideSlug: 'marie' }), locale: 'de' }));
  expect(screen.getAllByText('Übersetzter Titel')).toHaveLength(2);
  expect(screen.getAllByText('Übersetzte Beschreibung')).toHaveLength(2);
  expect(screen.getAllByTestId('price-locale').map(node => node.textContent)).toEqual(['de', 'de']);
  expect(screen.queryByText(METADATA_FALLBACK_COPY.de)).not.toBeInTheDocument();
});

it('announces unavailable metadata translations on both guide card variants', async () => {
  render(await LocalizedGuidePage({ params: Promise.resolve({ guideSlug: 'marie' }), locale: 'nl' }));
  expect(screen.getAllByText('Source title')).toHaveLength(2);
  expect(screen.getAllByText(METADATA_FALLBACK_COPY.nl)).toHaveLength(2);
});
