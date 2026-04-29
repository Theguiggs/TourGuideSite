import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBanner } from '../ErrorBanner';

describe('ErrorBanner', () => {
  it("rend le titre et le contenu", () => {
    render(<ErrorBanner title="Erreur">Message</ErrorBanner>);
    expect(screen.getByText('Erreur')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
  });

  it("variant 'danger' par défaut", () => {
    render(<ErrorBanner>x</ErrorBanner>);
    expect(screen.getByTestId('error-banner')).toHaveAttribute('data-variant', 'danger');
  });

  it("variant 'warning' quand fourni", () => {
    render(<ErrorBanner variant="warning">x</ErrorBanner>);
    expect(screen.getByTestId('error-banner')).toHaveAttribute('data-variant', 'warning');
  });

  it("appelle onRetry au clic", () => {
    const onRetry = jest.fn();
    render(<ErrorBanner onRetry={onRetry}>x</ErrorBanner>);
    fireEvent.click(screen.getByTestId('error-banner-retry'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("masque le bouton retry sans onRetry", () => {
    render(<ErrorBanner>x</ErrorBanner>);
    expect(screen.queryByTestId('error-banner-retry')).toBeNull();
  });

  it("retryLabel custom respecté", () => {
    render(<ErrorBanner onRetry={jest.fn()} retryLabel="Recharger">x</ErrorBanner>);
    expect(screen.getByTestId('error-banner-retry')).toHaveTextContent('Recharger');
  });
});
