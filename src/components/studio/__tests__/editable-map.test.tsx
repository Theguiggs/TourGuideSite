import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { StudioScene } from '@/types/studio';
import { EditableMap } from '../editable-map';

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  Polyline: () => null,
  Popup: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Marker: ({ title, icon }: { title?: string; icon?: { number?: number } }) => (
    <div data-testid="poi-marker" data-number={icon?.number} title={title} />
  ),
  useMap: () => ({
    dragging: { disable: jest.fn(), enable: jest.fn() },
    getContainer: () => document.createElement('div'),
    getZoom: () => 12,
    flyTo: jest.fn(),
  }),
  useMapEvents: () => null,
}));

jest.mock('@/components/map/FitToPoints', () => ({ FitToPoints: () => null }));
jest.mock('@/lib/maps/marker-icons', () => ({
  createNumberedIcon: (props: { number: number }) => props,
  createDotIcon: (props: unknown) => props,
}));
jest.mock('@/lib/hooks/use-walking-route', () => ({
  useWalkingRoute: () => ({
    path: [],
    segments: [],
    isLoading: false,
    totalDistanceMeters: 0,
    totalDurationSeconds: 0,
  }),
  invalidatePoint: jest.fn(),
}));
jest.mock('@/lib/i18n/studio-locale', () => ({
  useStudioLocale: () => ({ t: (fr: string) => fr }),
}));

const scene = (id: string, title: string, sceneIndex: number): StudioScene => ({
  id,
  title,
  sceneIndex,
  latitude: 43.69,
  longitude: 7.33,
} as StudioScene);

it('numbers map markers from their displayed order when persisted indexes are stale', () => {
  render(
    <EditableMap
      scenes={[
        scene('villa', 'Villa Ephrussi', 8),
        scene('promenade', 'Promenade Maurice Rouvier', 2),
      ]}
      waypoints={[]}
      onPoiDrag={jest.fn()}
      onWaypointDrag={jest.fn()}
      onWaypointAdd={jest.fn()}
      onWaypointDelete={jest.fn()}
    />,
  );

  const markers = screen.getAllByTestId('poi-marker');
  expect(markers).toHaveLength(2);
  expect(markers[0]).toHaveAttribute('data-number', '1');
  expect(markers[0]).toHaveAttribute('title', '1. Villa Ephrussi');
  expect(markers[1]).toHaveAttribute('data-number', '2');
  expect(markers[1]).toHaveAttribute('title', '2. Promenade Maurice Rouvier');
});
