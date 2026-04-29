import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionCard } from '../session-card';
import type { StudioSession } from '@/types/studio';

const mockSession: StudioSession = {
  id: 'test-session-1',
  guideId: 'guide-1',
  sourceSessionId: 'mobile-001',
  tourId: null,
  title: 'Grasse — Parfumeurs',
  status: 'draft',
  language: 'fr',
  transcriptionQuotaUsed: null,
  coverPhotoKey: null,
  availableLanguages: ['fr'],
  translatedTitles: null,
  translatedDescriptions: null,
  version: 1,
  consentRGPD: true,
  createdAt: '2026-03-10T14:30:00.000Z',
  updatedAt: '2026-03-10T14:30:00.000Z',
};

describe('SessionCard', () => {
  it('renders session title', () => {
    render(<SessionCard session={mockSession} />);
    expect(screen.getByText('Grasse — Parfumeurs')).toBeInTheDocument();
  });

  it('renders scenes count', () => {
    render(<SessionCard session={mockSession} scenesCount={5} />);
    expect(screen.getByText('5 sc.')).toBeInTheDocument();
  });

  it('renders singular scene for count 1', () => {
    render(<SessionCard session={mockSession} scenesCount={1} />);
    expect(screen.getByText('1 sc.')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<SessionCard session={mockSession} />);
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
  });

  it('renders formatted date', () => {
    render(<SessionCard session={mockSession} />);
    expect(screen.getByText(/10 mars/i)).toBeInTheDocument();
  });

  it('calls onClick with session id', () => {
    const handleClick = jest.fn();
    render(<SessionCard session={mockSession} onClick={handleClick} />);
    // Wrapper is a div (the inner button carries onClick — sibling delete button forbids button-in-button nesting)
    const card = screen.getByTestId('session-card-test-session-1');
    const navButton = card.querySelector('button');
    fireEvent.click(navButton!);
    expect(handleClick).toHaveBeenCalledWith('test-session-1');
  });

  it('renders fallback title when title is null', () => {
    render(<SessionCard session={{ ...mockSession, title: null }} />);
    expect(screen.getByText('Session sans titre')).toBeInTheDocument();
  });

  it('renders version badge when version > 1', () => {
    render(<SessionCard session={{ ...mockSession, version: 2 }} />);
    expect(screen.getByText('V2')).toBeInTheDocument();
  });

  it('does not render version badge for V1', () => {
    render(<SessionCard session={mockSession} />);
    expect(screen.queryByText('V1')).not.toBeInTheDocument();
  });

  describe('compact mode', () => {
    it('always shows version label', () => {
      render(<SessionCard session={mockSession} compact />);
      expect(screen.getByText('V1')).toBeInTheDocument();
    });

    it('shows status badge', () => {
      render(<SessionCard session={{ ...mockSession, status: 'published' }} compact />);
      expect(screen.getByText('Publié')).toBeInTheDocument();
    });
  });
});
