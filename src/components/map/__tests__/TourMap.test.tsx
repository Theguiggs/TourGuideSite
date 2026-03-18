/**
 * TourMap component tests.
 * Since Leaflet requires DOM (window/document), we test the component logic
 * and verify rendering behavior via mocked react-leaflet.
 */

// Mock react-leaflet before imports
jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ eventHandlers, children }: { eventHandlers?: { click?: () => void }; children?: React.ReactNode }) => (
    <div data-testid="marker" onClick={eventHandlers?.click}>{children}</div>
  ),
  Polyline: () => <div data-testid="polyline" />,
  useMap: () => ({
    fitBounds: jest.fn(),
    setView: jest.fn(),
    getZoom: () => 15,
    on: jest.fn(),
    off: jest.fn(),
  }),
}));

jest.mock('leaflet', () => ({
  divIcon: (opts: { html: string }) => ({ html: opts.html }),
  latLngBounds: () => ({ extend: jest.fn() }),
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
    fireEvent.click(markers[1]); // Click second marker (Fragonard)
    expect(onPoiSelect).toHaveBeenCalledWith('p2');
  });

  it('should render route polyline', () => {
    render(
      <TourMap pois={mockPois} selectedPoiId="p1" onPoiSelect={jest.fn()} />,
    );
    expect(screen.getByTestId('polyline')).toBeTruthy();
  });

  it('should render tile layer', () => {
    render(
      <TourMap pois={mockPois} selectedPoiId="p1" onPoiSelect={jest.fn()} />,
    );
    expect(screen.getByTestId('tile-layer')).toBeTruthy();
  });
});
