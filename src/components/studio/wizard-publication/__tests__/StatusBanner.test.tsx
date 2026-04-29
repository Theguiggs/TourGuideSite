import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBanner } from '../StatusBanner';

describe('StatusBanner', () => {
  it("rend label, version et message", () => {
    render(
      <StatusBanner variant="draft" label="Brouillon" version={1}>
        Votre parcours est en brouillon.
      </StatusBanner>,
    );
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
    expect(screen.getByText('V1')).toBeInTheDocument();
    expect(screen.getByText(/en brouillon/)).toBeInTheDocument();
  });

  it("data-variant correspond au variant", () => {
    render(<StatusBanner variant="published" label="Publié">x</StatusBanner>);
    expect(screen.getByTestId('status-banner')).toHaveAttribute('data-variant', 'published');
  });

  it("masque la version si non fournie", () => {
    render(<StatusBanner variant="draft" label="X">y</StatusBanner>);
    expect(screen.queryByText(/^V/)).toBeNull();
  });

  it("supporte tous les variants", () => {
    const variants = ['draft', 'submitted', 'revision', 'rejected', 'published'] as const;
    variants.forEach((v) => {
      const { unmount } = render(
        <StatusBanner variant={v} label="X">y</StatusBanner>,
      );
      expect(screen.getByTestId('status-banner')).toHaveAttribute('data-variant', v);
      unmount();
    });
  });
});
