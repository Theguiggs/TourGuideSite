/**
 * LW-2 — la Media Session est facultative, et chacune de ses pièces peut
 * manquer ou refuser : l'API absente (jsdom, navigateurs anciens), une action
 * inconnue du moteur, un `metadata` qui lève, `setPositionState` absent. Aucun
 * de ces cas ne doit remonter jusqu'au lecteur — au pire, l'écran verrouillé
 * est muet.
 */

import {
  applyMediaSession,
  bindMediaSessionActions,
  clearMediaSession,
  setMediaSessionPlaybackState,
  setMediaSessionPosition,
  SEEK_OFFSET_SECONDS,
} from '../media-session';

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

type Handler = ((details: MediaSessionActionDetails) => void) | null;

function install(value: unknown): void {
  Object.defineProperty(navigator, 'mediaSession', { configurable: true, value });
}

function uninstall(): void {
  delete (navigator as unknown as Record<string, unknown>).mediaSession;
}

/** Session complaisante : elle accepte tout et retient tout. */
function workingSession() {
  const handlers: Record<string, Handler> = {};
  return {
    metadata: null as unknown,
    playbackState: 'none',
    handlers,
    setActionHandler: jest.fn((action: string, handler: Handler) => {
      handlers[action] = handler;
    }),
    setPositionState: jest.fn(),
  };
}

const NOOP = () => {};

afterEach(() => {
  uninstall();
  delete (globalThis as unknown as Record<string, unknown>).MediaMetadata;
  jest.clearAllMocks();
});

describe('media-session — sans Media Session (jsdom, navigateurs anciens)', () => {
  it('chaque fonction est sans effet, et le retrait ne lève pas', () => {
    expect(() => applyMediaSession({ title: 'Étape', artist: 'Visite' })).not.toThrow();
    expect(() => setMediaSessionPlaybackState('playing')).not.toThrow();
    expect(() => setMediaSessionPosition({ duration: 10, position: 1 })).not.toThrow();
    expect(() => clearMediaSession()).not.toThrow();
    const unbind = bindMediaSessionActions({ play: NOOP });
    expect(typeof unbind).toBe('function');
    expect(() => unbind()).not.toThrow();
  });

  it('un `navigator.mediaSession` nul ne passe pas pour une session', () => {
    install(null);
    expect(() => applyMediaSession({ title: 'Étape', artist: 'Visite' })).not.toThrow();
  });
});

describe('media-session — métadonnées', () => {
  it('branche de production : `new MediaMetadata(...)` quand la classe existe', () => {
    class FakeMediaMetadata {
      title?: string;
      artist?: string;
      album?: string;
      artwork?: { src: string }[];
      constructor(init: Record<string, unknown>) {
        Object.assign(this, init);
      }
    }
    (globalThis as unknown as Record<string, unknown>).MediaMetadata = FakeMediaMetadata;
    const session = workingSession();
    install(session);

    applyMediaSession({
      title: 'Le phare',
      artist: 'Le Caprice',
      artwork: 'https://media.example/cover.jpg',
    });

    // C'est bien l'objet du navigateur, pas le repli : une régression qui
    // casserait `new MediaMetadata(...)` passerait inaperçue sans cette assertion.
    expect(session.metadata).toBeInstanceOf(FakeMediaMetadata);
    expect(session.metadata).toMatchObject({
      title: 'Le phare',
      artist: 'Le Caprice',
      album: 'Le Caprice',
      artwork: [{ src: 'https://media.example/cover.jpg' }],
    });
  });

  it('sans couverture, la liste d’artwork est vide (et non une entrée sans source)', () => {
    const session = workingSession();
    install(session);

    applyMediaSession({ title: 'Le phare', artist: 'Le Caprice' });

    expect(session.metadata).toMatchObject({ title: 'Le phare', artwork: [] });
  });

  it('un `metadata` qui lève ne remonte pas', () => {
    const session = {
      set metadata(_value: unknown) {
        throw new Error('refusé');
      },
      get metadata() {
        return null;
      },
      playbackState: 'none',
      setActionHandler: jest.fn(),
    };
    install(session);

    expect(() => applyMediaSession({ title: 'Étape', artist: 'Visite' })).not.toThrow();
  });

  it('un `playbackState` qui lève ne remonte pas', () => {
    const session = {
      metadata: null,
      set playbackState(_value: string) {
        throw new Error('refusé');
      },
      get playbackState() {
        return 'none';
      },
      setActionHandler: jest.fn(),
    };
    install(session);

    expect(() => setMediaSessionPlaybackState('playing')).not.toThrow();
    expect(() => clearMediaSession()).not.toThrow();
  });
});

describe('media-session — position', () => {
  it('durée connue : position bornée à la durée, cadence par défaut à 1', () => {
    const session = workingSession();
    install(session);

    setMediaSessionPosition({ duration: 90, position: 120 });
    expect(session.setPositionState).toHaveBeenCalledWith({
      duration: 90,
      position: 90,
      playbackRate: 1,
    });

    setMediaSessionPosition({ duration: 90, position: -5, playbackRate: 2 });
    expect(session.setPositionState).toHaveBeenLastCalledWith({
      duration: 90,
      position: 0,
      playbackRate: 2,
    });
  });

  it('durée inconnue (avant `loadedmetadata`) : l’état est effacé, pas inventé', () => {
    const session = workingSession();
    install(session);

    setMediaSessionPosition({ duration: Number.NaN, position: 12 });
    setMediaSessionPosition({ duration: 0, position: 0 });

    expect(session.setPositionState).toHaveBeenCalledTimes(2);
    expect(session.setPositionState).toHaveBeenNthCalledWith(1);
    expect(session.setPositionState).toHaveBeenNthCalledWith(2);
  });

  it('`setPositionState` absent (navigateur ancien) ou qui lève : sans effet', () => {
    install({ metadata: null, playbackState: 'none', setActionHandler: jest.fn() });
    expect(() => setMediaSessionPosition({ duration: 10, position: 1 })).not.toThrow();

    install({
      metadata: null,
      playbackState: 'none',
      setActionHandler: jest.fn(),
      setPositionState: () => {
        throw new Error('refusé');
      },
    });
    expect(() => setMediaSessionPosition({ duration: 10, position: 1 })).not.toThrow();
    expect(() => clearMediaSession()).not.toThrow();
  });
});

describe('media-session — actions', () => {
  it('une action refusée n’empêche pas les autres, et le retrait ne libère que ce qui a été lié', () => {
    const handlers: Record<string, Handler> = {};
    const released: string[] = [];
    const session = {
      metadata: null,
      playbackState: 'none',
      setActionHandler: jest.fn((action: string, handler: Handler) => {
        // Un moteur ancien ne connaît pas `seekto`.
        if (action === 'seekto') throw new TypeError('unsupported action');
        if (handler === null) released.push(action);
        else handlers[action] = handler;
      }),
    };
    install(session);

    const play = jest.fn();
    const next = jest.fn();
    const unbind = bindMediaSessionActions({
      play,
      seekto: jest.fn(),
      nexttrack: next,
    });

    // Le montage n'a pas cassé : les deux autres actions sont bien posées.
    expect(Object.keys(handlers).sort()).toEqual(['nexttrack', 'play']);
    handlers.play?.({ action: 'play' });
    handlers.nexttrack?.({ action: 'nexttrack' });
    expect(play).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);

    unbind();
    // `seekto` n'a jamais été liée : on ne la libère pas.
    expect(released.sort()).toEqual(['nexttrack', 'play']);
  });

  it('une action sans gestionnaire n’est pas posée', () => {
    const session = workingSession();
    install(session);

    bindMediaSessionActions({ play: NOOP, pause: undefined });

    expect(session.setActionHandler).toHaveBeenCalledTimes(1);
    expect(session.setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
  });

  it('un retrait qui lève ne remonte pas', () => {
    let binding = true;
    install({
      metadata: null,
      playbackState: 'none',
      setActionHandler: jest.fn(() => {
        if (!binding) throw new Error('refusé');
      }),
    });
    const unbind = bindMediaSessionActions({ play: NOOP });
    binding = false;

    expect(() => unbind()).not.toThrow();
  });

  it('le saut par défaut des écouteurs est de dix secondes', () => {
    expect(SEEK_OFFSET_SECONDS).toBe(10);
  });
});
