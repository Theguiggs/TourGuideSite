/**
 * LW-1 — le lecteur de scène : un seul `<audio>`, une seule scène à la fois,
 * une seule redemande par tentative.
 *
 * jsdom n'implémente ni `play()`, ni `pause()`, ni `load()` (et `duration` /
 * `error` ne sont pas modifiables) : on les stubbe sur le prototype, et on les
 * restaure à la fin. Les événements média (`error`, `ended`, `timeupdate`)
 * sont émis à la main sur l'élément.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ScenePlayer, SceneListenControl } from '..';

jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));

const mockGetPublishedTourContent = jest.fn();
jest.mock('@/lib/api/appsync-client', () => ({
  getPublishedTourContent: (...a: unknown[]) => mockGetPublishedTourContent(...a),
}));

jest.mock('@/config/api-mode', () => ({ shouldUseStubs: () => false }));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const URL_S1 = 'https://media.example/s1.mp3?sig=one';
const URL_S2 = 'https://media.example/s2.mp3?sig=one';
const URL_S1_RENEWED = 'https://media.example/s1.mp3?sig=two';
const URL_S2_RENEWED = 'https://media.example/s2.mp3?sig=two';

const MEDIA_ERR_ABORTED = 1;
const MEDIA_ERR_NETWORK = 2;
const MEDIA_ERR_DECODE = 3;

function response(urls: Record<string, string | undefined>, mediaExpiresAt?: string) {
  return {
    ok: true as const,
    data: {
      tourId: 'tour-1',
      walkPath: [],
      scenes: Object.entries(urls).map(([id, audioUrl], index) => ({
        id,
        order: index,
        title: `Scène ${id}`,
        description: '',
        photos: [],
        ...(audioUrl ? { audioKey: `k-${id}`, audioUrl } : {}),
      })),
      ...(mediaExpiresAt ? { mediaExpiresAt } : {}),
    },
  };
}

const BASE_NOW = Date.now();
const iso = (offsetMs: number) => new Date(BASE_NOW + offsetMs).toISOString();
const FRESH = iso(15 * 60_000);

const playSpy = jest.fn<Promise<void>, []>();
const pauseSpy = jest.fn<void, []>();
const loadSpy = jest.fn<void, []>();
let fakeDuration = NaN;
let fakeError: { code: number } | null = null;
let nowSpy: jest.SpyInstance<number, []> | null = null;

const STUBBED = ['play', 'pause', 'load', 'duration', 'error'] as const;
const originals = Object.fromEntries(
  STUBBED.map((name) => [name, Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, name)]),
);

beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: playSpy });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pauseSpy });
  Object.defineProperty(HTMLMediaElement.prototype, 'load', { configurable: true, value: loadSpy });
  Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
    configurable: true,
    get: () => fakeDuration,
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'error', {
    configurable: true,
    get: () => fakeError,
  });
});

afterAll(() => {
  for (const name of STUBBED) {
    const descriptor = originals[name];
    if (descriptor) Object.defineProperty(HTMLMediaElement.prototype, name, descriptor);
    else delete (HTMLMediaElement.prototype as unknown as Record<string, unknown>)[name];
  }
});

function Harness({ tourId = 'tour-1', ids = ['s1', 's2'] }: { tourId?: string; ids?: string[] }) {
  return (
    <ScenePlayer tourId={tourId} locale="fr">
      <ol>
        {ids.map((id) => (
          <li key={id}>
            <SceneListenControl sceneId={id} title={`Scène ${id}`} />
          </li>
        ))}
      </ol>
    </ScenePlayer>
  );
}

function audio(): HTMLAudioElement {
  return screen.getByTestId('scene-audio') as HTMLAudioElement;
}

function button(id: string): HTMLButtonElement {
  return screen.getByTestId(`scene-listen-button-${id}`) as HTMLButtonElement;
}

async function click(id: string) {
  fireEvent.click(button(id));
  await act(async () => {});
}

function emit(name: string) {
  return act(async () => {
    audio().dispatchEvent(new Event(name));
  });
}

function rejection(name: string) {
  return Object.assign(new Error(name), { name });
}

const UNAVAILABLE = 'Audio momentanément indisponible';

describe('ScenePlayer — LW-1', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playSpy.mockResolvedValue(undefined);
    fakeDuration = NaN;
    fakeError = null;
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1, s2: URL_S2 }, FRESH));
  });

  afterEach(() => {
    nowSpy?.mockRestore();
    nowSpy = null;
  });

  it('premier clic : exactement une requête, src posée, lecture, bouton Pause', async () => {
    render(<Harness />);

    expect(button('s1')).toHaveTextContent('Écouter');
    expect(audio().getAttribute('src')).toBeNull();

    await click('s1');

    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    expect(mockGetPublishedTourContent).toHaveBeenCalledWith('tour-1');
    expect(audio().getAttribute('src')).toBe(URL_S1);
    expect(playSpy).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(button('s1')).not.toHaveAttribute('aria-pressed');
    expect(button('s1')).not.toHaveAttribute('aria-busy');
    expect(button('s1')).toHaveAttribute('aria-label', 'Mettre en pause « Scène s1 »');
    expect(screen.getByTestId('scene-time-s1')).toHaveTextContent('0:00 / 0:00');
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('pendant la demande : « Chargement… », aria-busy, et un second clic n’empile rien', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    mockGetPublishedTourContent.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    render(<Harness />);

    fireEvent.click(button('s1'));
    fireEvent.click(button('s1'));
    await act(async () => {});

    expect(button('s1')).toHaveTextContent('Chargement…');
    expect(button('s1')).toHaveAttribute('aria-busy', 'true');
    expect(button('s1')).toHaveAttribute('aria-label', 'Chargement…');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst(response({ s1: URL_S1, s2: URL_S2 }, FRESH));
    });
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('pause puis reprise : même position, aucune nouvelle requête', async () => {
    render(<Harness />);
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    audio().currentTime = 37;

    await click('s1');
    expect(pauseSpy).toHaveBeenCalled();
    expect(button('s1')).toHaveTextContent('Écouter');

    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(playSpy).toHaveBeenCalledTimes(2);
    expect(audio().currentTime).toBe(37);
    expect(audio().getAttribute('src')).toBe(URL_S1);
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
  });

  it('reprise cliquée plusieurs fois avant que play() ne se résolve : un seul play()', async () => {
    render(<Harness />);
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    await click('s1');
    expect(button('s1')).toHaveTextContent('Écouter');

    let resolvePlay: () => void = () => {};
    playSpy.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolvePlay = resolve;
      }),
    );
    fireEvent.click(button('s1'));
    fireEvent.click(button('s1'));
    fireEvent.click(button('s1'));
    await act(async () => {});
    expect(playSpy).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolvePlay();
    });
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it("exclusivité : l'autre étape arrête la précédente, l'élément <audio> reste le même nœud", async () => {
    render(<Harness />);
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    const node = audio();
    node.currentTime = 12;

    await click('s2');

    expect(audio()).toBe(node);
    expect(pauseSpy).toHaveBeenCalled();
    expect(audio().getAttribute('src')).toBe(URL_S2);
    // `src` change → le navigateur repart de 0 ; on l'exige aussi explicitement.
    expect(audio().currentTime).toBe(0);
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));
    expect(button('s1')).toHaveTextContent('Écouter');
    // Deux scènes, une seule requête : les URLs de la réponse servent la liste.
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('scene-time-s1')).not.toBeInTheDocument();
    expect(screen.getByTestId('scene-time-s2')).toBeInTheDocument();
  });

  it('deux clics avant la première réponse : une seule requête, la dernière scène joue', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    mockGetPublishedTourContent.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    render(<Harness />);

    fireEvent.click(button('s1'));
    fireEvent.click(button('s2'));
    await act(async () => {});
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFirst(response({ s1: URL_S1, s2: URL_S2 }, FRESH));
    });

    expect(audio().getAttribute('src')).toBe(URL_S2);
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));
    expect(button('s1')).toHaveTextContent('Écouter');
    // La tentative s1, dépassée, n'a rien lancé.
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('URL expirée au clic : une redemande, puis lecture ; une erreur ensuite → message, pas de nouvelle redemande', async () => {
    mockGetPublishedTourContent
      .mockResolvedValueOnce(response({ s1: URL_S1, s2: URL_S2 }, iso(15 * 60_000)))
      .mockResolvedValueOnce(response({ s1: URL_S1_RENEWED, s2: URL_S2_RENEWED }, iso(40 * 60_000)));
    render(<Harness />);

    await click('s1');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    expect(audio().getAttribute('src')).toBe(URL_S1);

    // Seize minutes plus tard, la signature de 15 min est morte : le clic
    // suivant redemande avant de lancer.
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(BASE_NOW + 16 * 60_000);
    await click('s2');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
    expect(audio().getAttribute('src')).toBe(URL_S2_RENEWED);
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));

    // La redemande de cette tentative est consommée : l'erreur média affiche.
    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    await waitFor(() =>
      expect(screen.getByTestId('scene-error-s2')).toHaveTextContent(UNAVAILABLE),
    );
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
    expect(button('s2')).toHaveTextContent('Écouter');
  });

  it('mediaExpiresAt dans 10 s (sous la marge) : repli court, pas de redemande à chaque clic', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1, s2: URL_S2 }, iso(10_000)));
    render(<Harness />);

    await click('s1');
    await click('s2');
    // Sans le repli, chaque clic redemanderait et brûlerait la relance de sa tentative.
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);

    // Passé le repli (60 s), la source est bien tenue pour périmée.
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(BASE_NOW + 61_000);
    await click('s1');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
  });

  it('erreur média réseau en cours de piste : une redemande, src renouvelée, reprise à la position ; seconde erreur → message', async () => {
    mockGetPublishedTourContent
      .mockResolvedValueOnce(response({ s1: URL_S1, s2: URL_S2 }, FRESH))
      .mockResolvedValueOnce(response({ s1: URL_S1_RENEWED, s2: URL_S2_RENEWED }, FRESH));
    render(<Harness />);

    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    audio().currentTime = 42;

    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');

    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S1_RENEWED));
    expect(audio().currentTime).toBe(42);
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('scene-error-s1')).not.toBeInTheDocument();

    await emit('error');

    await waitFor(() =>
      expect(screen.getByTestId('scene-error-s1')).toHaveTextContent(UNAVAILABLE),
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    // Jamais de boucle : deux requêtes, pas une de plus.
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it('MEDIA_ERR_ABORTED : ni relance, ni message', async () => {
    render(<Harness />);
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));

    fakeError = { code: MEDIA_ERR_ABORTED };
    await emit('error');
    await act(async () => {});

    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(button('s1')).toHaveTextContent('Pause');

    // La relance de la tentative n'a pas été consommée : une erreur réseau y a droit.
    mockGetPublishedTourContent.mockResolvedValueOnce(
      response({ s1: URL_S1_RENEWED, s2: URL_S2_RENEWED }, FRESH),
    );
    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S1_RENEWED));
  });

  it('MEDIA_ERR_DECODE : message direct, sans relance', async () => {
    render(<Harness />);
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));

    fakeError = { code: MEDIA_ERR_DECODE };
    await emit('error');

    await waitFor(() => expect(screen.getByTestId('scene-error-s1')).toHaveTextContent(UNAVAILABLE));
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
  });

  it('pause pendant la relance : source et position posées, pas de reprise automatique', async () => {
    let resolveSecond: (value: unknown) => void = () => {};
    mockGetPublishedTourContent
      .mockResolvedValueOnce(response({ s1: URL_S1, s2: URL_S2 }, FRESH))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
      );
    render(<Harness />);
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    audio().currentTime = 20;

    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    expect(button('s1')).toHaveTextContent('Chargement…');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);

    // L'utilisateur met en pause pendant que la relance est en vol.
    await click('s1');

    await act(async () => {
      resolveSecond(response({ s1: URL_S1_RENEWED, s2: URL_S2_RENEWED }, FRESH));
    });

    expect(audio().getAttribute('src')).toBe(URL_S1_RENEWED);
    expect(audio().currentTime).toBe(20);
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(button('s1')).toHaveTextContent('Écouter');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // La reprise est un clic, à la même position.
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(playSpy).toHaveBeenCalledTimes(2);
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
  });

  it('play() refusé (NotAllowedError) : message « touchez à nouveau », le clic suivant relance', async () => {
    playSpy.mockRejectedValueOnce(rejection('NotAllowedError'));
    render(<Harness />);

    await click('s1');

    expect(screen.getByTestId('scene-error-s1')).toHaveTextContent(
      "Touchez à nouveau pour lancer l'écoute",
    );
    expect(button('s1')).toHaveTextContent('Écouter');
    expect(button('s1')).not.toHaveAttribute('aria-busy');

    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(playSpy).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('scene-error-s1')).not.toBeInTheDocument();
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
  });

  it('play() interrompu (AbortError) : rien à afficher', async () => {
    playSpy.mockRejectedValueOnce(rejection('AbortError'));
    render(<Harness />);

    await click('s1');

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(button('s1')).toHaveTextContent('Écouter');
    expect(button('s1')).not.toHaveAttribute('aria-busy');
  });

  it('réponse sans URL pour la scène demandée : message, pas de redemande', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1, s2: undefined }, FRESH));
    render(<Harness />);

    await click('s2');

    expect(screen.getByTestId('scene-error-s2')).toHaveTextContent(UNAVAILABLE);
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    expect(playSpy).not.toHaveBeenCalled();
    expect(audio().getAttribute('src')).toBeNull();
    // Le message est propre à l'étape : l'autre n'en porte pas.
    expect(screen.queryByTestId('scene-error-s1')).not.toBeInTheDocument();
  });

  it("requête refusée : message sous l'étape, la liste reste intacte", async () => {
    mockGetPublishedTourContent.mockResolvedValue({ ok: false, error: 'Contenu public indisponible' });
    render(<Harness />);

    await click('s1');

    expect(screen.getByTestId('scene-error-s1')).toHaveTextContent(UNAVAILABLE);
    expect(button('s1')).toBeInTheDocument();
    expect(button('s2')).toBeInTheDocument();
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('requête qui lève : message, sans casser la liste', async () => {
    mockGetPublishedTourContent.mockRejectedValue(new Error('network'));
    render(<Harness />);

    await click('s1');

    expect(screen.getByTestId('scene-error-s1')).toBeInTheDocument();
    expect(button('s2')).toBeInTheDocument();
  });

  it('un nouveau clic après un échec ouvre une nouvelle tentative', async () => {
    mockGetPublishedTourContent
      .mockResolvedValueOnce({ ok: false, error: 'Contenu public indisponible' })
      .mockResolvedValueOnce(response({ s1: URL_S1, s2: URL_S2 }, FRESH));
    render(<Harness />);

    await click('s1');
    expect(screen.getByTestId('scene-error-s1')).toBeInTheDocument();

    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(screen.queryByTestId('scene-error-s1')).not.toBeInTheDocument();
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
  });

  it('fin de piste : le bouton repasse à Écouter, la position à zéro, sans enchaînement', async () => {
    render(<Harness />);
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));

    await emit('ended');

    expect(button('s1')).toHaveTextContent('Écouter');
    expect(screen.getByTestId('scene-time-s1')).toHaveTextContent('0:00 /');
    // LW-2 apportera l'enchaînement : ici, rien ne part tout seul.
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(audio().getAttribute('src')).toBe(URL_S1);
  });

  it("temps et glissière suivent la piste ; l'élément n'est déplacé qu'au relâchement", async () => {
    render(<Harness />);
    await click('s1');
    fakeDuration = 95;
    await emit('loadedmetadata');
    audio().currentTime = 61.4;
    await emit('timeupdate');

    expect(screen.getByTestId('scene-time-s1')).toHaveTextContent('1:01 / 1:35');
    const slider = screen.getByRole('slider') as HTMLInputElement;
    expect(slider).toHaveAttribute('max', '95');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).not.toBeDisabled();

    // Pendant le glissement : affichage local, l'élément ne bouge pas.
    fireEvent.change(slider, { target: { value: '30' } });
    expect(audio().currentTime).toBe(61.4);
    expect(screen.getByTestId('scene-time-s1')).toHaveTextContent('0:30 / 1:35');

    // Au relâchement : l'élément est déplacé.
    fireEvent.pointerUp(slider);
    expect(audio().currentTime).toBe(30);
    expect(screen.getByTestId('scene-time-s1')).toHaveTextContent('0:30 / 1:35');

    // Au clavier aussi.
    fireEvent.change(slider, { target: { value: '31' } });
    fireEvent.keyUp(slider, { key: 'ArrowRight' });
    expect(audio().currentTime).toBe(31);
  });

  it('sans mediaExpiresAt, la réponse est tenue pour fraîche : pas de redemande au clic suivant', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1, s2: URL_S2 }));
    render(<Harness />);
    await click('s1');
    await click('s2');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    expect(audio().getAttribute('src')).toBe(URL_S2);
  });

  it('libellés en anglais', async () => {
    playSpy.mockRejectedValueOnce(rejection('NotAllowedError'));
    render(
      <ScenePlayer tourId="tour-1" locale="en">
        <SceneListenControl sceneId="s1" title="Stop one" />
      </ScenePlayer>,
    );
    expect(button('s1')).toHaveTextContent('Listen');
    expect(button('s1')).toHaveAttribute('aria-label', 'Listen to “Stop one”');
    await click('s1');
    expect(screen.getByTestId('scene-error-s1')).toHaveTextContent('Tap again to start playback');
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
  });

  it("changement de visite : la piste s'arrête, le téléchargement est coupé, la source est oubliée", async () => {
    const view = render(<Harness tourId="tour-1" />);
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    const previousNode = audio();

    mockGetPublishedTourContent.mockResolvedValue({
      ...response({ s1: URL_S1_RENEWED }, FRESH),
      data: { ...response({ s1: URL_S1_RENEWED }, FRESH).data, tourId: 'tour-2' },
    });
    view.rerender(<Harness tourId="tour-2" ids={['s1']} />);
    await act(async () => {});

    expect(pauseSpy).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalled();
    expect(previousNode.getAttribute('src')).toBeNull();
    expect(button('s1')).toHaveTextContent('Écouter');
    expect(audio().getAttribute('src')).toBeNull();

    // La nouvelle visite redemande : rien de l'ancienne ne sert.
    await click('s1');
    expect(mockGetPublishedTourContent).toHaveBeenLastCalledWith('tour-2');
    expect(audio().getAttribute('src')).toBe(URL_S1_RENEWED);
  });

  it('le contrôle de la scène en cours disparaît : la lecture s’arrête', async () => {
    const view = render(<Harness ids={['s1', 's2']} />);
    await click('s2');
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));
    pauseSpy.mockClear();

    view.rerender(<Harness ids={['s1']} />);
    await act(async () => {});

    expect(pauseSpy).toHaveBeenCalled();
    expect(audio().getAttribute('src')).toBeNull();
    expect(screen.queryByTestId('scene-listen-button-s2')).not.toBeInTheDocument();
    expect(button('s1')).toHaveTextContent('Écouter');
  });

  it("hors <ScenePlayer>, le contrôle ne rend rien", () => {
    const { container } = render(<SceneListenControl sceneId="s1" title="Seule" />);
    expect(container).toBeEmptyDOMElement();
  });
});
