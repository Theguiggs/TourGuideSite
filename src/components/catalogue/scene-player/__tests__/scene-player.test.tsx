/**
 * LW-1 — le lecteur de scène : un seul `<audio>`, une seule scène à la fois,
 * une seule redemande par tentative.
 * LW-2 — le mode visite : enchaînement sur `ended`, fin d'aperçu / de visite,
 * Media Session, reprise.
 *
 * jsdom n'implémente ni `play()`, ni `pause()`, ni `load()` (et `duration` /
 * `error` ne sont pas modifiables) : on les stubbe sur le prototype, et on les
 * restaure à la fin. Les événements média (`error`, `ended`, `timeupdate`)
 * sont émis à la main sur l'élément. `navigator.mediaSession` n'existe pas :
 * un faux objet enregistre les gestionnaires posés.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ScenePlayer, SceneListenControl, TourPlayControl } from '..';
// La reprise n'est pas une API du lecteur : les épreuves lisent son module.
import { resumeKey, clearAllResumes, RESUME_CLEAR_KEY, LANGUAGE_KEY_PREFIX, writeLanguageChoice } from '../resume-store';
import { trackEvent } from '@/lib/analytics';
import { PURCHASES_CHANGED_EVENT } from '@/lib/checkout/purchase-events';

jest.mock('@/lib/analytics', () => ({
  ...jest.requireActual('@/lib/analytics'),
  trackEvent: jest.fn(),
}));
import { logger } from '@/lib/logger';

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

function response(
  urls: Record<string, string | undefined>,
  mediaExpiresAt?: string,
  coverUrl?: string,
  translations: Record<string, Record<string, string>> = {},
) {
  return {
    ok: true as const,
    data: {
      tourId: 'tour-1',
      walkPath: [],
      ...(coverUrl ? { coverUrl } : {}),
      scenes: Object.entries(urls).map(([id, audioUrl], index) => ({
        id,
        order: index,
        title: `Scène ${id}`,
        description: '',
        photos: [],
        ...(audioUrl ? { audioKey: `k-${id}`, audioUrl } : {}),
        ...(translations[id] ? { translatedAudioUrls: translations[id] } : {}),
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

function Harness({
  tourId = 'tour-1',
  ids = ['s1', 's2'],
  lockedAfter = false,
  tourTitle = 'Visite test',
  settled = true,
  locale = 'fr',
  baseLanguage = 'fr',
}: {
  tourId?: string;
  ids?: string[];
  lockedAfter?: boolean;
  tourTitle?: string;
  settled?: boolean;
  locale?: 'fr' | 'en';
  baseLanguage?: string;
}) {
  // La liste jouable suit les contrôles rendus : même ordre, un numéro par étape.
  const playlist = ids.map((id, index) => ({ id, title: `Scène ${id}`, order: index + 1 }));
  return (
    <ScenePlayer
      tourId={tourId}
      locale={locale}
      cityId="grasse"
      audioLanguage={baseLanguage}
      languageAudioTypes={{ fr: 'recording', en: 'tts', de: 'mixed' }}
      playlistSettled={settled}
      playlist={playlist}
      lockedAfter={lockedAfter}
      tourTitle={tourTitle}
    >
      <TourPlayControl />
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

// La reprise (LW-2) s'écrit pendant la lecture : chaque épreuve part d'un
// stockage vide, sinon une pastille de l'épreuve précédente s'inviterait.
beforeEach(() => {
  window.localStorage.clear();
});

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
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(BASE_NOW);
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1, s2: URL_S2 }, iso(10_000)));
    render(<Harness />);

    await click('s1');
    await click('s2');
    // Sans le repli, chaque clic redemanderait et brûlerait la relance de sa tentative.
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);

    // Passé le repli (60 s), la source est bien tenue pour périmée.
    nowSpy.mockReturnValue(BASE_NOW + 61_000);
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
      'Touchez à nouveau pour lancer l’écoute',
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

// ─── LW-2 ────────────────────────────────────────────────────────────────────

type ActionHandler = ((details: MediaSessionActionDetails) => void) | null;

interface FakeMediaSession {
  metadata: { title?: string; artist?: string; artwork?: { src: string }[] } | null;
  playbackState: string;
  handlers: Record<string, ActionHandler>;
  setActionHandler: jest.Mock;
  setPositionState: jest.Mock;
}

/** Les cinq actions du spec, plus les deux sauts relatifs (LW-2, revue). */
const MEDIA_ACTIONS = [
  'nexttrack',
  'pause',
  'play',
  'previoustrack',
  'seekbackward',
  'seekforward',
  'seekto',
];

function installMediaSession(): FakeMediaSession {
  const handlers: Record<string, ActionHandler> = {};
  const fake: FakeMediaSession = {
    metadata: null,
    playbackState: 'none',
    handlers,
    setActionHandler: jest.fn((action: string, handler: ActionHandler) => {
      handlers[action] = handler;
    }),
    setPositionState: jest.fn(),
  };
  Object.defineProperty(navigator, 'mediaSession', { configurable: true, value: fake });
  return fake;
}

function uninstallMediaSession() {
  delete (navigator as unknown as Record<string, unknown>).mediaSession;
}

function action(fake: FakeMediaSession, name: string, details: Partial<MediaSessionActionDetails> = {}) {
  return act(async () => {
    fake.handlers[name]?.({ action: name as MediaSessionAction, ...details });
  });
}

function tourButton(): HTMLButtonElement {
  return screen.getByTestId('tour-play-button') as HTMLButtonElement;
}

async function clickTour() {
  fireEvent.click(tourButton());
  await act(async () => {});
}

function storedResume(tourId = 'tour-1'): { sceneId: string; position: number } | null {
  const raw = window.localStorage.getItem(resumeKey(tourId));
  if (raw === null) return null;
  const parsed = JSON.parse(raw) as { sceneId: string; position: number };
  return { sceneId: parsed.sceneId, position: parsed.position };
}

function storeResume(sceneId: string, position: number, tourId = 'tour-1') {
  window.localStorage.setItem(
    resumeKey(tourId),
    JSON.stringify({ sceneId, position, updatedAt: Date.now() }),
  );
}

const URL_S3 = 'https://media.example/s3.mp3?sig=one';
const URL_S4 = 'https://media.example/s4.mp3?sig=one';
const THREE = { s1: URL_S1, s2: URL_S2, s3: URL_S3 };

describe('ScenePlayer — LW-2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playSpy.mockResolvedValue(undefined);
    fakeDuration = NaN;
    fakeError = null;
    mockGetPublishedTourContent.mockResolvedValue(response(THREE, FRESH));
  });

  afterEach(() => {
    nowSpy?.mockRestore();
    nowSpy = null;
    uninstallMediaSession();
  });

  it('« Écouter la visite » : s1 joue, puis s2 et s3 sur `ended` sans geste, même nœud ; « Visite terminée », clé purgée', async () => {
    render(<Harness ids={['s1', 's2', 's3']} />);
    expect(tourButton()).toHaveTextContent('Écouter la visite');
    expect(screen.queryByTestId('tour-resume-button')).not.toBeInTheDocument();

    await clickTour();
    const node = audio();
    expect(node.getAttribute('src')).toBe(URL_S1);
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(tourButton()).toHaveTextContent('Pause'));
    expect(button('s1')).toHaveTextContent('Pause');
    expect(playSpy).toHaveBeenCalledTimes(1);

    // La position s'écrit pendant la lecture : la clé existe avant la fin.
    node.currentTime = 12;
    await emit('timeupdate');
    expect(storedResume()).toEqual({ sceneId: 's1', position: 12 });

    await emit('ended');
    expect(audio()).toBe(node);
    expect(node.getAttribute('src')).toBe(URL_S2);
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));
    expect(button('s1')).toHaveTextContent('Écouter');
    expect(playSpy).toHaveBeenCalledTimes(2);
    // URLs fraîches : aucune nouvelle requête à la frontière.
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);

    await emit('ended');
    expect(node.getAttribute('src')).toBe(URL_S3);
    await waitFor(() => expect(button('s3')).toHaveTextContent('Pause'));
    expect(playSpy).toHaveBeenCalledTimes(3);

    await emit('ended');
    expect(playSpy).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('tour-ending-complete')).toHaveTextContent('Visite terminée');
    expect(screen.queryByTestId('tour-ending-preview')).not.toBeInTheDocument();
    expect(tourButton()).toHaveTextContent('Écouter la visite');
    expect(button('s3')).toHaveTextContent('Écouter');
    expect(storedResume()).toBeNull();

    // Relancer la visite après la fin : depuis la première étape.
    await clickTour();
    expect(node.getAttribute('src')).toBe(URL_S1);
    expect(screen.queryByTestId('tour-ending-complete')).not.toBeInTheDocument();
  });

  it("fin d'aperçu : la dernière servie finie, des étapes verrouillées suivent → message + lien #acheter, rien ne joue", async () => {
    render(<Harness ids={['s1', 's2']} lockedAfter />);

    await clickTour();
    await emit('ended');
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));
    expect(playSpy).toHaveBeenCalledTimes(2);

    await emit('ended');

    const message = screen.getByTestId('tour-ending-preview');
    expect(message).toHaveTextContent('Débloquez la visite pour écouter la suite');
    expect(message).toHaveAttribute('role', 'status');
    expect(screen.getByTestId('tour-ending-purchase-link')).toHaveAttribute('href', '#acheter');
    expect(screen.queryByTestId('tour-ending-complete')).not.toBeInTheDocument();
    expect(playSpy).toHaveBeenCalledTimes(2);
    expect(tourButton()).toHaveTextContent('Écouter la visite');
    expect(storedResume()).toBeNull();
  });

  it('frontière avec URLs bientôt périmées (< 5 min) : redemande avant de poser s2 ; la relance de s2 est consommée', async () => {
    mockGetPublishedTourContent
      .mockResolvedValueOnce(response(THREE, iso(4 * 60_000)))
      .mockResolvedValueOnce(response({ s1: URL_S1_RENEWED, s2: URL_S2_RENEWED }, iso(40 * 60_000)));
    render(<Harness ids={['s1', 's2']} />);

    await clickTour();
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    expect(audio().getAttribute('src')).toBe(URL_S1);

    // 3 min 30 de validité restante : assez pour un clic (LW-1), pas pour une narration enchaînée.
    await emit('ended');
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S2_RENEWED));
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));

    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    await waitFor(() =>
      expect(screen.getByTestId('scene-error-s2')).toHaveTextContent(UNAVAILABLE),
    );
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
  });

  it('frontière avec URLs encore valides (≥ 5 min) : pas de redemande', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response(THREE, iso(6 * 60_000)));
    render(<Harness ids={['s1', 's2']} />);
    await clickTour();
    await emit('ended');
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S2));
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
  });

  it('URL de s2 absente à la frontière : message sur s2, séquence arrêtée', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1, s2: undefined }, FRESH));
    render(<Harness ids={['s1', 's2']} />);
    await clickTour();
    await waitFor(() => expect(tourButton()).toHaveTextContent('Pause'));

    await emit('ended');

    expect(screen.getByTestId('scene-error-s2')).toHaveTextContent(UNAVAILABLE);
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(tourButton()).toHaveTextContent('Écouter la visite');
    expect(screen.queryByTestId('tour-ending-preview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tour-ending-complete')).not.toBeInTheDocument();
  });

  it('échec de la première URL : message LW-1, séquence annulée', async () => {
    mockGetPublishedTourContent.mockResolvedValue({ ok: false, error: 'Contenu public indisponible' });
    render(<Harness ids={['s1', 's2']} />);
    await clickTour();
    expect(screen.getByTestId('scene-error-s1')).toHaveTextContent(UNAVAILABLE);
    expect(tourButton()).toHaveTextContent('Écouter la visite');
    expect(playSpy).not.toHaveBeenCalled();
  });

  it("clic « Écouter » isolé : `ended` n'enchaîne pas, aucun message de fin", async () => {
    render(<Harness ids={['s1', 's2']} />);
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(tourButton()).toHaveTextContent('Écouter la visite');

    await emit('ended');

    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(audio().getAttribute('src')).toBe(URL_S1);
    expect(screen.queryByTestId('tour-ending-complete')).not.toBeInTheDocument();
    expect(screen.queryByTestId('tour-ending-preview')).not.toBeInTheDocument();
  });

  it('clic sur une étape pendant la séquence : elle joue, la séquence continue depuis elle', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response({ ...THREE, s4: URL_S4 }, FRESH));
    render(<Harness ids={['s1', 's2', 's3', 's4']} />);
    await clickTour();
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));

    await click('s3');
    expect(audio().getAttribute('src')).toBe(URL_S3);
    await waitFor(() => expect(button('s3')).toHaveTextContent('Pause'));
    expect(tourButton()).toHaveTextContent('Pause');

    await emit('ended');
    expect(audio().getAttribute('src')).toBe(URL_S4);
    await waitFor(() => expect(button('s4')).toHaveTextContent('Pause'));
    expect(playSpy).toHaveBeenCalledTimes(3);
  });

  it('« Écouter la visite » pendant une écoute isolée : la visite continue depuis cette étape', async () => {
    render(<Harness ids={['s1', 's2', 's3']} />);
    await click('s2');
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));

    await clickTour();
    expect(audio().getAttribute('src')).toBe(URL_S2);
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(tourButton()).toHaveTextContent('Pause');

    await emit('ended');
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S3));
  });

  it('bouton de visite : pause, puis « Reprendre la visite » à la même position', async () => {
    render(<Harness ids={['s1', 's2']} />);
    await clickTour();
    await waitFor(() => expect(tourButton()).toHaveTextContent('Pause'));
    audio().currentTime = 21;

    await clickTour();
    expect(pauseSpy).toHaveBeenCalled();
    expect(tourButton()).toHaveTextContent('Reprendre la visite');
    expect(button('s1')).toHaveTextContent('Écouter');

    await clickTour();
    await waitFor(() => expect(tourButton()).toHaveTextContent('Pause'));
    expect(audio().currentTime).toBe(21);
    expect(audio().getAttribute('src')).toBe(URL_S1);
    expect(playSpy).toHaveBeenCalledTimes(2);
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
  });

  it('Media Session : métadonnées à chaque piste, toutes les actions posées, retirées au démontage', async () => {
    const fake = installMediaSession();
    mockGetPublishedTourContent.mockResolvedValue(
      response(THREE, FRESH, 'https://media.example/cover.jpg'),
    );
    const view = render(<Harness ids={['s1', 's2', 's3']} tourTitle="Le Caprice" />);

    const registered = fake.setActionHandler.mock.calls.map(([name]) => name).sort();
    expect(registered).toEqual(MEDIA_ACTIONS);
    expect(fake.metadata).toBeNull();

    await clickTour();
    await waitFor(() => expect(tourButton()).toHaveTextContent('Pause'));
    expect(fake.metadata).toMatchObject({
      // Le titre de la visite traverse la prop jusqu'à l'écran verrouillé.
      title: 'Scène s1',
      artist: 'Le Caprice',
      artwork: [{ src: 'https://media.example/cover.jpg' }],
    });
    expect(fake.playbackState).toBe('playing');

    // Durée connue : l'écran verrouillé reçoit un état de position, sans quoi
    // il n'affiche ni curseur ni durée — et `seekto` reste inatteignable.
    fakeDuration = 180;
    audio().currentTime = 12;
    await emit('loadedmetadata');
    expect(fake.setPositionState).toHaveBeenLastCalledWith({
      duration: 180,
      position: 12,
      playbackRate: 1,
    });

    await emit('ended');
    await waitFor(() => expect(fake.metadata).toMatchObject({ title: 'Scène s2' }));

    view.unmount();
    const released = fake.setActionHandler.mock.calls
      .filter(([, handler]) => handler === null)
      .map(([name]) => name)
      .sort();
    expect(released).toEqual(MEDIA_ACTIONS);
    expect(fake.metadata).toBeNull();
    expect(fake.playbackState).toBe('none');
  });

  it('Media Session : seekbackward / seekforward sautent de dix secondes, bornés par la piste', async () => {
    const fake = installMediaSession();
    render(<Harness ids={['s1', 's2']} />);
    await clickTour();
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    fakeDuration = 100;
    audio().currentTime = 40;
    await emit('loadedmetadata');

    await action(fake, 'seekforward');
    expect(audio().currentTime).toBe(50);

    await action(fake, 'seekbackward');
    expect(audio().currentTime).toBe(40);

    // Le navigateur peut imposer son propre saut.
    await action(fake, 'seekforward', { seekOffset: 25 });
    expect(audio().currentTime).toBe(65);

    // Jamais avant le début, jamais après la fin.
    await action(fake, 'seekbackward', { seekOffset: 500 });
    expect(audio().currentTime).toBe(0);
    await action(fake, 'seekforward', { seekOffset: 500 });
    expect(audio().currentTime).toBe(100);
    // Aucune requête : ces sauts ne touchent pas à la source.
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
  });

  it('Media Session : nexttrack / previoustrack / seekto / pause / play pilotent le lecteur', async () => {
    const fake = installMediaSession();
    render(<Harness ids={['s1', 's2', 's3']} />);
    await clickTour();
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));

    await action(fake, 'nexttrack');
    expect(audio().getAttribute('src')).toBe(URL_S2);
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));
    // La séquence est conservée : la piste suivante s'enchaînera.
    expect(tourButton()).toHaveTextContent('Pause');

    await action(fake, 'nexttrack');
    expect(audio().getAttribute('src')).toBe(URL_S3);
    await waitFor(() => expect(button('s3')).toHaveTextContent('Pause'));
    expect(playSpy).toHaveBeenCalledTimes(3);

    // En bout de liste : rien de nouveau ne joue, mais la frontière est DITE —
    // la même que celle qu'`ended` annonce.
    await action(fake, 'nexttrack');
    expect(audio().getAttribute('src')).toBe(URL_S3);
    expect(playSpy).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('tour-ending-complete')).toBeInTheDocument();

    await action(fake, 'previoustrack');
    expect(audio().getAttribute('src')).toBe(URL_S2);
    await action(fake, 'previoustrack');
    expect(audio().getAttribute('src')).toBe(URL_S1);
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(playSpy).toHaveBeenCalledTimes(5);

    // En tête de liste : s1 repart de zéro, sans nouvelle tentative.
    audio().currentTime = 33;
    await action(fake, 'previoustrack');
    expect(audio().currentTime).toBe(0);
    expect(audio().getAttribute('src')).toBe(URL_S1);
    expect(playSpy).toHaveBeenCalledTimes(5);

    await action(fake, 'seekto', { seekTime: 42 });
    expect(audio().currentTime).toBe(42);
    expect(screen.getByTestId('scene-time-s1')).toHaveTextContent('0:42 /');

    await action(fake, 'pause');
    expect(pauseSpy).toHaveBeenCalled();
    expect(button('s1')).toHaveTextContent('Écouter');
    expect(fake.playbackState).toBe('paused');

    await action(fake, 'play');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(playSpy).toHaveBeenCalledTimes(6);
    expect(fake.playbackState).toBe('playing');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
  });

  it("changement de visite : la Media Session de l'ancienne est retirée, la nouvelle en pose une", async () => {
    const fake = installMediaSession();
    const view = render(<Harness tourId="tour-1" ids={['s1']} />);
    await clickTour();
    await waitFor(() => expect(fake.metadata).toMatchObject({ title: 'Scène s1' }));
    fake.setActionHandler.mockClear();

    view.rerender(<Harness tourId="tour-2" ids={['s1']} />);
    await act(async () => {});

    const calls = fake.setActionHandler.mock.calls;
    expect(calls.filter(([, handler]) => handler === null)).toHaveLength(MEDIA_ACTIONS.length);
    expect(calls.filter(([, handler]) => typeof handler === 'function')).toHaveLength(
      MEDIA_ACTIONS.length,
    );
    expect(fake.metadata).toBeNull();
    expect(tourButton()).toHaveTextContent('Écouter la visite');
  });

  it("reprise : pastille « Reprendre à l’étape 2 », clic → s2 à 37 s, séquence active", async () => {
    storeResume('s2', 37);
    render(<Harness ids={['s1', 's2', 's3']} />);
    await act(async () => {});

    const resume = screen.getByTestId('tour-resume-button');
    expect(resume).toHaveTextContent("Reprendre à l’étape 2");
    // LW-3 prépare le manifeste des langues, sans démarrer l’audio.
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    expect(playSpy).not.toHaveBeenCalled();

    fireEvent.click(resume);
    await act(async () => {});

    expect(audio().getAttribute('src')).toBe(URL_S2);
    // La position s'affiche tout de suite, mais n'est POSÉE qu'à la durée connue :
    // avec `preload="none"`, rien ne dit encore où la piste finit.
    expect(screen.getByTestId('scene-time-s2')).toHaveTextContent('0:37 /');
    fakeDuration = 180;
    await emit('loadedmetadata');
    expect(audio().currentTime).toBe(37);
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));
    expect(tourButton()).toHaveTextContent('Pause');
    expect(screen.getByTestId('scene-time-s2')).toHaveTextContent('0:37 / 3:00');
    expect(screen.queryByTestId('tour-resume-button')).not.toBeInTheDocument();

    // La séquence continue depuis s2.
    await emit('ended');
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S3));
  });

  it("reprise : le numéro affiché est celui de l'étape, pas son rang dans la liste jouable", async () => {
    storeResume('s2', 5);
    render(
      <ScenePlayer
        tourId="tour-1"
        locale="fr"
        playlist={[
          { id: 's1', title: 'Un', order: 1 },
          { id: 's2', title: 'Deux', order: 4 },
        ]}
      >
        <TourPlayControl />
      </ScenePlayer>,
    );
    await act(async () => {});
    expect(screen.getByTestId('tour-resume-button')).toHaveTextContent("Reprendre à l’étape 4");
  });

  it('reprise : scène mémorisée verrouillée ou absente → pas de pastille, clé purgée', async () => {
    storeResume('s4', 10);
    render(<Harness ids={['s1', 's2']} />);
    await act(async () => {});

    expect(screen.queryByTestId('tour-resume-button')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(resumeKey('tour-1'))).toBeNull();
    expect(tourButton()).toHaveTextContent('Écouter la visite');
  });

  it("reprise : liste pas encore stabilisée → ni pastille ni purge, puis pastille quand l'étape s'ouvre", async () => {
    storeResume('s3', 10);
    const playlistOf = (ids: string[]) => ids.map((id, index) => ({ id, title: id, order: index + 1 }));
    const view = render(
      <ScenePlayer tourId="tour-1" locale="fr" playlist={playlistOf(['s1', 's2'])} playlistSettled={false}>
        <TourPlayControl />
      </ScenePlayer>,
    );
    await act(async () => {});
    expect(screen.queryByTestId('tour-resume-button')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(resumeKey('tour-1'))).not.toBeNull();

    view.rerender(
      <ScenePlayer tourId="tour-1" locale="fr" playlist={playlistOf(['s1', 's2', 's3'])} playlistSettled>
        <TourPlayControl />
      </ScenePlayer>,
    );
    await act(async () => {});
    expect(screen.getByTestId('tour-resume-button')).toHaveTextContent("Reprendre à l’étape 3");
  });

  it('reprise : clé illisible → ignorée et purgée, le lecteur fonctionne', async () => {
    window.localStorage.setItem(resumeKey('tour-1'), '{not json');
    render(<Harness ids={['s1', 's2']} />);
    await act(async () => {});

    expect(screen.queryByTestId('tour-resume-button')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(resumeKey('tour-1'))).toBeNull();

    await clickTour();
    await waitFor(() => expect(tourButton()).toHaveTextContent('Pause'));
  });

  it('reprise : écriture au plus toutes les 5 s pendant la lecture, tout de suite à la pause', async () => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(BASE_NOW);
    render(<Harness ids={['s1', 's2']} />);
    await clickTour();
    await waitFor(() => expect(tourButton()).toHaveTextContent('Pause'));

    audio().currentTime = 3;
    await emit('timeupdate');
    expect(storedResume()).toEqual({ sceneId: 's1', position: 3 });

    // Deux secondes plus tard : pas d'écriture.
    nowSpy.mockReturnValue(BASE_NOW + 2_000);
    audio().currentTime = 5;
    await emit('timeupdate');
    expect(storedResume()).toEqual({ sceneId: 's1', position: 3 });

    // Six secondes : écriture.
    nowSpy.mockReturnValue(BASE_NOW + 6_000);
    audio().currentTime = 9;
    await emit('timeupdate');
    expect(storedResume()).toEqual({ sceneId: 's1', position: 9 });

    // La pause écrit sans attendre.
    nowSpy.mockReturnValue(BASE_NOW + 7_000);
    audio().currentTime = 10;
    await emit('pause');
    expect(storedResume()).toEqual({ sceneId: 's1', position: 10 });

    // La piste suivante écrit sa position sans attendre le délai.
    nowSpy.mockReturnValue(BASE_NOW + 8_000);
    await emit('ended');
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S2));
    audio().currentTime = 1;
    await emit('timeupdate');
    expect(storedResume()).toEqual({ sceneId: 's2', position: 1 });
  });

  it("localStorage indisponible : le lecteur fonctionne, pas de reprise, pas d'erreur visible", async () => {
    const own = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('SecurityError');
      },
    });
    try {
      render(<Harness ids={['s1', 's2']} />);
      await act(async () => {});
      expect(screen.queryByTestId('tour-resume-button')).not.toBeInTheDocument();

      await clickTour();
      await waitFor(() => expect(tourButton()).toHaveTextContent('Pause'));
      audio().currentTime = 4;
      await emit('timeupdate');
      await emit('pause');
      await emit('ended');
      await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S2));
      await emit('ended');
      expect(screen.getByTestId('tour-ending-complete')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    } finally {
      if (own) Object.defineProperty(window, 'localStorage', own);
      else delete (window as unknown as Record<string, unknown>).localStorage;
    }
  });

  it('libellés en anglais', async () => {
    storeResume('s2', 3);
    render(
      <ScenePlayer
        tourId="tour-1"
        locale="en"
        playlist={[
          { id: 's1', title: 'One', order: 1 },
          { id: 's2', title: 'Two', order: 2 },
        ]}
        lockedAfter
      >
        <TourPlayControl />
        <SceneListenControl sceneId="s1" title="One" />
        <SceneListenControl sceneId="s2" title="Two" />
      </ScenePlayer>,
    );
    await act(async () => {});
    expect(tourButton()).toHaveTextContent('Listen to the tour');
    expect(screen.getByTestId('tour-resume-button')).toHaveTextContent('Resume at stop 2');

    await clickTour();
    await waitFor(() => expect(tourButton()).toHaveTextContent('Pause'));
    await emit('ended');
    await emit('ended');
    expect(screen.getByTestId('tour-ending-preview')).toHaveTextContent('Unlock the tour to keep listening');
    expect(screen.getByTestId('tour-ending-purchase-link')).toHaveTextContent('Unlock the tour');
  });

  it("sans étape jouable, l'en-tête ne rend rien ; hors <ScenePlayer> non plus", () => {
    const { container } = render(
      <ScenePlayer tourId="tour-1" locale="fr" playlist={[]}>
        <TourPlayControl />
      </ScenePlayer>,
    );
    expect(container.querySelector('[data-testid="tour-play-control"]')).toBeNull();
    const alone = render(<TourPlayControl />);
    expect(alone.container).toBeEmptyDOMElement();
  });
});

// ─── LW-2 — correctifs de revue ──────────────────────────────────────────────

const URL_S3_RENEWED = 'https://media.example/s3.mp3?sig=two';

describe('ScenePlayer — LW-2 (revue)', () => {
  const scrollSpy = jest.fn();
  const hadScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');

  beforeAll(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollSpy,
    });
  });

  afterAll(() => {
    if (hadScroll) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', hadScroll);
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollIntoView;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    playSpy.mockResolvedValue(undefined);
    fakeDuration = NaN;
    fakeError = null;
    mockGetPublishedTourContent.mockResolvedValue(response(THREE, FRESH));
  });

  afterEach(() => {
    nowSpy?.mockRestore();
    nowSpy = null;
    uninstallMediaSession();
  });

  // ── Enchaînement piloté de l'extérieur ────────────────────────────────────

  it('nexttrack pendant une écoute isolée : la visite s’enchaîne ensuite (la chaîne ne meurt plus en silence)', async () => {
    const fake = installMediaSession();
    render(<Harness ids={['s1', 's2', 's3']} />);
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    // Écoute isolée : la séquence n'est pas active.
    expect(tourButton()).toHaveTextContent('Écouter la visite');

    await action(fake, 'nexttrack');

    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));
    expect(tourButton()).toHaveTextContent('Pause');
    // Et la suite part toute seule, ce que l'ancienne version ne faisait pas.
    await emit('ended');
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S3));
  });

  it('previoustrack pendant une écoute isolée : la séquence s’active aussi', async () => {
    const fake = installMediaSession();
    render(<Harness ids={['s1', 's2', 's3']} />);
    await click('s2');
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));

    await action(fake, 'previoustrack');

    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(tourButton()).toHaveTextContent('Pause');
    await emit('ended');
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S2));
  });

  it('nexttrack en bout d’aperçu : le message d’achat, comme à la fin d’une piste', async () => {
    const fake = installMediaSession();
    render(<Harness ids={['s1', 's2']} lockedAfter />);
    await clickTour();
    await emit('ended');
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));

    await action(fake, 'nexttrack');

    expect(screen.getByTestId('tour-ending-preview')).toBeInTheDocument();
    expect(screen.getByTestId('tour-ending-purchase-link')).toHaveAttribute('href', '#acheter');
    expect(tourButton()).toHaveTextContent('Écouter la visite');
    // Le son s'arrête avec le message : annoncer la fin pendant que la piste
    // continue ferait dire au lecteur le contraire de ce qu'on entend.
    expect(pauseSpy).toHaveBeenCalled();
    expect(button('s2')).toHaveTextContent('Écouter');
  });

  it('nexttrack exige la même validité d’URL qu’un enchaînement automatique', async () => {
    mockGetPublishedTourContent
      .mockResolvedValueOnce(response(THREE, iso(4 * 60_000)))
      .mockResolvedValueOnce(response({ s1: URL_S1_RENEWED, s2: URL_S2_RENEWED }, iso(40 * 60_000)));
    const fake = installMediaSession();
    render(<Harness ids={['s1', 's2']} />);
    await click('s1');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);

    // 3 min 30 de validité restante : un saut manuel tomberait sur une URL
    // presque morte et brûlerait la relance de la piste.
    await action(fake, 'nexttrack');

    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S2_RENEWED));
  });

  it('previoustrack exige aussi la validité minimale', async () => {
    mockGetPublishedTourContent
      .mockResolvedValueOnce(response(THREE, iso(4 * 60_000)))
      .mockResolvedValueOnce(response({ s1: URL_S1_RENEWED, s2: URL_S2_RENEWED }, iso(40 * 60_000)));
    const fake = installMediaSession();
    render(<Harness ids={['s1', 's2']} />);
    await click('s2');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);

    await action(fake, 'previoustrack');

    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S1_RENEWED));
  });

  it('pause pendant une relance, puis « Écouter la visite » : la lecture repart à l’arrivée de la source', async () => {
    let resolveSecond: (value: unknown) => void = () => {};
    mockGetPublishedTourContent
      .mockResolvedValueOnce(response(THREE, FRESH))
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
      );
    render(<Harness ids={['s1', 's2']} />);
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    audio().currentTime = 20;

    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
    // L'utilisateur met en pause pendant que la relance est en vol…
    await click('s1');
    // …puis demande la visite : le mode visite ne doit pas hériter de la pause.
    await clickTour();

    await act(async () => {
      resolveSecond(response({ s1: URL_S1_RENEWED, s2: URL_S2_RENEWED }, FRESH));
    });

    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(2));
    expect(audio().getAttribute('src')).toBe(URL_S1_RENEWED);
    expect(audio().currentTime).toBe(20);
    await waitFor(() => expect(tourButton()).toHaveTextContent('Pause'));
    // Et la séquence est bien celle qu'on a demandée.
    await emit('ended');
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S2_RENEWED));
  });

  // ── Perte d'accès, démontage ──────────────────────────────────────────────

  it('la liste servie rétrécit pendant la lecture : position gardée, écran verrouillé nettoyé, séquence arrêtée', async () => {
    const fake = installMediaSession();
    const view = render(<Harness ids={['s1', 's2']} />);
    await clickTour();
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    audio().currentTime = 48;
    pauseSpy.mockClear();

    // Déconnexion, accès perdu : l'étape en cours disparaît de la liste servie.
    view.rerender(<Harness ids={['s2']} />);
    await act(async () => {});

    expect(storedResume()).toEqual({ sceneId: 's1', position: 48 });
    expect(fake.metadata).toBeNull();
    expect(fake.playbackState).toBe('none');
    expect(pauseSpy).toHaveBeenCalled();
    expect(audio().getAttribute('src')).toBeNull();
    expect(tourButton()).toHaveTextContent('Écouter la visite');
  });

  it('reprise écrite au masquage de l’onglet et au démontage', async () => {
    const view = render(<Harness ids={['s1', 's2']} />);
    await clickTour();
    await waitFor(() => expect(tourButton()).toHaveTextContent('Pause'));

    // Un onglet mobile peut être tué sans autre préavis que `pagehide`.
    audio().currentTime = 17;
    await act(async () => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(storedResume()).toEqual({ sceneId: 's1', position: 17 });

    audio().currentTime = 64;
    view.unmount();
    expect(storedResume()).toEqual({ sceneId: 's1', position: 64 });
  });

  it('démontage pendant que la réponse voyage : rien ne joue, rien n’est mémorisé', async () => {
    let resolveFirst: (value: unknown) => void = () => {};
    mockGetPublishedTourContent.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFirst = resolve;
      }),
    );
    const view = render(<Harness ids={['s1', 's2']} />);
    fireEvent.click(tourButton());
    await act(async () => {});

    view.unmount();
    await act(async () => {
      resolveFirst(response(THREE, FRESH));
    });

    expect(playSpy).not.toHaveBeenCalled();
    expect(storedResume()).toBeNull();
  });

  // ── Bornes de position ────────────────────────────────────────────────────

  it('reprise au-delà de la durée (narration republiée plus courte) : la piste repart de zéro', async () => {
    storeResume('s1', 300);
    render(<Harness ids={['s1', 's2']} />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId('tour-resume-button'));
    await act(async () => {});

    fakeDuration = 90;
    await emit('loadedmetadata');

    expect(audio().currentTime).toBe(0);
    expect(audio().getAttribute('src')).toBe(URL_S1);
    expect(screen.getByTestId('scene-time-s1')).toHaveTextContent('0:00 / 1:30');
    // Rien n'a enchaîné : la piste n'a pas « fini » avant d'avoir commencé.
    expect(screen.queryByTestId('tour-ending-complete')).not.toBeInTheDocument();
    expect(audio().getAttribute('src')).not.toBe(URL_S2);
  });

  it('reprise dans la dernière seconde : même garde, la piste repart de zéro', async () => {
    storeResume('s1', 89.5);
    render(<Harness ids={['s1', 's2']} />);
    await act(async () => {});
    fireEvent.click(screen.getByTestId('tour-resume-button'));
    await act(async () => {});

    fakeDuration = 90;
    await emit('loadedmetadata');

    expect(audio().currentTime).toBe(0);
  });

  it('seekto au-delà de la durée : borné, la piste ne se termine pas d’un saut', async () => {
    const fake = installMediaSession();
    render(<Harness ids={['s1', 's2']} />);
    await clickTour();
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    fakeDuration = 120;
    await emit('loadedmetadata');

    await action(fake, 'seekto', { seekTime: 5_000 });
    expect(audio().currentTime).toBe(120);

    await action(fake, 'seekto', { seekTime: -10 });
    expect(audio().currentTime).toBe(0);
  });

  // ── Fraîcheur des URLs ────────────────────────────────────────────────────

  it('sans mediaExpiresAt : le repli local ne fait pas redemander à chaque frontière, et chaque piste garde sa relance', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response(THREE));
    render(<Harness ids={['s1', 's2', 's3']} />);

    await clickTour();
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    await emit('ended');
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S2));
    await emit('ended');
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S3));
    // Une seule requête pour toute la visite : un repli n'est pas une échéance.
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);

    // Et la relance de s3 n'a pas été brûlée par une redemande de frontière.
    mockGetPublishedTourContent.mockResolvedValueOnce(response({ ...THREE, s3: URL_S3_RENEWED }));
    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S3_RENEWED));
  });

  it('mediaExpiresAt déjà sous la marge : le repli court ne fait pas redemander non plus', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response(THREE, iso(10_000)));
    render(<Harness ids={['s1', 's2']} />);

    await clickTour();
    await emit('ended');

    await waitFor(() => expect(audio().getAttribute('src')).toBe(URL_S2));
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
  });

  it('redemande de frontière en échec : la séquence continue avec les URLs encore valides', async () => {
    mockGetPublishedTourContent
      .mockResolvedValueOnce(response(THREE, iso(4 * 60_000)))
      .mockResolvedValueOnce({ ok: false, error: 'réseau' });
    render(<Harness ids={['s1', 's2', 's3']} />);

    await clickTour();
    await emit('ended');

    await waitFor(() => expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2));
    // Le cache n'est pas périmé au sens strict : mourir sur « indisponible »
    // avec des URLs utilisables en mémoire serait un faux négatif.
    expect(audio().getAttribute('src')).toBe(URL_S2);
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));
    expect(screen.queryByTestId('scene-error-s2')).not.toBeInTheDocument();

    // La relance de cette piste a bien été consommée : l'erreur média affiche.
    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    await waitFor(() =>
      expect(screen.getByTestId('scene-error-s2')).toHaveTextContent(UNAVAILABLE),
    );
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
  });

  // ── Interface et accessibilité ────────────────────────────────────────────

  it('le message de fin vient à la vue et prend le focus', async () => {
    render(<Harness ids={['s1', 's2']} lockedAfter />);
    await clickTour();
    await emit('ended');
    await waitFor(() => expect(button('s2')).toHaveTextContent('Pause'));
    scrollSpy.mockClear();

    await emit('ended');

    const message = screen.getByTestId('tour-ending-preview');
    // Le défilement automatique vient d'emmener la vue sur la dernière étape :
    // sans cela, l'appel à l'action serait hors champ.
    expect(scrollSpy).toHaveBeenCalled();
    expect(message).toHaveAttribute('tabindex', '-1');
    expect(document.activeElement).toBe(message);
  });

  it('l’étape en cours est annoncée en écoute isolée et en séquence', async () => {
    render(<Harness ids={['s1', 's2']} />);
    const live = screen.getByTestId('tour-now-playing');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toBeEmptyDOMElement();

    // LW-6 : l’écoute isolée bénéficie aussi de l’annonce.
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
    expect(screen.getByTestId('tour-now-playing')).toHaveTextContent('Étape 1 sur 2 : Scène s1');

    await clickTour();
    expect(screen.getByTestId('tour-now-playing')).toHaveTextContent('Étape 1 sur 2 : Scène s1');

    await emit('ended');
    await waitFor(() =>
      expect(screen.getByTestId('tour-now-playing')).toHaveTextContent('Étape 2 sur 2 : Scène s2'),
    );
  });

  it('playlist oubliée : le mode visite est inactif, et le développement le dit', async () => {
    render(
      <ScenePlayer tourId="tour-1" locale="fr">
        <TourPlayControl />
        <SceneListenControl sceneId="s1" title="Scène s1" />
      </ScenePlayer>,
    );
    await act(async () => {});

    expect(screen.queryByTestId('tour-play-control')).not.toBeInTheDocument();
    expect(logger.warn).toHaveBeenCalledWith(
      'ScenePlayer',
      expect.stringContaining('playlist'),
      expect.objectContaining({ tourId: 'tour-1' }),
    );
    // Le lecteur LW-1, lui, marche toujours.
    await click('s1');
    await waitFor(() => expect(button('s1')).toHaveTextContent('Pause'));
  });
});

describe('LW-6 — arrivée, mesure et confidentialité', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playSpy.mockResolvedValue(undefined);
    fakeDuration = 120;
    fakeError = null;
    window.history.replaceState(null, '', '/catalogue/grasse/test');
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1, s2: URL_S2 }, FRESH));
  });
  afterEach(() => window.history.replaceState(null, '', '/'));

  const events = (name: string) => (trackEvent as jest.Mock).mock.calls.filter(([event]) => event === name);

  it('attend la liste stabilisée puis lance une seule fois depuis les achats', async () => {
    window.history.replaceState(null, '', '#ecouter');
    const { rerender } = render(<Harness settled={false} />);
    expect(playSpy).not.toHaveBeenCalled();
    rerender(<Harness settled />);
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(1));
    rerender(<Harness settled />);
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('web_listen_start', { tour_id: 'tour-1', city_id: 'grasse', language: 'fr', from: 'purchases' });
    expect(screen.getByTestId('tour-play-button')).toHaveFocus();
  });

  it('propose et focalise la reprise sans la jouer automatiquement', async () => {
    window.localStorage.setItem(resumeKey('tour-1'), JSON.stringify({ sceneId: 's2', position: 37, updatedAt: Date.now() }));
    window.history.replaceState(null, '', '#ecouter');
    render(<Harness locale="en" />);
    await waitFor(() => expect(screen.getByTestId('tour-resume-button')).toHaveFocus());
    expect(playSpy).not.toHaveBeenCalled();
    expect(screen.getByTestId('tour-resume-button')).toHaveTextContent('Resume at stop 2');
    fireEvent.click(screen.getByTestId('tour-resume-button'));
    await act(async () => {});
    await emit('loadedmetadata');
    expect(audio().currentTime).toBe(37);
    expect(trackEvent).toHaveBeenCalledWith('web_listen_start', expect.objectContaining({ from: 'resume', language: 'fr' }));
  });

  it('garde un geste possible après refus d’autoplay sans mesurer un faux départ', async () => {
    playSpy.mockRejectedValueOnce(rejection('NotAllowedError'));
    window.history.replaceState(null, '', '#ecouter');
    render(<Harness />);
    expect(await screen.findByText('Touchez à nouveau pour lancer l’écoute')).toBeVisible();
    expect(events('web_listen_start')).toHaveLength(0);
    fireEvent.click(screen.getByTestId('tour-play-button'));
    await act(async () => {});
    expect(events('web_listen_start')).toHaveLength(1);
    expect(events('web_listen_start')[0][1].from).toBe('purchases');
  });

  it('mesure une séquence une fois, les deux fins et la fin naturelle uniquement', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('tour-play-button'));
    await act(async () => {});
    fireEvent.click(screen.getByTestId('tour-play-button'));
    fireEvent.click(screen.getByTestId('tour-play-button'));
    await act(async () => {});
    await emit('ended');
    await emit('ended');
    await emit('ended');
    expect(events('web_listen_start')).toHaveLength(1);
    expect(events('web_scene_complete').map(([, props]) => props.scene_order)).toEqual([1, 2]);
    expect(events('web_listen_complete')).toHaveLength(1);
  });

  it.each([true, false])('une scène isolée ne termine pas la visite (aperçu=%s)', async (lockedAfter) => {
    render(<Harness lockedAfter={lockedAfter} />);
    await click('s2');
    await emit('ended');
    expect(events('web_scene_complete')).toHaveLength(1);
    expect(events('web_listen_complete')).toHaveLength(0);
  });

  it('la fin d’aperçu ne compte pas comme une visite terminée', async () => {
    render(<Harness lockedAfter />);
    fireEvent.click(screen.getByTestId('tour-play-button'));
    await act(async () => {});
    await emit('ended');
    await emit('ended');
    expect(events('web_listen_complete')).toHaveLength(0);
  });

  it('sans URL servie, aucun départ mesuré', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response({}));
    render(<Harness />);
    await click('s1');
    expect(events('web_listen_start')).toHaveLength(0);
  });

  it('une relance réseau conserve une seule mesure de départ', async () => {
    render(<Harness />);
    await click('s1');
    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    expect(events('web_listen_start')).toHaveLength(1);
    expect(playSpy).toHaveBeenCalledTimes(2);
  });

  it('les flèches du curseur font ±10 s sans sortir de la durée', async () => {
    render(<Harness />);
    await click('s1');
    await emit('loadedmetadata');
    const slider = screen.getByRole('slider');
    audio().currentTime = 117;
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(audio().currentTime).toBe(120);
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(audio().currentTime).toBe(110);
    audio().currentTime = 2;
    fireEvent.keyDown(screen.getByTestId('tour-play-button'), { key: 'ArrowLeft' });
    expect(audio().currentTime).toBe(0);
    const pauses = pauseSpy.mock.calls.length;
    fireEvent.keyDown(slider, { key: ' ' });
    expect(pauseSpy).toHaveBeenCalledTimes(pauses + 1);
  });

  it('la purge arrête le son et le démontage ne recrée aucune reprise', async () => {
    const view = render(<Harness />);
    await click('s1');
    audio().currentTime = 42;
    await emit('timeupdate');
    expect(window.localStorage.getItem(resumeKey('tour-1'))).not.toBeNull();
    act(() => clearAllResumes());
    expect(audio()).not.toHaveAttribute('src');
    await emit('timeupdate');
    view.unmount();
    expect(window.localStorage.getItem(resumeKey('tour-1'))).toBeNull();
  });

  it('une réponse arrivée après la purge ne peut pas démarrer', async () => {
    let resolve!: (value: ReturnType<typeof response>) => void;
    mockGetPublishedTourContent.mockReturnValue(new Promise((done) => { resolve = done; }));
    render(<Harness />);
    fireEvent.click(button('s1'));
    act(() => clearAllResumes());
    await act(async () => resolve(response({ s1: URL_S1 })));
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('la déconnexion dans un autre onglet arrête aussi le lecteur', async () => {
    render(<Harness />);
    await click('s1');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: RESUME_CLEAR_KEY, newValue: 'nouvelle-session' })));
    expect(audio()).not.toHaveAttribute('src');
  });
});

describe('LW-6 — régressions des relectures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playSpy.mockResolvedValue(undefined);
    fakeDuration = 120;
    fakeError = null;
    window.history.replaceState(null, '', '/');
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1, s2: URL_S2 }, FRESH));
  });
  afterEach(() => window.history.replaceState(null, '', '/'));

  it('traite une arrivée par hashchange après montage, une seule fois', async () => {
    render(<Harness />);
    expect(playSpy).not.toHaveBeenCalled();
    window.history.replaceState(null, '', '#ecouter');
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    await waitFor(() => expect(playSpy).toHaveBeenCalledTimes(1));
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('tour-play-button')).toHaveFocus();
  });

  it('actualise une reprise écrite dans un autre onglet avant l’arrivée', async () => {
    render(<Harness />);
    window.localStorage.setItem(resumeKey('tour-1'), JSON.stringify({ sceneId: 's2', position: 37, updatedAt: Date.now() }));
    window.history.replaceState(null, '', '#ecouter');
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    await waitFor(() => expect(screen.getByTestId('tour-resume-button')).toHaveFocus());
    expect(playSpy).not.toHaveBeenCalled();
  });

  it('conserve la provenance achats si l’on préfère recommencer plutôt que reprendre', async () => {
    window.localStorage.setItem(resumeKey('tour-1'), JSON.stringify({ sceneId: 's2', position: 37, updatedAt: Date.now() }));
    window.history.replaceState(null, '', '#ecouter');
    render(<Harness />);
    await screen.findByTestId('tour-resume-button');
    fireEvent.click(screen.getByTestId('tour-play-button'));
    await act(async () => {});
    expect(trackEvent).toHaveBeenCalledWith('web_listen_start', expect.objectContaining({ from: 'purchases' }));
  });

  it('oublie aussi le cache signé après déconnexion distante : le serveur doit réaccorder l’URL', async () => {
    render(<Harness />);
    await click('s1');
    act(() => window.dispatchEvent(new StorageEvent('storage', { key: RESUME_CLEAR_KEY, newValue: 'nouvelle-session' })));
    mockGetPublishedTourContent.mockResolvedValue(response({}));
    await click('s1');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(UNAVAILABLE)).toBeVisible();
  });
});

describe('LW-3 — langue d’écoute', () => {
  const EN_S1 = 'https://media.example/en-s1.mp3?sig=one';
  const DE_S1 = 'https://media.example/de-s1.mp3?sig=one';
  const multilingual = () => response({ s1: URL_S1, s2: URL_S2 }, FRESH, undefined, { s1: { en: EN_S1, de: DE_S1 } });
  beforeEach(() => {
    jest.clearAllMocks();
    playSpy.mockResolvedValue(undefined);
    fakeDuration = 120;
    fakeError = null;
    window.history.replaceState(null, '', '/');
    mockGetPublishedTourContent.mockResolvedValue(multilingual());
  });
  afterEach(() => window.history.replaceState(null, '', '/'));
  const selector = () => screen.getByRole('combobox');
  async function ready() { await waitFor(() => expect(selector()).not.toBeDisabled()); }
  async function choose(value: string) { fireEvent.change(selector(), { target: { value } }); await act(async () => {}); }

  it('page anglaise : découvre les URLs, choisit anglais et annonce le repli', async () => {
    render(<Harness locale="en" />);
    await ready();
    expect(selector()).toHaveAccessibleName('Listening language');
    expect(selector()).toHaveValue('en');
    expect(screen.getByRole('option', { name: 'English — Synthetic voice' })).toBeVisible();
    expect(screen.getByText('1 stop will play in French.')).toBeVisible();
    expect(playSpy).not.toHaveBeenCalled();
    await click('s1');
    expect(audio().src).toBe(EN_S1);
    expect(trackEvent).toHaveBeenCalledWith('web_listen_start', expect.objectContaining({ language: 'en' }));
  });

  it('séquence anglaise : la seconde piste sans traduction joue la source sur le même audio', async () => {
    render(<Harness locale="en" />);
    await ready();
    const element = audio();
    fireEvent.click(screen.getByTestId('tour-play-button'));
    await act(async () => {});
    expect(element.src).toBe(EN_S1);
    await emit('ended');
    expect(audio()).toBe(element);
    expect(element.src).toBe(URL_S2);
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
  });

  it('un choix mémorisé est prioritaire et aucune URL ne va au stockage', async () => {
    writeLanguageChoice('tour-1', 'de');
    const view = render(<Harness locale="en" />);
    await ready();
    expect(selector()).toHaveValue('de');
    await choose('en');
    view.unmount();
    render(<Harness />);
    await ready();
    expect(selector()).toHaveValue('en');
    expect(JSON.parse(localStorage.getItem(`${LANGUAGE_KEY_PREFIX}tour-1`)!)).toMatchObject({ language: 'en' });
    expect(JSON.stringify(localStorage)).not.toContain('https://');
  });

  it('une ancienne préférence absente de l’aperçu reste mémorisée', async () => {
    writeLanguageChoice('tour-1', 'ja');
    render(<Harness locale="en" />);
    await ready();
    expect(selector()).toHaveValue('en');
    expect(JSON.parse(localStorage.getItem(`${LANGUAGE_KEY_PREFIX}tour-1`)!)).toMatchObject({ language: 'ja' });
  });

  it('changer en lecture repart à zéro, sans second audio ni nouvelle demande', async () => {
    render(<Harness />);
    await ready();
    await click('s1');
    const element = audio();
    element.currentTime = 42;
    await choose('en');
    expect(audio()).toBe(element);
    expect(element.currentTime).toBe(0);
    expect(element.src).toBe(EN_S1);
    expect(button('s1')).toHaveTextContent('Pause');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    const starts = jest.mocked(trackEvent).mock.calls.filter(([event]) => event === 'web_listen_start');
    expect(starts.map(([, props]) => props?.language)).toEqual(['fr', 'en']);
  });

  it('changer en pause prépare la nouvelle langue sans lancer de son', async () => {
    render(<Harness />);
    await ready();
    await click('s1');
    await click('s1');
    audio().currentTime = 42;
    const calls = playSpy.mock.calls.length;
    await choose('en');
    expect(playSpy).toHaveBeenCalledTimes(calls);
    expect(audio().src).toBe(EN_S1);
    expect(audio().currentTime).toBe(0);
    await click('s1');
    expect(playSpy).toHaveBeenCalledTimes(calls + 1);
  });

  it('le choix identique ne redémarre pas et les flèches du sélecteur ne cherchent pas dans la piste', async () => {
    render(<Harness />);
    await ready();
    await click('s1');
    audio().currentTime = 42;
    await choose('fr');
    fireEvent.keyDown(selector(), { key: 'ArrowRight' });
    expect(audio().currentTime).toBe(42);
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it.each([['en', 37], ['fr', 0], [undefined, 0]] as const)('reprise enregistrée en %s sur page anglaise : position %s', async (language, position) => {
    localStorage.setItem(resumeKey('tour-1'), JSON.stringify({ sceneId: 's1', position: 37, updatedAt: Date.now(), language }));
    render(<Harness locale="en" />);
    await ready();
    fireEvent.click(screen.getByTestId('tour-resume-button'));
    await act(async () => {});
    await emit('loadedmetadata');
    expect(audio().src).toBe(EN_S1);
    expect(audio().currentTime).toBe(position);
    audio().currentTime = 10;
    await emit('timeupdate');
    expect(JSON.parse(localStorage.getItem(resumeKey('tour-1'))!)).toMatchObject({ language: 'en' });
  });

  it('un manifeste refusé se réessaie explicitement sans boucle', async () => {
    mockGetPublishedTourContent.mockResolvedValueOnce({ ok: false, error: 'réseau' });
    render(<Harness />);
    await screen.findByText('Langues momentanément indisponibles.');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer les langues' }));
    await ready();
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('option', { name: 'English — Voix de synthèse' })).toBeVisible();
  });

  it('une source inconnue est nommée origine, jamais français', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1, s2: URL_S2 }));
    render(<Harness baseLanguage="und" />);
    await ready();
    expect(selector()).toHaveValue('und');
    expect(screen.getByRole('option', { name: /Langue d’origine/ })).toBeVisible();
    expect(screen.queryByRole('option', { name: /Français/ })).not.toBeInTheDocument();
  });

  it('la relance réseau conserve la traduction et reste unique', async () => {
    render(<Harness locale="en" />);
    await ready();
    await click('s1');
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1_RENEWED, s2: URL_S2 }, FRESH, undefined, { s1: { en: 'https://media.example/en-s1?sig=two' } }));
    audio().currentTime = 28;
    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    expect(audio().src).toBe('https://media.example/en-s1?sig=two');
    expect(audio().currentTime).toBe(28);
    await emit('error');
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('scene-error-s1')).toHaveTextContent('Audio temporarily unavailable');
  });

  it('une réponse de lecture antérieure ne remplace pas la langue nouvellement choisie', async () => {
    render(<Harness />);
    await ready();
    let finish!: () => void;
    playSpy.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    fireEvent.click(button('s1'));
    await act(async () => {});
    await choose('en');
    await act(async () => finish());
    expect(audio().src).toBe(EN_S1);
    expect(jest.mocked(trackEvent).mock.calls.filter(([event]) => event === 'web_listen_start')).toHaveLength(1);
  });

  it('la déconnexion purge le choix, la reprise et les variantes signées', async () => {
    render(<Harness />);
    await ready();
    await choose('en');
    await click('s1');
    act(() => clearAllResumes());
    expect(localStorage.getItem(`${LANGUAGE_KEY_PREFIX}tour-1`)).toBeNull();
    expect(audio()).not.toHaveAttribute('src');
    expect(screen.queryByRole('option', { name: /English/ })).not.toBeInTheDocument();
  });

  it('une traduction retirée se replie explicitement sur la source, à zéro', async () => {
    writeLanguageChoice('tour-1', 'de');
    render(<Harness locale="en" />);
    await ready();
    await click('s1');
    audio().currentTime = 28;
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1_RENEWED, s2: URL_S2 }, FRESH, undefined, { s1: { en: EN_S1 } }));
    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    expect(audio().src).toBe(URL_S1_RENEWED);
    expect(audio().currentTime).toBe(0);
    expect(selector()).toHaveValue('de');
    expect(screen.getByText('2 stops will play in French.')).toBeVisible();
    audio().currentTime = 5;
    await emit('timeupdate');
    expect(JSON.parse(localStorage.getItem(resumeKey('tour-1'))!)).toMatchObject({ language: 'fr' });
    expect(jest.mocked(trackEvent).mock.calls.filter(([event]) => event === 'web_listen_start')).toHaveLength(1);
  });

  it('le bouton langues force une requête après échec média malgré un cache frais', async () => {
    render(<Harness />);
    await ready();
    await click('s1');
    mockGetPublishedTourContent.mockResolvedValueOnce({ ok: false, error: 'réseau' });
    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    fireEvent.click(screen.getByRole('button', { name: 'Réessayer les langues' }));
    await act(async () => {});
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(3);
    expect(screen.queryByText('Langues momentanément indisponibles.')).not.toBeInTheDocument();
  });

  it('pause pendant relance puis reprise : changer de langue continue la lecture', async () => {
    render(<Harness />);
    await ready();
    await click('s1');
    let finish!: (value: ReturnType<typeof response>) => void;
    mockGetPublishedTourContent.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    fakeError = { code: MEDIA_ERR_NETWORK };
    await emit('error');
    await click('s1');
    await act(async () => finish(multilingual()));
    await click('s1');
    const calls = playSpy.mock.calls.length;
    await choose('en');
    expect(playSpy).toHaveBeenCalledTimes(calls + 1);
    expect(button('s1')).toHaveTextContent('Pause');
  });

  it.each([false, true])('achat : préférence réapparue ou choix explicite conservé (%s)', async (explicit) => {
    writeLanguageChoice('tour-1', 'ja');
    const view = render(<Harness locale="en" ids={['s1']} />);
    await ready();
    if (explicit) await choose('de');
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: URL_S1, s2: URL_S2 }, FRESH, undefined, { s1: { en: EN_S1, de: DE_S1 }, s2: { ja: 'https://media.example/ja.mp3' } }));
    act(() => window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT)));
    view.rerender(<Harness locale="en" ids={['s1', 's2']} />);
    await ready();
    expect(selector()).toHaveValue(explicit ? 'de' : 'ja');
    await click('s2');
    expect(audio().src).toBe(explicit ? URL_S2 : 'https://media.example/ja.mp3');
  });

  it.each([false, true])('une ancienne génération partage la requête ou le cache du nouvel achat (réponse récente en premier : %s)', async (newFirst) => {
    let old!: (value: ReturnType<typeof response>) => void;
    let current!: (value: ReturnType<typeof response>) => void;
    mockGetPublishedTourContent.mockReturnValueOnce(new Promise((resolve) => { old = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { current = resolve; }));
    render(<Harness locale="en" />);
    await act(async () => {});
    act(() => window.dispatchEvent(new Event(PURCHASES_CHANGED_EVENT)));
    await act(async () => {});
    if (newFirst) await act(async () => current(multilingual()));
    await act(async () => old(response({ s1: URL_S1 })));
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
    if (!newFirst) await act(async () => current(multilingual()));
    await click('s1');
    expect(audio().src).toBe(EN_S1);
    expect(mockGetPublishedTourContent).toHaveBeenCalledTimes(2);
  });

  it('traduction seule : jouable, puis indisponible si la langue choisie n’a aucun repli', async () => {
    mockGetPublishedTourContent.mockResolvedValue(response({ s1: undefined }, FRESH, undefined, { s1: { en: EN_S1 } }));
    render(<Harness locale="en" ids={['s1']} />);
    await ready();
    await click('s1');
    expect(audio().src).toBe(EN_S1);
    await choose('fr');
    expect(screen.getByTestId('scene-error-s1')).toHaveTextContent('Audio temporarily unavailable');
    expect(playSpy).toHaveBeenCalledTimes(1);
  });

  it('changement de langue avec manifeste périmé en vol, puis purge : aucune lecture tardive', async () => {
    render(<Harness />);
    await ready();
    await click('s1');
    let finish!: (value: ReturnType<typeof response>) => void;
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(BASE_NOW + 20 * 60_000);
    mockGetPublishedTourContent.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    await choose('en');
    expect(selector()).toBeDisabled();
    act(() => clearAllResumes());
    await act(async () => finish(multilingual()));
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(audio()).not.toHaveAttribute('src');
  });
});
