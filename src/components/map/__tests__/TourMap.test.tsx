/**
 * TourMap component tests — react-leaflet version.
 */

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ eventHandlers, title }: { eventHandlers?: { click?: () => void }; title?: string }) => (
    <div data-testid="marker" onClick={eventHandlers?.click} title={title} />
  ),
  Polyline: () => <div data-testid="polyline" />,
  useMap: () => ({ panTo: jest.fn(), fitBounds: jest.fn(), setView: jest.fn() }),
  useMapEvents: () => null,
}));

jest.mock('@/components/map/FitToPoints', () => ({
  FitToPoints: () => null,
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TourMap from '../TourMap';
import type { MapPOI } from '../TourMap';

const mockPois: MapPOI[] = [
  { id: 'p1', order: 1, title: 'Place aux Aires', latitude: 43.6583, longitude: 6.9215 },
  { id: 'p2', order: 2, title: 'Fragonard', latitude: 43.6589, longitude: 6.9233 },
  { id: 'p3', order: 3, title: 'MIP', latitude: 43.6576, longitude: 6.9246 },
];

describe('TourMap', () => {
  it('should render map container with POIs', () => {
    render(
      <TourMap pois={mockPois} selectedPoiId="p1" onPoiSelect={jest.fn()} />,
    );
    expect(screen.getByTestId('map-container')).toBeTruthy();
    expect(screen.getAllByTestId('marker')).toHaveLength(3);
    expect(screen.getByTestId('polyline')).toBeTruthy();
  });

  it('should render empty state when no POIs', () => {
    render(
      <TourMap pois={[]} selectedPoiId={null} onPoiSelect={jest.fn()} />,
    );
    expect(screen.getByText('Aucun POI avec coordonnees GPS')).toBeTruthy();
  });

  it('should call onPoiSelect when marker is clicked', () => {
    const onPoiSelect = jest.fn();
    render(
      <TourMap pois={mockPois} selectedPoiId="p1" onPoiSelect={onPoiSelect} />,
    );
    const markers = screen.getAllByTestId('marker');
    fireEvent.click(markers[1]);
    expect(onPoiSelect).toHaveBeenCalledWith('p2');
  });

  it('should render route polyline', () => {
    render(
      <TourMap pois={mockPois} selectedPoiId="p1" onPoiSelect={jest.fn()} />,
    );
    expect(screen.getByTestId('polyline')).toBeTruthy();
  });
});
