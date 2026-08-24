/**
 * Liste des Visites d'une ville (/catalogue/[city]).
 *
 * Deux sujets, un seul composant :
 *  - Badge « Gratuit / Acheté / Prix » : Gratuit + Prix viennent des données SSR
 *    (isFree / priceCents), Acheté est per-user et résolu après hydratation via
 *    listOwnedTourIds().
 *  - Mention de source audio (story 18) : la puce de langue et le badge de Visite
 *    lisent `displayedAudioSource`. Une carte absente ou vide vaut « synthèse »,
 *    et une langue vendue s'affiche même absente de la carte.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TourListWithFilter } from '@/app/catalogue/[city]/tour-list-filter';
import { listOwnedTourIds } from '@/lib/api/tour-purchase';
import { __resetOwnedTourIdsCache } from '@/hooks/use-owned-tour-ids';
import type { Tour } from '@/types/tour';

// Controllable auth state across tests.
let mockAuthed = false;
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: mockAuthed, user: mockAuthed ? { id: 'u1' } : null }),
}));

jest.mock('@/lib/api/tour-purchase', () => ({
  listOwnedTourIds: jest.fn(),
}));

jest.mock('@/components/studio/s3-image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S3Image: ({ alt }: any) => <div data-testid="s3-image">{alt}</div>,
}));

const mockListOwned = listOwnedTourIds as jest.MockedFunction<typeof listOwnedTourIds>;

function makeTour(over: Partial<Tour> & Pick<Tour, 'id' | 'slug' | 'title'>): Tour {
  return {
    city: 'Grasse',
    citySlug: 'grasse',
    guideId: 'g1',
    guideName: 'Marie',
    description: '',
    shortDescription: '',
    duration: 45,
    distance: 2,
    poiCount: 6,
    isFree: false,
    status: 'published',
    ...over,
  };
}

const TOURS: Tour[] = [
  makeTour({ id: 'free-1', slug: 'gratuite', title: 'Visite gratuite', purchaseType: 'free' }),
  makeTour({ id: 'paid-1', slug: 'payante', title: 'Visite payante', purchaseType: 'paid', priceCents: 499 }),
  makeTour({ id: 'paid-2', slug: 'achetee', title: 'Visite achetee', purchaseType: 'paid', priceCents: 999 }),
];

beforeEach(() => {
  mockAuthed = false;
  mockListOwned.mockResolvedValue(new Set());
  __resetOwnedTourIdsCache();
});

describe('<TourListWithFilter> badges', () => {
  it('shows GRATUIT for free tours and the price for paid tours', async () => {
    render(<TourListWithFilter tours={TOURS} citySlug="grasse" />);

    expect(screen.getByTestId('badge-free-free-1')).toHaveTextContent('GRATUIT');
    expect(screen.getByTestId('badge-price-paid-1')).toHaveTextContent('4,99 €');
    expect(screen.getByTestId('badge-price-paid-2')).toHaveTextContent('9,99 €');
  });

  it('does not query ownership for guests', () => {
    render(<TourListWithFilter tours={TOURS} citySlug="grasse" />);
    expect(mockListOwned).not.toHaveBeenCalled();
    expect(screen.queryByTestId('badge-owned-paid-1')).toBeNull();
  });

  it('replaces the price badge with "Acheté" for owned tours after hydration', async () => {
    mockAuthed = true;
    mockListOwned.mockResolvedValue(new Set(['paid-2']));

    render(<TourListWithFilter tours={TOURS} citySlug="grasse" />);

    // Owned tour flips to the "Acheté" badge once the client check resolves.
    await waitFor(() => expect(screen.getByTestId('badge-owned-paid-2')).toBeInTheDocument());
    expect(screen.getByTestId('badge-owned-paid-2')).toHaveTextContent('Acheté');
    expect(screen.queryByTestId('badge-price-paid-2')).toBeNull();

    // Non-owned paid tour keeps its price badge; free tour stays GRATUIT.
    expect(screen.getByTestId('badge-price-paid-1')).toHaveTextContent('4,99 €');
    expect(screen.getByTestId('badge-free-free-1')).toBeInTheDocument();
    expect(mockListOwned).toHaveBeenCalledTimes(1);
  });
});

describe('<TourListWithFilter> mention de source audio', () => {
  /** Infobulle exacte : « Voix de synthèse » est une sous-chaîne de « … (en partie) ». */
  const titleOf = (tourId: string, lang: string) =>
    screen.getByTestId(`lang-chip-${tourId}-${lang}`).getAttribute('title');

  it('déclare la synthèse pleine sur chaque langue vendue quand la mention est absente', () => {
    const tour = makeTour({
      id: 'nu-1',
      slug: 'sans-mention',
      title: 'Visite sans mention',
      availableLanguages: ['fr', 'nl'],
      // Sentinelle web de l'assainisseur : mention absente ou illisible en base.
      languageAudioTypes: {},
    });

    render(<TourListWithFilter tours={[tour]} citySlug="grasse" />);

    expect(titleOf('nu-1', 'fr')).toBe('Français — Voix de synthèse');
    expect(titleOf('nu-1', 'nl')).toBe('Nederlands — Voix de synthèse');
    expect(screen.getByTestId('lang-chip-nu-1-fr')).toHaveTextContent('🤖');
    expect(screen.getByTestId('tts-badge-nu-1')).toHaveTextContent('Voix de synthèse');
  });

  it('laisse intacte une voix humaine déclarée', () => {
    const tour = makeTour({
      id: 'hum-1',
      slug: 'humaine',
      title: 'Visite humaine',
      availableLanguages: ['fr'],
      languageAudioTypes: { fr: 'recording' },
    });

    render(<TourListWithFilter tours={[tour]} citySlug="grasse" />);

    const chip = screen.getByTestId('lang-chip-hum-1-fr');
    expect(chip).toHaveTextContent('🎤');
    expect(titleOf('hum-1', 'fr')).toBe('Français — Voix du guide');
    expect(chip).not.toHaveTextContent('synthèse');
    expect(screen.queryByTestId('tts-badge-hum-1')).toBeNull();
  });

  it('affiche une langue vendue absente de la carte, avec sa mention', () => {
    const tour = makeTour({
      id: 'mix-1',
      slug: 'partielle',
      title: 'Visite partiellement déclarée',
      availableLanguages: ['fr', 'nl'],
      languageAudioTypes: { fr: 'recording' },
    });

    render(<TourListWithFilter tours={[tour]} citySlug="grasse" />);

    expect(titleOf('mix-1', 'fr')).toBe('Français — Voix du guide');
    const dutch = screen.getByTestId('lang-chip-mix-1-nl');
    expect(dutch).toHaveTextContent('🇳🇱');
    expect(dutch).toHaveTextContent('🤖');
    expect(titleOf('mix-1', 'nl')).toBe('Nederlands — Voix de synthèse');
    // Une seule langue non déclarée suffit à porter le badge de Visite.
    expect(screen.getByTestId('tts-badge-mix-1')).toBeInTheDocument();
  });

  it('porte le badge de Visite sur une mention « mixed » — il le ratait', () => {
    const tour = makeTour({
      id: 'mixed-1',
      slug: 'mixte',
      title: 'Visite mixte',
      availableLanguages: ['fr'],
      languageAudioTypes: { fr: 'mixed' },
    });

    render(<TourListWithFilter tours={[tour]} citySlug="grasse" />);

    expect(screen.getByTestId('tts-badge-mixed-1')).toBeInTheDocument();
    expect(titleOf('mixed-1', 'fr')).toBe('Français — Voix de synthèse (en partie)');
  });

  it('lit une clé héritée sans travestir la voix humaine', () => {
    const tour = makeTour({
      id: 'leg-1',
      slug: 'heritee',
      title: 'Visite héritée',
      availableLanguages: ['fr'],
      languageAudioTypes: { FR: 'recording' },
    });

    render(<TourListWithFilter tours={[tour]} citySlug="grasse" />);

    expect(titleOf('leg-1', 'fr')).toBe('Français — Voix du guide');
    expect(screen.queryByTestId('tts-badge-leg-1')).toBeNull();
  });

  it('dégrade une langue sans drapeau sans répéter son code', () => {
    const tour = makeTour({
      id: 'deg-1',
      slug: 'degradee',
      title: 'Visite en langue inconnue',
      availableLanguages: ['ca'],
    });

    render(<TourListWithFilter tours={[tour]} citySlug="grasse" />);

    const chip = screen.getByTestId('lang-chip-deg-1-ca');
    expect(chip).toHaveTextContent('🌐');
    // Sans glyphe neutre, l'emplacement du drapeau reprenait le code : « ca CA ».
    // La copie destinée aux lecteurs d'écran est exclue du décompte visible.
    const visible = Array.from(chip.childNodes)
      .filter((node) => !(node instanceof HTMLElement && node.classList.contains('sr-only')))
      .map((node) => node.textContent ?? '')
      .join('');
    expect(visible.match(/ca/gi) ?? []).toHaveLength(1);
    expect(titleOf('deg-1', 'ca')).toBe('CA — Voix de synthèse');
  });

  it('rend la mention en texte, pas seulement en infobulle et en pictogramme', () => {
    const tour = makeTour({
      id: 'a11y-1',
      slug: 'accessible',
      title: 'Visite accessible',
      availableLanguages: ['fr'],
      languageAudioTypes: {},
    });

    render(<TourListWithFilter tours={[tour]} citySlug="grasse" />);

    // Un `title` sur un <span> n'est pas lu de façon fiable, jamais au toucher.
    const spoken = screen.getByTestId('lang-chip-a11y-1-fr').querySelector('.sr-only');
    expect(spoken?.textContent).toBe('Français — Voix de synthèse');
    // Le pictogramme, lui, n'est pas annoncé deux fois.
    expect(
      screen.getByTestId('lang-chip-a11y-1-fr').querySelector('[aria-hidden="true"]')?.textContent,
    ).toBe('🤖');
  });
});

describe('<TourListWithFilter> mention de source audio — locale anglaise', () => {
  it('divulgue en anglais sur /en/catalogue', () => {
    const tour = makeTour({
      id: 'en-1',
      slug: 'anglaise',
      title: 'English tour',
      availableLanguages: ['en', 'nl'],
      languageAudioTypes: { en: 'recording', nl: 'mixed' },
    });

    render(<TourListWithFilter tours={[tour]} citySlug="grasse" locale="en" />);

    expect(screen.getByTestId('lang-chip-en-1-en').getAttribute('title')).toBe(
      'English — Guide recording',
    );
    expect(screen.getByTestId('lang-chip-en-1-nl').getAttribute('title')).toBe(
      'Nederlands — Synthetic voice (partly)',
    );
    expect(screen.getByTestId('tts-badge-en-1')).toHaveTextContent('Synthetic voice');
    expect(screen.getByTestId('tts-badge-en-1')).not.toHaveTextContent('Voix de synthèse');
  });
});

describe('<TourListWithFilter> filtre de langue', () => {
  const DUTCH_TOURS: Tour[] = [
    makeTour({
      id: 'fr-only',
      slug: 'francaise',
      title: 'Visite française',
      availableLanguages: ['fr'],
      languageAudioTypes: { fr: 'recording' },
    }),
    makeTour({
      id: 'nl-1',
      slug: 'neerlandaise',
      title: 'Visite néerlandaise',
      availableLanguages: ['fr', 'nl'],
      languageAudioTypes: { fr: 'recording', nl: 'tts' },
    }),
  ];

  it('propose le néerlandais au filtre et le rend sélectionnable', () => {
    render(<TourListWithFilter tours={DUTCH_TOURS} citySlug="grasse" />);

    fireEvent.click(screen.getByRole('button', { name: /Nederlands \(1\)/ }));

    expect(screen.getByTestId('tour-card-nl-1')).toBeInTheDocument();
    expect(screen.queryByTestId('tour-card-fr-only')).toBeNull();
  });

  it('range les langues dans l ordre d affichage, hors liste blanche', () => {
    render(<TourListWithFilter tours={DUTCH_TOURS} citySlug="grasse" />);

    const labels = screen
      .getAllByRole('button')
      .map((b) => b.textContent ?? '')
      .filter((t) => !t.startsWith('Toutes'));
    expect(labels[0]).toContain('Français');
    expect(labels[1]).toContain('Nederlands');
  });
});
