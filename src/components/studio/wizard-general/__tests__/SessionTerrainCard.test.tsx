import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SessionTerrainCard } from '../SessionTerrainCard';

describe('SessionTerrainCard', () => {
  it("rend le résumé scènes + date", () => {
    render(<SessionTerrainCard scenesCount={6} capturedAt="2026-04-02T00:00:00Z" />);
    expect(screen.getByText(/6 scènes/)).toBeInTheDocument();
  });

  it("est ouverte par défaut", () => {
    render(<SessionTerrainCard scenesCount={3} capturedAt="2026-04-02T00:00:00Z" status="draft" />);
    expect(screen.getByText('Statut')).toBeInTheDocument();
    expect(screen.getByTestId('session-terrain-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  it("respecte defaultCollapsed", () => {
    render(<SessionTerrainCard scenesCount={3} defaultCollapsed />);
    expect(screen.queryByText('Scènes')).toBeNull();
    expect(screen.getByTestId('session-terrain-toggle')).toHaveAttribute('aria-expanded', 'false');
  });

  it("toggle au clic", () => {
    render(<SessionTerrainCard scenesCount={3} />);
    const toggle = screen.getByTestId('session-terrain-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it("affiche '— ' fallback pour date null", () => {
    render(<SessionTerrainCard scenesCount={1} capturedAt={null} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it("rend la singularité 'scène' pour 1", () => {
    render(<SessionTerrainCard scenesCount={1} />);
    expect(screen.getByText(/1 scène$|1 scène ·/)).toBeTruthy();
  });
});
