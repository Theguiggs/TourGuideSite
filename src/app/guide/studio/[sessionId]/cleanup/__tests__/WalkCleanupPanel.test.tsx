import { render, screen, fireEvent } from '@testing-library/react';
import { WalkCleanupPanel } from '../components/WalkCleanupPanel';
import type { WalkSegment } from '@/types/studio';

// Next.js dynamic import renders a loading placeholder synchronously until the
// ssr:false chunk loads. Test on the loading shell + stats + handlers.
jest.mock('next/dynamic', () => () => {
  const DynamicStub = () => <div data-testid="walk-map-stub" />;
  return DynamicStub;
});

const walk: WalkSegment = {
  id: 'walk-1',
  sessionId: 'session-1',
  order: 2,
  startedAt: null,
  endedAt: null,
  durationMs: 125_000,
  distanceM: 1280,
  gpsTrackJson: JSON.stringify([
    { lat: 43.6, lng: 6.9 },
    { lat: 43.601, lng: 6.901 },
  ]),
  audioRefs: [],
  photoRefs: ['/walk-photo.jpg'],
  deleted: false,
  createdAt: '2026-04-01T10:00:00.000Z',
  updatedAt: '2026-04-01T10:00:00.000Z',
};

describe('WalkCleanupPanel', () => {
  it('renders stats with formatted duration and distance', () => {
    render(<WalkCleanupPanel walk={walk} onKeep={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByTestId('walk-stat-duration').textContent).toBe('2m 05s');
    expect(screen.getByTestId('walk-stat-distance').textContent).toBe('1.28 km');
    expect(screen.getByTestId('walk-stat-photos').textContent).toBe('1');
    expect(screen.getByTestId('walk-stat-audios').textContent).toBe('0');
  });

  it('calls onKeep with walk id', () => {
    const onKeep = jest.fn();
    render(<WalkCleanupPanel walk={walk} onKeep={onKeep} onDelete={jest.fn()} />);
    fireEvent.click(screen.getByTestId('walk-keep-btn'));
    expect(onKeep).toHaveBeenCalledWith('walk-1');
  });

  it('calls onDelete with walk id', () => {
    const onDelete = jest.fn();
    render(<WalkCleanupPanel walk={walk} onKeep={jest.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByTestId('walk-delete-btn'));
    expect(onDelete).toHaveBeenCalledWith('walk-1');
  });

  it('shows deleted badge when walk is deleted', () => {
    render(<WalkCleanupPanel walk={{ ...walk, deleted: true }} onKeep={jest.fn()} onDelete={jest.fn()} />);
    expect(screen.getByTestId('walk-deleted-badge')).toBeInTheDocument();
  });
});
