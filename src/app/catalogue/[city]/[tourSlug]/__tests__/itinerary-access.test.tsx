/**
 * Les deux verrous de la fiche Visite, ouverts ensemble ou pas du tout.
 *
 * Le rendu serveur est le rendu public : il ne porte aucune identité, donc le
 * Lambda le sert tronqué — deux scènes intégrales, les suivantes sans
 * description. Un visiteur authentifié redemande le contenu depuis le navigateur,
 * seul endroit où vivent les jetons, et l'itinéraire se défloute d'après CE QUI
 * EST ARRIVÉ : le contenu complet, ou l'aperçu.
 *
 * Le navigateur ne décide de rien. Déflouter sur ce qu'il croit posséder
 * afficherait des étapes vides dès que la redemande échoue, et le mettrait en
 * désaccord avec le serveur le jour où celui-ci resserre sa règle.
 */

import { render, screen, act, waitFor } from '@testing-library/react';
import ItineraryList from '../itinerary-list';
import { __resetOwnedTourIdsCache } from '@/hooks/use-owned-tour-ids';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';
import { logger } from '@/lib/logger';
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

const SECRET_3 = 'La cour cachée du palais';
const SECRET_4 = 'Le belvédère au couchant';

/** Ce que le rendu serveur produit : le Lambda a retiré les descriptions 3 et 4. */
const SSR_PREVIEW: POI[] = [
  {
    id: 's1',
    title: 'Étape une',
    description: 'Départ place du marché',
    latitude: 43.7,
    longitude: 7.2,
    order: 1,
  },
  {
    id: 's2',
    title: 'Étape deux',
    description: 'La halle aux grains',
    latitude: 43.7,
    longitude: 7.2,
    order: 2,
  },
  { id: 's3', title: 'Étape trois', description: '', latitude: 43.7, longitude: 7.2, order: 3 },
  { id: 's4', title: 'Étape quatre', description: '', latitude: 43.7, longitude: 7.2, order: 4 },
];

/** Ce que le Lambda renvoie à un demandeur autorisé : tout. */
const FULL_CONTENT = {
  ok: true as const,
  data: {
    tourId: 'tour-1',
    walkPath: [],
    scenes: [
      { id: 's1', order: 1, title: 'Étape une', description: 'Départ place du marché', photos: [] },
      { id: 's2', order: 2, title: 'Étape deux', description: 'La halle aux grains', photos: [] },
      { id: 's3', order: 3, title: 'Étape trois', description: SECRET_3, photos: [] },
      { id: 's4', order: 4, title: 'Étape quatre', description: SECRET_4, photos: [] },
    ],
  },
};

/** Ce que le Lambda renvoie à un anonyme : tronqué. */
const TRUNCATED_CONTENT = {
  ok: true as const,
  data: {
    ...FULL_CONTENT.data,
    scenes: FULL_CONTENT.data.scenes.map((scene, index) =>
      index < 2 ? scene : { ...scene, description: '', photos: [] },
    ),
  },
};

function renderItinerary(overrides: Partial<React.ComponentProps<typeof ItineraryList>> = {}) {
  return render(
    <ItineraryList
      pois={SSR_PREVIEW}
      tourId="tour-1"
      isFree={false}
      heroAccentFg="#B4703A"
      {...overrides}
    />,
  );
}

function lockedStops(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('[aria-label*="verrouill"]')).map(
    (node) => node.getAttribute('aria-label') ?? '',
  );
}

/**
 * Ce que l'œil voit réellement, indépendamment de la langue de l'étiquette : un
 * `lockedStops()` vide passerait tout aussi bien si le libellé français changeait.
 */
function blurred(container: HTMLElement): number {
  return container.querySelectorAll('[style*="blur"]').length;
}

describe('fiche Visite — accès au contenu complet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetOwnedTourIdsCache();
    authState = { isAuthenticated: false, user: null };
    mockListOwnedTourIds.mockResolvedValue(new Set<string>());
    mockHasActiveForfait.mockResolvedValue(false);
    mockGetPublishedTourContent.mockResolvedValue(TRUNCATED_CONTENT);
  });

  it('anonyme : aperçu de deux étapes, le reste flouté, et aucune redemande', async () => {
    const { container } = renderItinerary();
    await act(async () => {});

    expect(screen.getByText('Départ place du marché')).toBeInTheDocument();
    expect(screen.queryByText(SECRET_3)).not.toBeInTheDocument();
    expect(lockedStops(container)).toHaveLength(2);
    expect(blurred(container)).toBeGreaterThan(0);
    // Le navigateur ne demande rien sans session : aucune identité à porter.
    expect(mockGetPublishedTourContent).not.toHaveBeenCalled();
  });

  it('porteur de forfait : contenu complet, rien de flouté', async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockHasActiveForfait.mockResolvedValue(true);
    mockGetPublishedTourContent.mockResolvedValue(FULL_CONTENT);

    const { container } = renderItinerary();

    await waitFor(() => expect(screen.getByText(SECRET_3)).toBeInTheDocument());
    expect(screen.getByText(SECRET_4)).toBeInTheDocument();
    expect(lockedStops(container)).toHaveLength(0);
    expect(blurred(container)).toBe(0);
    expect(mockGetPublishedTourContent).toHaveBeenCalledWith('tour-1');
  });

  it("acheteur à l'unité : contenu complet, comme avant", async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockListOwnedTourIds.mockResolvedValue(new Set(['tour-1']));
    mockGetPublishedTourContent.mockResolvedValue(FULL_CONTENT);

    const { container } = renderItinerary();

    await waitFor(() => expect(screen.getByText(SECRET_3)).toBeInTheDocument());
    expect(lockedStops(container)).toHaveLength(0);
  });

  it("c'est le serveur qui ouvre, pas la possession calculée ici", async () => {
    // Ni achat à l'unité, ni forfait vus par le navigateur — et pourtant le
    // serveur accorde (droit qu'il connaît, guide propriétaire, achat encore
    // invisible à la lecture cliente). Le contenu arrive : on l'affiche.
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockListOwnedTourIds.mockResolvedValue(new Set<string>());
    mockHasActiveForfait.mockResolvedValue(false);
    mockGetPublishedTourContent.mockResolvedValue(FULL_CONTENT);

    const { container } = renderItinerary();

    await waitFor(() => expect(screen.getByText(SECRET_3)).toBeInTheDocument());
    expect(lockedStops(container)).toHaveLength(0);
  });

  it("le navigateur se croit en droit, le serveur tronque : le flou reste", async () => {
    // L'inverse, et le plus important : si les deux se désaccordent, c'est le
    // serveur qui a raison. Déflouter ici n'afficherait que des étapes vides.
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockHasActiveForfait.mockResolvedValue(true);
    mockListOwnedTourIds.mockResolvedValue(new Set(['tour-1']));
    mockGetPublishedTourContent.mockResolvedValue(TRUNCATED_CONTENT);

    const { container } = renderItinerary();
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalled());
    await act(async () => {});

    expect(screen.queryByText(SECRET_3)).not.toBeInTheDocument();
    expect(lockedStops(container)).toHaveLength(2);
  });

  it("authentifié sans droit : le serveur tronque, l'aperçu reste flouté", async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };

    const { container } = renderItinerary();
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalled());
    await act(async () => {});

    expect(screen.queryByText(SECRET_3)).not.toBeInTheDocument();
    expect(lockedStops(container)).toHaveLength(2);
  });

  it('forfait expiré : aperçu, comme sans droit', async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    // Un droit expiré ne passe pas `isEntitled` : le serveur tronque, donc la
    // fiche reste fermée — la règle d'expiration elle-même est éprouvée dans
    // `forfait-purchase.test.ts`, là où elle vit.
    mockHasActiveForfait.mockResolvedValue(false);
    mockGetPublishedTourContent.mockResolvedValue(TRUNCATED_CONTENT);

    const { container } = renderItinerary();
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalled());
    await act(async () => {});

    expect(screen.queryByText(SECRET_3)).not.toBeInTheDocument();
    expect(lockedStops(container)).toHaveLength(2);
  });

  it('visite gratuite : tout est ouvert, sans aucune demande', async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };

    const { container } = renderItinerary({
      isFree: true,
      pois: SSR_PREVIEW.map((poi) => ({ ...poi, description: poi.description || 'Texte libre' })),
    });
    await act(async () => {});

    expect(lockedStops(container)).toHaveLength(0);
    expect(blurred(container)).toBe(0);
    expect(mockGetPublishedTourContent).not.toHaveBeenCalled();
  });

  it("redemande en échec : l'aperçu du rendu serveur reste, flou compris", async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockHasActiveForfait.mockResolvedValue(true);
    mockGetPublishedTourContent.mockResolvedValue({
      ok: false,
      error: 'Contenu public indisponible',
    });

    const { container } = renderItinerary();
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalled());
    await act(async () => {});

    // Les titres et l'aperçu du rendu serveur sont toujours là.
    expect(screen.getByText('Étape trois')).toBeInTheDocument();
    expect(screen.getByText('Départ place du marché')).toBeInTheDocument();
    // Rien n'est arrivé, donc rien ne s'ouvre : un itinéraire défloutté sur du
    // vide se lirait « le guide n'a rien écrit », ce qui est faux.
    expect(lockedStops(container)).toHaveLength(2);
    expect(screen.queryByText(SECRET_3)).not.toBeInTheDocument();
    expect(jest.mocked(logger.warn)).toHaveBeenCalled();
  });

  it("redemande qui lève : l'aperçu reste, l'échec est journalisé", async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockGetPublishedTourContent.mockRejectedValue(new Error('network'));

    const { container } = renderItinerary();
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalled());
    await act(async () => {});

    expect(screen.getByText('Étape trois')).toBeInTheDocument();
    expect(lockedStops(container)).toHaveLength(2);
    expect(jest.mocked(logger.warn)).toHaveBeenCalled();
  });

  it('réponse vide : on garde l’itinéraire du rendu serveur', async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockGetPublishedTourContent.mockResolvedValue({
      ok: true,
      data: { tourId: 'tour-1', walkPath: [], scenes: [] },
    });

    const { container } = renderItinerary();
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalled());
    await act(async () => {});

    // Sans cette garde, une réponse vide effacerait un itinéraire déjà affiché
    // et la fiche basculerait sur « Itinéraire en cours de finalisation ».
    expect(screen.getByText('Étape une')).toBeInTheDocument();
    expect(lockedStops(container)).toHaveLength(2);
  });

  it("ne montre jamais le contenu d'une visite sous le titre d'une autre", async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockHasActiveForfait.mockResolvedValue(true);
    mockGetPublishedTourContent.mockResolvedValue(FULL_CONTENT);

    const view = renderItinerary();
    await waitFor(() => expect(screen.getByText(SECRET_3)).toBeInTheDocument());

    // Navigation client vers une autre fiche : la redemande repart de zéro, et
    // l'aperçu de la NOUVELLE visite tient la place en attendant.
    let resolveSecond: (value: unknown) => void = () => {};
    mockGetPublishedTourContent.mockReturnValue(
      new Promise((resolve) => {
        resolveSecond = resolve;
      }),
    );
    view.rerender(
      <ItineraryList
        pois={[
          {
            id: 'autre-1',
            title: 'Autre étape',
            description: 'Autre aperçu',
            latitude: 0,
            longitude: 0,
            order: 1,
          },
        ]}
        tourId="tour-2"
        isFree={false}
        heroAccentFg="#B4703A"
      />,
    );

    expect(screen.getByText('Autre aperçu')).toBeInTheDocument();
    expect(screen.queryByText(SECRET_3)).not.toBeInTheDocument();

    await act(async () => {
      resolveSecond({ ok: false, error: 'Contenu public indisponible' });
    });
    expect(screen.queryByText(SECRET_3)).not.toBeInTheDocument();
  });

  it('déconnexion : le contenu obtenu quitte la page', async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    mockHasActiveForfait.mockResolvedValue(true);
    mockGetPublishedTourContent.mockResolvedValue(FULL_CONTENT);

    const view = renderItinerary();
    await waitFor(() => expect(screen.getByText(SECRET_3)).toBeInTheDocument());

    // Sans la remise à zéro, les descriptions payantes resteraient montées,
    // masquées par un simple flou CSS — donc lisibles dans le DOM.
    authState = { isAuthenticated: false, user: null };
    view.rerender(
      <ItineraryList pois={SSR_PREVIEW} tourId="tour-1" isFree={false} heroAccentFg="#B4703A" />,
    );
    await act(async () => {});

    expect(screen.queryByText(SECRET_3)).not.toBeInTheDocument();
    expect(lockedStops(view.container)).toHaveLength(2);
  });

  it("achat de forfait qui vient d'aboutir : l'accès s'ouvre sans rechargement", async () => {
    authState = { isAuthenticated: true, user: { id: 'user-1' } };

    const { container } = renderItinerary();
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalled());
    await act(async () => {});
    expect(lockedStops(container)).toHaveLength(2);

    // Le paiement aboutit : le serveur a écrit l'entitlement, la carte émet.
    mockHasActiveForfait.mockResolvedValue(true);
    mockGetPublishedTourContent.mockResolvedValue(FULL_CONTENT);
    await act(async () => {
      window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT));
    });

    await waitFor(() => expect(screen.getByText(SECRET_3)).toBeInTheDocument());
    expect(lockedStops(container)).toHaveLength(0);
  });
});
