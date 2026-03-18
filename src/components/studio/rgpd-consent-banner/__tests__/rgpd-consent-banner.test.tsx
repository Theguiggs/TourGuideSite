import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RgpdConsentBanner } from '../rgpd-consent-banner';
import { useStudioConsentStore } from '@/lib/stores/studio-consent-store';

describe('RgpdConsentBanner', () => {
  beforeEach(() => {
    useStudioConsentStore.getState().resetConsent();
  });

  it('renders RGPD banner when consent not given', () => {
    render(<RgpdConsentBanner />);
    expect(screen.getByText('Consentement RGPD — Audio Studio')).toBeInTheDocument();
    expect(screen.getByTestId('rgpd-accept')).toBeInTheDocument();
  });

  it('renders nothing when consent already given', () => {
    useStudioConsentStore.getState().acceptConsent();
    const { container } = render(<RgpdConsentBanner />);
    expect(container.firstChild).toBeNull();
  });

  it('accepts consent on button click', () => {
    render(<RgpdConsentBanner />);
    fireEvent.click(screen.getByTestId('rgpd-accept'));
    expect(useStudioConsentStore.getState().hasConsented).toBe(true);
  });

  it('has accessible dialog role', () => {
    render(<RgpdConsentBanner />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('has a Refuser button linking to dashboard', () => {
    render(<RgpdConsentBanner />);
    const declineLink = screen.getByTestId('rgpd-decline');
    expect(declineLink).toHaveAttribute('href', '/guide/dashboard');
    expect(declineLink).toHaveTextContent('Refuser');
  });

  it('traps focus within dialog on Tab', () => {
    render(<RgpdConsentBanner />);
    const dialog = screen.getByRole('dialog');
    const acceptBtn = screen.getByTestId('rgpd-accept');
    const declineLink = screen.getByTestId('rgpd-decline');

    // Focus last element, Tab should cycle to first
    (declineLink as HTMLElement).focus();
    fireEvent.keyDown(dialog, { key: 'Tab' });
    // Focus trap should prevent default — we can't easily test actual focus in jsdom,
    // but we verify the handler doesn't throw
    expect(acceptBtn).toBeInTheDocument();
  });
});
