import {render, screen} from '@testing-library/react';
import {LaunchOfferBanner} from '../LaunchOfferBanner';
import {SITE_LOCALES} from '@/lib/i18n/locales';

describe('LaunchOfferBanner', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_START_AT = '2020-10-01T00:00:00.000Z';
    process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_END_AT = '2099-11-01T00:00:00.000Z';
  });
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_START_AT;
    delete process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_END_AT;
  });

  it.each(SITE_LOCALES)('rend l’offre et une connexion localisée en %s', locale => {
    render(<LaunchOfferBanner locale={locale} />);
    expect(screen.getByTestId('launch-offer-banner')).toHaveTextContent('2099');
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe(locale === 'fr' ? '/connexion' : `/${locale}/sign-in`);
  });
});
