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
    expect(screen.getByText('5 scenes')).toBeInTheDocument();
  });

  it('renders singular scene for count 1', () => {
    render(<SessionCard session={mockSession} scenesCount={1} />);
    expect(screen.getByText('1 scene')).toBeInTheDocument();
  });

  it('renders status badge', () => {
    render(<SessionCard session={mockSession} />);
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
  });

  it('renders language', () => {
    render(<SessionCard session={mockSession} />);
    expect(screen.getByText('FR')).toBeInTheDocument();
  });

  it('renders formatted date', () => {
    render(<SessionCard session={mockSession} />);
    // FR locale date format
    expect(screen.getByText(/10 mars 2026/i)).toBeInTheDocument();
  });

  it('shows linked tour indicator when tourId is set', () => {
    render(<SessionCard session={{ ...mockSession, tourId: 'tour-1' }} />);
    expect(screen.getByText('Tour li\u00e9')).toBeInTheDocument();
  });

  it('does not show linked tour indicator when tourId is null', () => {
    render(<SessionCard session={mockSession} />);
    expect(screen.queryByText('Tour li\u00e9')).not.toBeInTheDocument();
  });

  it('calls onClick with session id', () => {
    const handleClick = jest.fn();
    render(<SessionCard session={mockSession} onClick={handleClick} />);
    fireEvent.click(screen.getByTestId('session-card-test-session-1'));
    expect(handleClick).toHaveBeenCalledWith('test-session-1');
  });

  it('renders fallback title when title is null', () => {
    render(<SessionCard session={{ ...mockSession, title: null }} />);
    expect(screen.getByText('Session sans titre')).toBeInTheDocument();
  });
});
