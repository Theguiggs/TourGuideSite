/**
 * Lot 0.1 — rien n'est mesuré avant le consentement ; refuser est aussi
 * simple qu'accepter ; le choix tient d'une visite à l'autre.
 */
const mockInit = jest.fn();
jest.mock('@/lib/amplitude', () => ({ initAmplitude: () => mockInit() }));
jest.mock('next/navigation', () => ({ usePathname: () => '/catalogue' }));

import { render, screen, fireEvent, act } from '@testing-library/react';
import AmplitudeProvider from '../AmplitudeProvider';
import { writeCookieConsent } from '@/lib/cookie-consent';

describe('AmplitudeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("n'initialise pas Amplitude sans choix, et montre le bandeau", () => {
    render(<AmplitudeProvider><p>page</p></AmplitudeProvider>);
    expect(mockInit).not.toHaveBeenCalled();
    expect(screen.getByTestId('cookie-consent-banner')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refuser' })).toBeInTheDocument();
  });

  it('démarre Amplitude à « Accepter » et retire le bandeau', async () => {
    render(<AmplitudeProvider><p>page</p></AmplitudeProvider>);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Accepter' }));
    });
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
  });

  it('à « Refuser », ne démarre rien et ne redemande pas', async () => {
    render(<AmplitudeProvider><p>page</p></AmplitudeProvider>);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Refuser' }));
    });
    expect(mockInit).not.toHaveBeenCalled();
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
  });

  it('respecte un choix déjà enregistré', () => {
    writeCookieConsent('accepted');
    render(<AmplitudeProvider><p>page</p></AmplitudeProvider>);
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
  });
});
