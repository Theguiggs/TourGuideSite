import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it("rend titre et description", () => {
    render(<EmptyState title="Aucun tour" description="Créez-en un." />);
    expect(screen.getByText('Aucun tour')).toBeInTheDocument();
    expect(screen.getByText('Créez-en un.')).toBeInTheDocument();
  });

  it("rend l'icône optionnelle", () => {
    render(<EmptyState title="X" icon="✦" />);
    expect(screen.getByText('✦')).toBeInTheDocument();
  });

  it("rend un Link quand cta.href fourni", () => {
    render(<EmptyState title="X" cta={{ label: 'Aller', href: '/some' }} />);
    const link = screen.getByRole('link', { name: /Aller/ });
    expect(link).toHaveAttribute('href', '/some');
  });

  it("rend un button + appelle onClick", () => {
    const onClick = jest.fn();
    render(<EmptyState title="X" cta={{ label: 'Action', onClick }} />);
    fireEvent.click(screen.getByRole('button', { name: /Action/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("masque le CTA si non fourni", () => {
    render(<EmptyState title="X" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
