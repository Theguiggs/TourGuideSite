jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: () => <div data-testid="marker" />,
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
import TourPreviewModal from '../TourPreviewModal';
import type { MapPOI } from '../TourMap';

const mockPois: MapPOI[] = [
  { id: 'p1', order: 1, title: 'Place aux Aires', latitude: 43.6583, longitude: 6.9215 },
  { id: 'p2', order: 2, title: 'Fragonard', latitude: 43.6589, longitude: 6.9233 },
  { id: 'p3', order: 3, title: 'MIP', latitude: 43.6576, longitude: 6.9246 },
];

describe('TourPreviewModal', () => {
  it('should render tour title and route stats', () => {
    render(
      <TourPreviewModal pois={mockPois} tourTitle="Test Tour" onClose={jest.fn()} />,
    );
    expect(screen.getByText('Previsualisation du parcours')).toBeTruthy();
    expect(screen.getByText('Test Tour')).toBeTruthy();
    // Distance and time badges
    expect(screen.getByText(/km/)).toBeTruthy();
    expect(screen.getByText(/min/)).toBeTruthy();
    expect(screen.getByText('3 POIs')).toBeTruthy();
  });

  it('should render POI list with coordinates', () => {
    render(
      <TourPreviewModal pois={mockPois} tourTitle="Test" onClose={jest.fn()} />,
    );
    expect(screen.getByText('Place aux Aires')).toBeTruthy();
    expect(screen.getByText('Fragonard')).toBeTruthy();
    expect(screen.getByText('MIP')).toBeTruthy();
    expect(screen.getByText('43.6583, 6.9215')).toBeTruthy();
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(
      <TourPreviewModal pois={mockPois} tourTitle="Test" onClose={onClose} />,
    );
    fireEvent.click(screen.getByLabelText('Fermer'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose on Escape key', () => {
    const onClose = jest.fn();
    render(
      <TourPreviewModal pois={mockPois} tourTitle="Test" onClose={onClose} />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    const { container } = render(
      <TourPreviewModal pois={mockPois} tourTitle="Test" onClose={onClose} />,
    );
    // Click backdrop (outermost div)
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
