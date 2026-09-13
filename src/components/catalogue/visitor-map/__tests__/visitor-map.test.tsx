import { act, fireEvent, render, screen } from '@testing-library/react';
import VisitorMap from '../visitor-map';
import { distanceMeters, nearestStop, validCoordinate, type MapStop } from '../geo';
import { mapScenesToPois } from '@/lib/catalogue/scene-pois';
const toggle = jest.fn();
jest.mock('@/components/catalogue/scene-player', () => ({ useTourPlayer: () => ({ currentSceneId: 's1', toggle }) }));
jest.mock('next/dynamic', () => ({ __esModule: true, default: (_loader: unknown, options: { ssr: boolean }) => {
  if (options.ssr !== false) throw new Error('SSR interdit pour Leaflet');
  return function Canvas(props: { stops: MapStop[]; currentId: string; path: unknown[]; onListen(id: string): void }) {
    return <div data-testid="canvas" data-current={props.currentId} data-path={props.path.length}>{props.stops.map((s) => <button key={s.id} disabled={!s.listenable} onClick={() => props.onListen(s.id)}>{s.title}</button>)}</div>;
  }; } }));
let success: PositionCallback;
let failure: PositionErrorCallback;
const clearWatch = jest.fn();
const watchPosition = jest.fn((ok: PositionCallback, fail: PositionErrorCallback) => { success = ok; failure = fail; return 7; });
const pois = ['s1', 's2', 's3'].map((id, i) => ({ id, order: i + 1, title: `Secret ${id}`, description: '', latitude: 43 + i / 100, longitude: 7, hasCoordinates: true, hasAudio: true }));
beforeEach(() => {
  jest.clearAllMocks();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { watchPosition, clearWatch } });
});
function locate(lat = 43) { act(() => success({ coords: { latitude: lat, longitude: 7 } } as GeolocationPosition)); }

it('distance connue, coordonnées invalides et égalité stable', () => {
  expect(distanceMeters({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111194.9, 0);
  expect(validCoordinate({ latitude: NaN, longitude: 7 })).toBe(false);
  expect(validCoordinate({ latitude: 91, longitude: 7 })).toBe(false);
  const stops = pois.map((p) => ({ ...p, locked: false, listenable: true }));
  expect(nearestStop(stops, stops[0])?.stop.id).toBe('s1');
  expect(nearestStop([stops[0], { ...stops[0], id: 'equal' }], stops[0])?.stop.id).toBe('s1');
  expect(nearestStop([], stops[0])).toBeNull();
});
it('distingue coordonnées absentes et véritable origine géographique', () => {
  const base = { id: 'origin', order: 0, title: 'Origine', description: '', photos: [] };
  const [missing, origin] = mapScenesToPois([base, { ...base, latitude: 0, longitude: 0 }]);
  expect(missing.hasCoordinates).toBe(false);
  expect(origin.hasCoordinates).toBe(true);
  render(<VisitorMap pois={[origin]} hasAccess locale="fr" />);
  expect(screen.getByTestId('visitor-map')).toBeVisible();
});
it('diffère la carte, masque le titre verrouillé, transmet tracé et scène active', () => {
  render(<VisitorMap pois={pois} path={[pois[0], pois[1]]} hasAccess={false} locale="fr" />);
  expect(screen.queryByTestId('canvas')).toBeNull();
  expect(watchPosition).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Afficher la carte'));
  expect(screen.getByTestId('canvas')).toHaveAttribute('data-current', 's1');
  expect(screen.getByTestId('canvas')).toHaveAttribute('data-path', '2');
  expect(screen.queryByText('Secret s3')).toBeNull();
  expect(screen.queryByText('Secret s2')).toBeNull();
  const locked = screen.getAllByText('Étape verrouillée');
  expect(locked).toHaveLength(2);
  locked.forEach(stop => expect(stop).toBeDisabled());
  fireEvent.click(screen.getByText('Secret s1'));
  expect(toggle).toHaveBeenCalledWith('s1');
});
it('GPS au clic, aucun autoplay, écoute de la plus proche au second clic et nettoyage', () => {
  const view = render(<VisitorMap pois={pois} hasAccess={false} locale="en" />);
  fireEvent.click(screen.getByText('Locate me'));
  expect(watchPosition).toHaveBeenCalledTimes(1);
  locate();
  expect(toggle).not.toHaveBeenCalled();
  expect(screen.getByTestId('nearest-stop')).toHaveTextContent('0 m');
  fireEvent.click(screen.getByText('Listen to this stop'));
  expect(toggle).toHaveBeenCalledWith('s1');
  view.unmount();
  expect(clearWatch).toHaveBeenCalledWith(7);
});
it('la plus proche verrouillée ne révèle rien et ne propose pas de lecture', () => {
  render(<VisitorMap pois={pois} hasAccess={false} locale="fr" />);
  fireEvent.click(screen.getByText('Me situer'));
  locate(43.02);
  expect(screen.getByTestId('nearest-stop')).toHaveTextContent('Étape verrouillée');
  expect(screen.queryByText('Écouter cette étape')).toBeNull();
  expect(screen.queryByText('Secret s3')).toBeNull();
});
it('refus et réponse tardive après arrêt restent non bloquants', () => {
  render(<VisitorMap pois={pois} hasAccess locale="fr" />);
  fireEvent.click(screen.getByText('Me situer'));
  act(() => failure({ code: 1 } as GeolocationPositionError));
  expect(screen.getByRole('status')).toHaveTextContent('Localisation refusée');
  expect(screen.getByTestId('canvas')).toBeVisible();
  locate();
  expect(screen.queryByTestId('nearest-stop')).toBeNull();
});
it('page masquée : stoppe le suivi sans reprise automatique', () => {
  render(<VisitorMap pois={pois} hasAccess locale="fr" />);
  fireEvent.click(screen.getByText('Me situer'));
  locate();
  const hidden = jest.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(clearWatch).toHaveBeenCalledWith(7);
  locate();
  expect(screen.queryByTestId('nearest-stop')).toBeNull();
  hidden.mockRestore();
});

it('charge au viewport et nettoie son observer', () => {
  let callback!: IntersectionObserverCallback;
  const disconnect = jest.fn();
  const original = window.IntersectionObserver;
  window.IntersectionObserver = jest.fn((cb) => { callback = cb; return { observe: jest.fn(), disconnect }; }) as unknown as typeof IntersectionObserver;
  try {
    const view = render(<VisitorMap pois={[]} hasAccess locale="fr" />);
    view.rerender(<VisitorMap pois={pois} hasAccess locale="fr" />);
    expect(screen.queryByTestId('canvas')).toBeNull();
    act(() => callback([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver));
    expect(screen.getByTestId('canvas')).toBeVisible();
    expect(watchPosition).not.toHaveBeenCalled();
    view.unmount();
    expect(disconnect).toHaveBeenCalled();
  } finally { window.IntersectionObserver = original; }
});

it('absence de GPS et coordonnées manquantes ne bloquent pas la liste', () => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
  const view = render(<VisitorMap pois={pois} hasAccess locale="fr" />);
  fireEvent.click(screen.getByText('Me situer'));
  expect(screen.getByRole('status')).toHaveTextContent('Position indisponible');
  view.rerender(<VisitorMap pois={pois.map((p) => ({ ...p, hasCoordinates: false }))} hasAccess locale="fr" />);
  expect(screen.queryByTestId('visitor-map')).toBeNull();
});
