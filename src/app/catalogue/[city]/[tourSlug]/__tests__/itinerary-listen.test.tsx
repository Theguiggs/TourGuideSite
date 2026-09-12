/**
 * LW-1 — « Écouter » sur la fiche Visite : le bouton n'existe que pour une
 * étape servie ET narrée, et le HTML ne porte aucune URL signée.
 *
 * Le rendu serveur ne donne à l'itinéraire qu'un booléen `hasAudio` ; l'URL
 * est demandée par le navigateur au premier clic. Les étapes floutées n'ont
 * jamais de bouton, même si leur projection dit `hasAudio`.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { tg } from '@murmure/design-system/web';
import ItineraryList from '../itinerary-list';
import { __resetOwnedTourIdsCache } from '@/hooks/use-owned-tour-ids';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';
import type { POI } from '@/types/tour';

let authState: { isAuthenticated: boolean; user: { id: string } | null } = {
  isAuthenticated: false,
  user: null,
};

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => authState,
}));

const mockListOwnedTourIds = jest.fn();
jest.mock('@/lib/api/tour-purchase', () => ({
  listOwnedTourIds: () => mockListOwnedTourIds(),
}));

const mockHasActiveForfait = jest.fn();
jest.mock('@/lib/api/forfait-purchase', () => ({
  hasActiveForfait: () => mockHasActiveForfait(),
}));

const mockGetPublishedTourContent = jest.fn();
jest.mock('@/lib/api/appsync-client', () => ({
  getPublishedTourContent: (...a: unknown[]) => mockGetPublishedTourContent(...a),
}));

jest.mock('@/config/api-mode', () => ({ shouldUseStubs: () => false }));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/components/studio/s3-image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S3Image: ({ alt }: any) => <div>{alt}</div>,
}));

const URL = (id: string) => `https://media.example/${id}.mp3?sig=server`;

function poi(id: string, order: number, hasAudio: boolean, title = `Étape ${order}`): POI {
  return { id, title, description: `Texte ${order}`, latitude: 43.7, longitude: 7.2, order, hasAudio };
}

/** Rendu serveur d'une visite : quatre étapes, la troisième sans narration. */
const SSR_POIS: POI[] = [
  poi('s1', 1, true),
  poi('s2', 2, true),
  poi('s3', 3, false),
  poi('s4', 4, true),
];

function fullContent(ids: string[], withAudio: (id: string) => boolean) {
  return {
    ok: true as const,
    data: {
      tourId: 'tour-1',
      walkPath: [],
      mediaExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
      scenes: ids.map((id, index) => ({
        id,
        order: index,
        title: `Étape ${index + 1}`,
        description: `Texte ${index + 1}`,
        photos: [],
        ...(withAudio(id) ? { audioKey: `k-${id}`, audioUrl: URL(id) } : {}),
      })),
    },
  };
}

const playSpy = jest.fn<Promise<void>, []>();
const pauseSpy = jest.fn<void, []>();
const loadSpy = jest.fn<void, []>();

const STUBBED = ['play', 'pause', 'load'] as const;
const originals = Object.fromEntries(
  STUBBED.map((name) => [name, Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, name)]),
);

beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playSpy });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pauseSpy });
  Object.defineProperty(HTMLMediaElement.prototype, 'load', { configurable: true, value: loadSpy });
});

afterAll(() => {
  for (const name of STUBBED) {
    const descriptor = originals[name];
    if (descriptor) Object.defineProperty(HTMLMediaElement.prototype, name, descriptor);
    else delete (HTMLMediaElement.prototype as unknown as Record<string, unknown>)[name];
  }
});

function listenButtons(): HTMLElement[] {
  return screen.queryAllByTestId(/^scene-listen-button-/);
}

function listenButtonIds(): string[] {
  return listenButtons().map((node) => node.getAttribute('data-testid') ?? '');
}

describe('fiche Visite — écouter une étape (LW-1)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetOwnedTourIdsCache();
    authState = { isAuthenticated: false, user: null };
    mockListOwnedTourIds.mockResolvedValue(new Set<string>());
    mockHasActiveForfait.mockResolvedValue(false);
    playSpy.mockResolvedValue(undefined);
    mockGetPublishedTourContent.mockResolvedValue(
      fullContent(['s1', 's2', 's3', 's4'], (id) => id !== 's3'),
    );
  });

  it('visite gratuite, anonyme : un bouton par étape narrée, aucun sur la scène sans audio', async () => {
    const { container } = render(
      <ItineraryList pois={SSR_POIS} tourId="tour-1" isFree heroAccentFg="#B4703A" />,
    );
    await act(async () => {});

    expect(listenButtonIds()).toEqual([
      'scene-listen-button-s1',
      'scene-listen-button-s2',
      'scene-listen-button-s4',
    ]);
    expect(screen.queryByTestId('scene-listen-s3')).not.toBeInTheDocument();
    // Un seul élément <audio> pour toute la liste, et aucune URL dans le HTML.
    expect(container.querySelectorAll('audio')).toHaveLength(1);
    expect(container.innerHTML).not.toContain('sig=server');
    // Rien n'est demandé avant le premier clic.
    expect(mockGetPublishedTourContent).not.toHaveBeenCalled();
  });

  it('premier clic : exactement une requête, puis lecture ; étape marquée (aria-current + fond)', async () => {
    const { container } = render(
      <ItineraryList pois={SSR_POIS} tourId="tour-1" isFree heroAccentFg="#B4703A" />,
    );
    await act(async () => {});

    fireEvent.click(screen.getByTestId('scene-listen-button-s2'));
    await act(async () => {});

    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    expect(mockGetPublishedTourContent).toHaveBeenCalledWith('tour-1');
    expect(playSpy).toHaveBeenCalledTimes(1);
    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBe(URL('s2'));
    await waitFor(() =>
      expect(screen.getByTestId('scene-listen-button-s2')).toHaveTextContent('Pause'),
    );

    const current = container.querySelectorAll('li[aria-current="true"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toContainElement(screen.getByTestId('scene-listen-button-s2'));
    expect(current[0]).toHaveStyle({ backgroundColor: tg.colors.paperSoft });
    expect(current[0]).toHaveStyle({ borderLeft: '3px solid #B4703A' });
    // Les autres étapes gardent une bordure transparente : pas de décalage.
    const others = Array.from(container.querySelectorAll('li:not([aria-current])'));
    expect(others).toHaveLength(3);
    for (const li of others) {
      expect(li).not.toHaveStyle({ backgroundColor: tg.colors.paperSoft });
    }
  });

  it("visite payante, anonyme : boutons sur les deux premières étapes seulement", async () => {
    render(
      <ItineraryList
        pois={SSR_POIS.map((p) => ({ ...p, hasAudio: true }))}
        tourId="tour-1"
        isFree={false}
        heroAccentFg="#B4703A"
      />,
    );
    await act(async () => {});

    expect(listenButtonIds()).toEqual(['scene-listen-button-s1', 'scene-listen-button-s2']);
    expect(mockGetPublishedTourContent).not.toHaveBeenCalled();
  });

  it("visite payante, acheteur : toutes les étapes narrées une fois le contenu accordé", async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockHasActiveForfait.mockResolvedValue(true);

    render(
      <ItineraryList
        pois={SSR_POIS.map((p, index) => ({ ...p, hasAudio: index < 2 }))}
        tourId="tour-1"
        isFree={false}
        heroAccentFg="#B4703A"
      />,
    );

    // Avant l'accord (redemande de `useServedContent`) : l'aperçu.
    expect(listenButtons()).toHaveLength(2);

    await waitFor(() => expect(listenButtons()).toHaveLength(3));
    expect(listenButtonIds()).toEqual([
      'scene-listen-button-s1',
      'scene-listen-button-s2',
      'scene-listen-button-s4',
    ]);
    // La redemande d'itinéraire n'est pas celle du lecteur : aucune URL n'a été
    // posée, et le clic sur une étape nouvellement ouverte la demandera.
    expect(playSpy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId('scene-listen-button-s4'));
    await act(async () => {});
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it("achat qui aboutit après une écoute anonyme : la source est oubliée, l'étape ouverte redemande", async () => {
    const { container } = render(
      <ItineraryList
        pois={SSR_POIS.map((p, index) => ({ ...p, hasAudio: index < 2 }))}
        tourId="tour-1"
        isFree={false}
        heroAccentFg="#B4703A"
      />,
    );
    await act(async () => {});

    // Anonyme : l'aperçu se joue avec les URLs de l'aperçu.
    fireEvent.click(screen.getByTestId('scene-listen-button-s1'));
    await act(async () => {});
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    const audio = container.querySelector('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBe(URL('s1'));

    // Le paiement aboutit, la session est là : la carte émet.
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockHasActiveForfait.mockResolvedValue(true);
    await act(async () => {
      window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT));
    });

    // L'itinéraire redemande (2e appel) et l'étape 4 s'ouvre.
    await waitFor(() => expect(screen.getByTestId('scene-listen-button-s4')).toBeInTheDocument());
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);

    // Le lecteur ne réutilise pas les URLs de l'anonyme : il redemande (3e appel)
    // et joue ce que le serveur accorde à l'acheteur.
    fireEvent.click(screen.getByTestId('scene-listen-button-s4'));
    await act(async () => {});
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(3);
    expect(audio.getAttribute('src')).toBe(URL('s4'));
    await waitFor(() =>
      expect(screen.getByTestId('scene-listen-button-s4')).toHaveTextContent('Pause'),
    );
  });

  it("déconnexion pendant l'écoute d'une étape payante : la lecture s'arrête avec le bouton", async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockHasActiveForfait.mockResolvedValue(true);
    const view = render(
      <ItineraryList
        pois={SSR_POIS.map((p, index) => ({ ...p, hasAudio: index < 2 }))}
        tourId="tour-1"
        isFree={false}
        heroAccentFg="#B4703A"
      />,
    );
    await waitFor(() => expect(screen.getByTestId('scene-listen-button-s4')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('scene-listen-button-s4'));
    await act(async () => {});
    await waitFor(() =>
      expect(screen.getByTestId('scene-listen-button-s4')).toHaveTextContent('Pause'),
    );
    pauseSpy.mockClear();

    authState = { isAuthenticated: false, user: null };
    view.rerender(
      <ItineraryList
        pois={SSR_POIS.map((p, index) => ({ ...p, hasAudio: index < 2 }))}
        tourId="tour-1"
        isFree={false}
        heroAccentFg="#B4703A"
      />,
    );
    await act(async () => {});

    expect(screen.queryByTestId('scene-listen-button-s4')).not.toBeInTheDocument();
    expect(pauseSpy).toHaveBeenCalled();
    const audio = view.container.querySelector('audio') as HTMLAudioElement;
    expect(audio.getAttribute('src')).toBeNull();
    expect(view.container.querySelector('li[aria-current="true"]')).toBeNull();
  });

  it('visite payante, acheteur, redemande refusée : les étapes floutées restent sans bouton', async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockGetPublishedTourContent.mockResolvedValue({ ok: false, error: 'Contenu public indisponible' });

    render(
      <ItineraryList
        pois={SSR_POIS.map((p) => ({ ...p, hasAudio: true }))}
        tourId="tour-1"
        isFree={false}
        heroAccentFg="#B4703A"
      />,
    );
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalled());
    await act(async () => {});

    expect(listenButtons()).toHaveLength(2);
    expect(screen.getByText('Étape 3')).toBeInTheDocument();
  });
});
