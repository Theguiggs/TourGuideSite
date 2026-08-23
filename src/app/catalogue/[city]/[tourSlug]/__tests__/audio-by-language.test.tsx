/**
 * Story 18 — bloc « Audio par langue » de la fiche Visite.
 *
 * Le bloc était piloté par la carte de mentions : une carte vide — la sentinelle
 * que rend l'assainisseur sur une mention absente ou illisible — le faisait
 * disparaître entièrement, et la Visite se lisait comme une narration humaine.
 * Il est désormais piloté par les langues vendues (`availableLanguages`), la
 * mention de chaque ligne venant de la règle unique `displayedAudioSource`.
 *
 * Les assertions comparent la mention **exactement** : « Voix de synthèse » est
 * une sous-chaîne de « Voix de synthèse (en partie) », si bien qu'un `toContain`
 * passerait alors même que le code dégraderait une synthèse pleine en mixte.
 * La route `/en/catalogue/…` est vivante et rend la même divulgation : elle est
 * couverte ici, sans quoi une régression de traduction ne ferait tomber aucun test.
 */

import { render, screen } from '@testing-library/react';
import { LocalizedTourDetailPage } from '@/app/catalogue/[city]/[tourSlug]/page';
import { getTourBySlug, getCityBySlug } from '@/lib/api/tours-server';
import type { TourDetail } from '@/types/tour';

jest.mock('@/lib/api/tours-server', () => ({
  getTourBySlug: jest.fn(),
  getCityBySlug: jest.fn(),
}));

jest.mock('@/lib/api/guides-public-server', () => ({
  getGuideSlugByGuideId: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/components/TrackPageView', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/SmartAppLink', () => ({
  __esModule: true,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  default: ({ children }: any) => <span>{children}</span>,
}));

jest.mock('@/components/checkout/tour-purchase-card', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/checkout/forfait-purchase-card', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/studio/s3-image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S3Image: ({ alt }: any) => <div>{alt}</div>,
}));

jest.mock('@/app/catalogue/[city]/[tourSlug]/itinerary-list', () => ({
  __esModule: true,
  default: () => null,
}));

const mockGetTour = getTourBySlug as jest.MockedFunction<typeof getTourBySlug>;
const mockGetCity = getCityBySlug as jest.MockedFunction<typeof getCityBySlug>;

function makeTour(over: Partial<TourDetail> = {}): TourDetail {
  return {
    id: 't1',
    title: 'Le Caprice de l’Impératrice',
    slug: 'caprice',
    city: 'Biarritz',
    citySlug: 'biarritz',
    guideId: 'g1',
    guideName: 'Marie',
    description: 'Une visite.',
    shortDescription: 'Une visite.',
    duration: 60,
    distance: 2,
    poiCount: 9,
    isFree: true,
    status: 'published',
    availableLanguages: ['fr'],
    pois: [],
    reviews: [],
    averageRating: 0,
    reviewCount: 0,
    completionCount: 0,
    ...over,
  };
}

async function renderDetail(tour: TourDetail, locale: 'fr' | 'en' = 'fr') {
  mockGetTour.mockResolvedValue(tour);
  mockGetCity.mockResolvedValue(null);
  const ui = await LocalizedTourDetailPage({
    params: Promise.resolve({ city: tour.citySlug, tourSlug: tour.slug }),
    searchParams: Promise.resolve({}),
    locale,
  });
  render(ui);
}

/** Mention exacte affichée pour une langue — pictogramme compris. */
const mentionOf = (lang: string) => screen.getByTestId(`audio-mention-${lang}`).textContent;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('bloc « Audio par langue »', () => {
  it('reste visible et déclare la synthèse pleine quand la mention est absente', async () => {
    await renderDetail(
      makeTour({ availableLanguages: ['fr', 'nl'], languageAudioTypes: {} }),
    );

    expect(screen.getByTestId('tour-audio-by-language')).toBeInTheDocument();
    expect(mentionOf('fr')).toBe('🤖 Voix de synthèse');
    expect(mentionOf('nl')).toBe('🤖 Voix de synthèse');
  });

  it('reste visible quand la Visite ne porte aucune carte du tout', async () => {
    await renderDetail(makeTour({ availableLanguages: ['fr'] }));

    expect(mentionOf('fr')).toBe('🤖 Voix de synthèse');
  });

  it('n’appose aucune mention de synthèse sur une voix humaine déclarée', async () => {
    await renderDetail(makeTour({ languageAudioTypes: { fr: 'recording' } }));

    expect(mentionOf('fr')).toBe('🎤 Voix du guide');
    expect(screen.getByTestId('audio-lang-fr')).not.toHaveTextContent('synthèse');
  });

  it('affiche une langue vendue mais absente de la carte, avec sa mention', async () => {
    await renderDetail(
      makeTour({
        availableLanguages: ['fr', 'nl'],
        languageAudioTypes: { fr: 'recording' },
      }),
    );

    expect(mentionOf('fr')).toBe('🎤 Voix du guide');
    expect(mentionOf('nl')).toBe('🤖 Voix de synthèse');
    expect(screen.getByTestId('audio-lang-name-nl').textContent).toContain('Nederlands');
  });

  it('distingue le mixte de la synthèse pleine', async () => {
    await renderDetail(makeTour({ languageAudioTypes: { fr: 'mixed' } }));

    expect(mentionOf('fr')).toBe('🤖 Voix de synthèse (en partie)');
  });

  it('déclare la synthèse sur une valeur hors domaine', async () => {
    await renderDetail(
      makeTour({
        languageAudioTypes: { fr: 'human' } as unknown as TourDetail['languageAudioTypes'],
      }),
    );

    expect(mentionOf('fr')).toBe('🤖 Voix de synthèse');
  });

  it('dégrade une langue sans libellé ni drapeau sans répéter son code', async () => {
    await renderDetail(makeTour({ availableLanguages: ['fr', 'ca'] }));

    const name = screen.getByTestId('audio-lang-name-ca').textContent ?? '';
    expect(name.trim()).toBe('CA');
    expect(name.match(/CA/gi) ?? []).toHaveLength(1);
    expect(mentionOf('ca')).toBe('🤖 Voix de synthèse');
  });
});

describe('bloc « Audio par langue » — /en/catalogue', () => {
  it('déclare la synthèse en anglais quand la mention est absente', async () => {
    await renderDetail(
      makeTour({ availableLanguages: ['en', 'nl'], languageAudioTypes: {} }),
      'en',
    );

    expect(screen.getByTestId('tour-audio-by-language')).toBeInTheDocument();
    expect(mentionOf('en')).toBe('🤖 Synthetic voice');
    expect(mentionOf('nl')).toBe('🤖 Synthetic voice');
  });

  it('distingue le mixte de la synthèse pleine, et la voix du guide, en anglais', async () => {
    await renderDetail(
      makeTour({
        availableLanguages: ['en', 'fr'],
        languageAudioTypes: { en: 'mixed', fr: 'recording' },
      }),
      'en',
    );

    expect(mentionOf('en')).toBe('🤖 Synthetic voice (partly)');
    expect(mentionOf('fr')).toBe('🎤 Guide recording');
  });
});
