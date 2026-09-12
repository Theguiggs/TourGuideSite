/**
 * LW-1 — la source d'URLs : fraîcheur, mode bouchons, et la relance unique
 * quand l'identité change pendant qu'une réponse est en vol.
 * LW-2 — la décision de renouvellement à une frontière de piste (validité
 * minimale) et la couverture gardée pour la Media Session.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import {
  computeExpiresAt,
  computeExpiry,
  DEFAULT_TTL_MS,
  EXPIRY_MARGIN_MS,
  STALE_FALLBACK_TTL_MS,
  isStale,
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

function response(
  urls: Record<string, string>,
  extra: { mediaExpiresAt?: string; coverUrl?: string } = {},
) {
  return {
    ok: true as const,
    data: {
      tourId: 'tour-1',
      walkPath: [],
      ...(extra.mediaExpiresAt ? { mediaExpiresAt: extra.mediaExpiresAt } : {}),
      ...(extra.coverUrl ? { coverUrl: extra.coverUrl } : {}),
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

/** Une échéance réelle, à `minutes` d'ici. */
const expiryIn = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

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

describe('computeExpiry — d’où vient l’échéance', () => {
  const now = 1_700_000_000_000;

  it('`mediaExpiresAt` lointain : échéance réelle', () => {
    expect(computeExpiry(new Date(now + 15 * 60_000).toISOString(), now)).toEqual({
      expiresAt: now + 15 * 60_000 - EXPIRY_MARGIN_MS,
      fromResponse: true,
    });
  });

  it('absent, illisible, ou déjà sous la marge : repli local, jamais une échéance réelle', () => {
    expect(computeExpiry(undefined, now).fromResponse).toBe(false);
    expect(computeExpiry('pas une date', now).fromResponse).toBe(false);
    expect(computeExpiry(new Date(now + 10_000).toISOString(), now)).toEqual({
      expiresAt: now + STALE_FALLBACK_TTL_MS,
      fromResponse: false,
    });
  });
});

describe('isStale — décision de renouvellement (LW-2)', () => {
  const now = 1_700_000_000_000;

  it('sans minimum : périmé seulement une fois l’échéance atteinte (LW-1 inchangé)', () => {
    expect(isStale(now + 1, now)).toBe(false);
    expect(isStale(now, now)).toBe(true);
    expect(isStale(now - 1, now)).toBe(true);
  });

  it('avec minimum, sur une échéance réelle : périmé si la validité restante est sous le minimum', () => {
    const fiveMinutes = 5 * 60_000;
    expect(isStale(now + fiveMinutes + 1, now, fiveMinutes)).toBe(false);
    expect(isStale(now + fiveMinutes, now, fiveMinutes)).toBe(false);
    expect(isStale(now + fiveMinutes - 1, now, fiveMinutes)).toBe(true);
    expect(isStale(now + 2 * 60_000, now, fiveMinutes)).toBe(true);
  });

  it('un repli local ne périme QUE par son échéance : sinon chaque frontière redemanderait', () => {
    const fiveMinutes = 5 * 60_000;
    // 10 min (défaut) et 60 s (repli court) sont tous deux sous les 5 min
    // exigées à une frontière : les y opposer ferait redemander à chaque piste.
    expect(isStale(now + 10 * 60_000, now, fiveMinutes, false)).toBe(false);
    expect(isStale(now + 60_000, now, fiveMinutes, false)).toBe(false);
    // Mais l'échéance, elle, s'applique toujours.
    expect(isStale(now - 1, now, fiveMinutes, false)).toBe(true);
  });

  it('échéance passée : périmé quel que soit le minimum', () => {
    expect(isStale(now - 1, now, 0)).toBe(true);
    expect(isStale(now - 1, now, 60_000)).toBe(true);
  });
});

describe('useSceneAudio', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stubs = false;
    authState = { isAuthenticated: false, user: null };
  });

  it('ensureFresh({ minValidityMs }) : redemande quand la validité restante est trop courte, pas sinon', async () => {
    mockGetPublishedTourContent
      .mockResolvedValueOnce(
        response(
          { s1: 'https://media.example/a' },
          { mediaExpiresAt: expiryIn(4), coverUrl: 'https://media.example/cover.jpg' },
        ),
      )
      .mockResolvedValueOnce(
        response({ s1: 'https://media.example/b' }, { mediaExpiresAt: expiryIn(40) }),
      );
    const { result } = renderHook(() => useSceneAudio('tour-1'));

    const first = await result.current.ensureFresh();
    expect(first).toEqual({ urls: { s1: 'https://media.example/a' }, outcome: 'requested' });
    expect(result.current.readCoverUrl()).toBe('https://media.example/cover.jpg');

    // 3 min 30 de validité restante : assez pour un clic…
    const click = await result.current.ensureFresh();
    expect(click.outcome).toBe('cached');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);

    // …pas pour une narration enchaînée : redemande.
    const boundary = await result.current.ensureFresh({ minValidityMs: 5 * 60_000 });
    expect(boundary).toEqual({ urls: { s1: 'https://media.example/b' }, outcome: 'refreshed' });
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
    // La couverture ne change pas d'une réponse à l'autre : une réponse qui ne
    // la porte pas ne l'a pas retirée, et l'écran verrouillé garde son image.
    expect(result.current.readCoverUrl()).toBe('https://media.example/cover.jpg');
  });

  it('une échéance de repli ne fait pas redemander, même sous le minimum exigé', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: 'https://media.example/a' }));
    const { result } = renderHook(() => useSceneAudio('tour-1'));

    await result.current.ensureFresh();
    const boundary = await result.current.ensureFresh({ minValidityMs: 5 * 60_000 });

    expect(boundary.outcome).toBe('cached');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
  });

  it('redemande en échec sur un cache encore valide : on rend le cache, pas « rien »', async () => {
    mockGetPublishedTourContent
      .mockResolvedValueOnce(
        response({ s1: 'https://media.example/a' }, { mediaExpiresAt: expiryIn(4) }),
      )
      .mockResolvedValueOnce({ ok: false, error: 'réseau' });
    const { result } = renderHook(() => useSceneAudio('tour-1'));
    await result.current.ensureFresh();

    const boundary = await result.current.ensureFresh({ minValidityMs: 5 * 60_000 });

    expect(boundary).toEqual({ urls: { s1: 'https://media.example/a' }, outcome: 'refreshed' });
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
  });

  it('redemande en échec sur un cache périmé : « rien », le repli ne ressuscite pas une URL morte', async () => {
    const nowSpy = jest.spyOn(Date, 'now');
    const base = Date.now();
    nowSpy.mockReturnValue(base);
    mockGetPublishedTourContent
      .mockResolvedValueOnce(
        response({ s1: 'https://media.example/a' }, { mediaExpiresAt: expiryIn(15) }),
      )
      .mockResolvedValueOnce({ ok: false, error: 'réseau' });
    const { result } = renderHook(() => useSceneAudio('tour-1'));
    await result.current.ensureFresh();

    // Seize minutes plus tard, la signature est morte pour de bon.
    nowSpy.mockReturnValue(base + 16 * 60_000);
    const later = await result.current.ensureFresh();

    expect(later).toEqual({ urls: null, outcome: 'refreshed' });
    nowSpy.mockRestore();
  });

  it('readCoverUrl : rien avant la première réponse', () => {
    const { result } = renderHook(() => useSceneAudio('tour-1'));
    expect(result.current.readCoverUrl()).toBeUndefined();
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
