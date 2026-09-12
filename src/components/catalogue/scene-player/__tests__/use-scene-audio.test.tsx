/**
 * LW-1 — la source d'URLs : fraîcheur, mode bouchons, et la relance unique
 * quand l'identité change pendant qu'une réponse est en vol.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import {
  computeExpiresAt,
  DEFAULT_TTL_MS,
  EXPIRY_MARGIN_MS,
  STALE_FALLBACK_TTL_MS,
  useSceneAudio,
} from '../use-scene-audio';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';

let authState = { isAuthenticated: false, user: null as { id: string } | null };
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => authState,
}));

const mockGetPublishedTourContent = jest.fn();
jest.mock('@/lib/api/appsync-client', () => ({
  getPublishedTourContent: (...a: unknown[]) => mockGetPublishedTourContent(...a),
}));

let stubs = false;
jest.mock('@/config/api-mode', () => ({ shouldUseStubs: () => stubs }));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

function response(urls: Record<string, string>) {
  return {
    ok: true as const,
    data: {
      tourId: 'tour-1',
      walkPath: [],
      scenes: Object.entries(urls).map(([id, audioUrl], index) => ({
        id,
        order: index,
        title: id,
        description: '',
        photos: [],
        audioKey: `k-${id}`,
        audioUrl,
      })),
    },
  };
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('computeExpiresAt', () => {
  const now = 1_700_000_000_000;

  it('ISO valide et lointain : la date moins la marge', () => {
    const at = new Date(now + 15 * 60_000).toISOString();
    expect(computeExpiresAt(at, now)).toBe(now + 15 * 60_000 - EXPIRY_MARGIN_MS);
  });

  it('absent ou illisible : maintenant plus la durée par défaut', () => {
    expect(computeExpiresAt(undefined, now)).toBe(now + DEFAULT_TTL_MS);
    expect(computeExpiresAt('pas une date', now)).toBe(now + DEFAULT_TTL_MS);
  });

  it('déjà passé, ou sous la marge : repli court, jamais une valeur déjà périmée', () => {
    expect(computeExpiresAt(new Date(now - 1_000).toISOString(), now)).toBe(
      now + STALE_FALLBACK_TTL_MS,
    );
    expect(computeExpiresAt(new Date(now + 10_000).toISOString(), now)).toBe(
      now + STALE_FALLBACK_TTL_MS,
    );
    expect(computeExpiresAt(new Date(now + EXPIRY_MARGIN_MS).toISOString(), now)).toBe(
      now + STALE_FALLBACK_TTL_MS,
    );
    expect(STALE_FALLBACK_TTL_MS).toBeLessThanOrEqual(60_000);
  });
});

describe('useSceneAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stubs = false;
    authState = { isAuthenticated: false, user: null };
  });

  it('mode bouchons : aucune requête, réponse « rien »', async () => {
    stubs = true;
    const { result } = renderHook(() => useSceneAudio('tour-1'));

    const outcome = await result.current.ensureFresh();

    expect(outcome).toEqual({ urls: null, outcome: 'requested' });
    expect(mockGetPublishedTourContent).not.toHaveBeenCalled();
  });

  it("identité changée pendant le vol : la réponse est jetée, une relance sur la génération courante", async () => {
    const first = deferred<unknown>();
    mockGetPublishedTourContent
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(response({ s1: 'https://media.example/s1.mp3?sig=buyer' }));
    const { result, rerender } = renderHook(() => useSceneAudio('tour-1'));

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.ensureFresh();
    });
    // L'import dynamique d'AppSync précède l'appel : il est asynchrone.
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1));

    // L'achat aboutit et la session se résout pendant que la première réponse voyage.
    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    await act(async () => {
      rerender();
      window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT));
    });

    let settled: unknown;
    await act(async () => {
      first.resolve(response({ s1: 'https://media.example/s1.mp3?sig=anonymous' }));
      settled = await pending;
    });

    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
    expect(settled).toEqual({
      urls: { s1: 'https://media.example/s1.mp3?sig=buyer' },
      outcome: 'requested',
    });
    // Le cache porte bien la réponse de la génération courante.
    const again = await result.current.ensureFresh();
    expect(again.outcome).toBe('cached');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
  });

  it('une seule relance : si la génération change encore, on rend « rien »', async () => {
    const first = deferred<unknown>();
    const second = deferred<unknown>();
    mockGetPublishedTourContent.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = renderHook(() => useSceneAudio('tour-1'));

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.ensureFresh();
    });

    authState = { isAuthenticated: true, user: { id: 'user-1' } };
    await act(async () => {
      rerender();
    });
    await act(async () => {
      first.resolve(response({ s1: 'https://media.example/a' }));
    });
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);

    await act(async () => {
      window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT));
    });
    let settled: unknown;
    await act(async () => {
      second.resolve(response({ s1: 'https://media.example/b' }));
      settled = await pending;
    });

    expect(settled).toEqual({ urls: null, outcome: 'requested' });
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
  });

  it('deux demandes pendant le même vol partagent la requête', async () => {
    const first = deferred<unknown>();
    mockGetPublishedTourContent.mockReturnValueOnce(first.promise);
    const { result } = renderHook(() => useSceneAudio('tour-1'));

    let a: Promise<unknown> = Promise.resolve();
    let b: Promise<unknown> = Promise.resolve();
    act(() => {
      a = result.current.ensureFresh();
      b = result.current.refetch();
    });
    await act(async () => {
      first.resolve(response({ s1: 'https://media.example/a' }));
      await Promise.all([a, b]);
    });

    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
  });
});
