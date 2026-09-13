import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import MapCanvas from '../map-canvas';
import type { MapStop } from '../geo';
const fit = jest.fn();
const panTo = jest.fn();
jest.mock('@/components/map/FitToPoints', () => ({ FitToPoints: (props: unknown) => { fit(props); return null; } }));
jest.mock('@/lib/maps/marker-icons', () => ({ createNumberedIcon: (props: unknown) => props }));
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  Polyline: ({ positions }: { positions: unknown[] }) => <div data-testid="line" data-count={positions.length} />,
  CircleMarker: () => <div data-testid="position" />,
  Marker: ({ title, eventHandlers }: { title: string; eventHandlers: { click(): void } }) => <button onClick={eventHandlers.click}>{title}</button>,
  useMap: () => ({ panTo }),
}));
it('dessine et cadre le détour, distingue actif/proche et interdit le clic verrouillé', () => {
  const stops: MapStop[] = [
    { id: 'a', order: 1, title: 'A', latitude: 43, longitude: 7, locked: false, listenable: true },
    { id: 'b', order: 2, title: 'Locked stop', latitude: 43.01, longitude: 7, locked: true, listenable: false },
  ];
  const onListen = jest.fn();
  render(<MapCanvas stops={stops} path={[stops[0], { latitude: 44, longitude: 8 }, stops[1]]} currentId="a" nearestId="b" position={null} onListen={onListen} locale="en" />);
  expect(screen.getByTestId('line')).toHaveAttribute('data-count', '3');
  expect(fit.mock.calls[0][0].points).toContainEqual([44, 8]);
  fireEvent.click(screen.getByText('1. A — Playing'));
  expect(onListen).toHaveBeenCalledWith('a');
  fireEvent.click(screen.getByText('2. Locked stop — Nearest'));
  expect(onListen).toHaveBeenCalledTimes(1);
  expect(panTo).not.toHaveBeenCalled();
});
