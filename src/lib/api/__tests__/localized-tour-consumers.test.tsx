import { render, screen } from '@testing-library/react';

jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/config/api-mode', () => ({ shouldUseStubs: () => false }));
const mockPublishedRows: Record<string, unknown>[] = [];
const mockPurchaseRows: Record<string, unknown>[] = [];
let mockUnpublished: Record<string, unknown> | null = null;
const mockProfile = { id: 'guide', userId: 'user', displayName: 'Marie', city: 'Nice', specialties: [], languages: [], parcoursSignature: 'Source française' };

jest.mock('@/lib/api/appsync-client', () => ({
  listGuideTours: jest.fn(async () => mockPublishedRows),
  listGuideProfiles: jest.fn(async () => [mockProfile]),
  getGuideTourById: jest.fn(async () => mockUnpublished),
  getClient: () => ({ models: { TourPurchase: { list: async () => ({ data: mockPurchaseRows }) } } }),
}));
jest.mock('@/lib/api/appsync-server-public', () => ({
  listGuideToursServer: jest.fn(async () => mockPublishedRows),
  listGuideProfilesServer: jest.fn(async () => [mockProfile]),
  getGuideProfileByIdServer: jest.fn(async () => mockProfile),
}));
jest.mock('@/hooks/use-owned-tour-ids', () => ({ useOwnedTourIds: () => new Set() }));
jest.mock('@/components/studio/s3-image', () => ({ S3Image: () => null }));
jest.mock('@/components/TrackPageView', () => ({ __esModule: true, default: () => null }));

import { getMyPurchasesClient } from '../purchases-client';
import { getAllTours } from '../tours';
import { getGuidePublicTours } from '../guides-public-server';
import { PurchasedTourCard } from '@/components/catalogue/purchased-tour-card';
import { MyPurchasesStrip } from '@/components/catalogue/my-purchases-strip';
import { LocalizedGuidePage } from '@/app/guides/[guideSlug]/page';
import { METADATA_FALLBACK_COPY } from '@/lib/catalogue/localized-tour';

const italianSource = { id: 'italian', title: 'Storia italiana', description: 'Descrizione originale', sourceLanguage: ' IT-it ', city: 'Nice', guideId: 'guide', status: 'published', duration: 20, distance: 1, poiCount: 2, availableLanguages: ['it'],
  translatedTitles: JSON.stringify({ 'fr-FR': 'Histoire en français' }), translatedDescriptions: JSON.stringify({ fr: 'Description traduite en français' }) };

beforeEach(() => {
  mockPublishedRows.splice(0);
  mockPurchaseRows.splice(0);
  mockUnpublished = null;
});

it('uses the actual source audio language without inventing French and projects updated rows without stale cache', async () => {
  mockPublishedRows.push({ ...italianSource, language: 'fr', availableLanguages: [] });
  mockPurchaseRows.push({ tourId: 'italian', createdAt: '2026-09-13' });
  expect((await getMyPurchasesClient()).purchases[0].tour.availableLanguages).toEqual(['it']);
  mockPublishedRows[0] = { ...italianSource, availableLanguages: ['de-DE', 'it', 'nl'] };
  expect((await getMyPurchasesClient()).purchases[0].tour.availableLanguages).toEqual(['it', 'de', 'nl']);
  mockPublishedRows[0] = { ...italianSource, sourceLanguage: 'es-ES', availableLanguages: ['nl'] };
  expect((await getMyPurchasesClient()).purchases[0].tour.availableLanguages).toEqual(['es', 'nl']);
});

it('uses the legacy language field and finally French only when the source field is missing', async () => {
  mockPublishedRows.push({ ...italianSource, sourceLanguage: undefined, language: 'DE-de', availableLanguages: ['nl'] });
  expect((await getAllTours())[0].availableLanguages).toEqual(['de', 'nl']);
  mockPublishedRows[0] = { ...italianSource, sourceLanguage: undefined, language: undefined, availableLanguages: ['nl'] };
  expect((await getAllTours())[0].availableLanguages).toEqual(['fr', 'nl']);
});

it('preserves source language through the real published catalogue and purchase join, then renders French metadata', async () => {
  mockPublishedRows.push({ ...italianSource });
  mockPurchaseRows.push({ tourId: 'italian', createdAt: '2026-09-13', amountCents: 499 });
  const result = await getMyPurchasesClient();
  expect(result.purchases[0].tour).toMatchObject({ sourceLanguage: 'it', translatedTitles: { fr: 'Histoire en français' } });
  render(<><PurchasedTourCard purchase={result.purchases[0]} locale="fr" /><MyPurchasesStrip purchases={result.purchases} locale="fr" /></>);
  expect(screen.getAllByText('Histoire en français')).toHaveLength(2);
  expect(screen.queryByText('Storia italiana')).not.toBeInTheDocument();
  expect(screen.queryByText(METADATA_FALLBACK_COPY.fr)).not.toBeInTheDocument();
});

it('preserves all three fields through the unpublished purchase fallback and keeps the card unlinked', async () => {
  mockUnpublished = { ...italianSource, status: 'archived' };
  mockPurchaseRows.push({ tourId: 'italian', createdAt: '2026-09-13', amountCents: 499 });
  const result = await getMyPurchasesClient();
  expect(result.purchases[0].tour).toMatchObject({ sourceLanguage: 'it', translatedTitles: { fr: 'Histoire en français' }, translatedDescriptions: { fr: 'Description traduite en français' } });
  render(<PurchasedTourCard purchase={result.purchases[0]} locale="fr" />);
  expect(screen.getByText('Histoire en français')).toBeInTheDocument();
  expect(screen.getByTestId('purchase-card-italian')).not.toHaveAttribute('href');
  expect(screen.queryByText(METADATA_FALLBACK_COPY.fr)).not.toBeInTheDocument();
});

it('preserves raw server metadata through the actual guide API and renders Italian signature and catalogue cards', async () => {
  mockPublishedRows.push({ ...italianSource, id: 'french', title: 'Source française', description: 'Description française', sourceLanguage: 'fr-FR', translatedTitles: JSON.stringify({ it: 'Titolo italiano' }), translatedDescriptions: { 'it-IT': 'Descrizione italiana' } });
  expect((await getGuidePublicTours('guide'))[0]).toMatchObject({ sourceLanguage: 'fr', translatedTitles: { it: 'Titolo italiano' }, translatedDescriptions: { it: 'Descrizione italiana' } });
  render(await LocalizedGuidePage({ params: Promise.resolve({ guideSlug: 'marie-nice' }), locale: 'it' }));
  expect(screen.getAllByText('Titolo italiano')).toHaveLength(2);
  expect(screen.getAllByText('Descrizione italiana')).toHaveLength(2);
  expect(screen.queryByText('Source française')).not.toBeInTheDocument();
  expect(screen.queryByText(METADATA_FALLBACK_COPY.it)).not.toBeInTheDocument();
});
