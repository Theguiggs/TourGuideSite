import { render, screen, cleanup } from '@testing-library/react';
import CookieConsentBanner from '../CookieConsentBanner';
import { SiteChrome } from '../SiteChrome';
import ErrorPage from '@/app/error';
import NotFound from '@/app/not-found';
import { SITE_LOCALES } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';
import { localizePublicPath } from '@/lib/i18n/public-routes';
import { LOCALE_HEADER } from '@/lib/site';

let mockPath = '/';
let mockLocale = 'fr';
jest.mock('next/navigation', () => ({usePathname: () => mockPath, useSearchParams: () => new URLSearchParams()}));
jest.mock('next/headers', () => ({headers: async () => new Headers({[LOCALE_HEADER]: mockLocale})}));
jest.mock('../Header', () => ({__esModule: true, default: ({locale}: {locale: string}) => <span data-testid="header-locale">{locale}</span>}));
jest.mock('../Footer', () => ({__esModule: true, default: () => null}));
jest.mock('../auth/visitor-bottom-nav', () => ({VisitorBottomNav: () => <nav data-testid="visitor-nav" />}));
jest.mock('@/lib/logger', () => ({logger: {error: jest.fn()}}));

describe('language boundaries', () => {
  beforeEach(() => { localStorage.clear(); document.documentElement.lang = 'fr'; mockPath = '/'; });
  afterEach(cleanup);
  it.each(SITE_LOCALES)('localises the consent banner and privacy link in %s', locale => {
    mockPath = localizePublicPath('/', locale);
    render(<CookieConsentBanner />);
    expect(screen.getByRole('button', {name: translate(locale, 'Accepter', 'Accept')})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: translate(locale, 'En savoir plus', 'Learn more')})).toHaveAttribute('href', localizePublicPath('/confidentialite', locale));
  });
  it.each(SITE_LOCALES)('keeps a 404 and its recovery links in %s', async locale => {
    mockLocale = locale;
    render(await NotFound());
    expect(screen.getByRole('heading', {name: translate(locale, 'Page introuvable', 'Page not found')})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: translate(locale, 'Voir les visites', 'Browse the tours')})).toHaveAttribute('href', localizePublicPath('/catalogue', locale));
  });
  it('synchronises html language after a client navigation, and recognises public guide profiles', () => {
    const view = render(<SiteChrome>Page</SiteChrome>);
    mockPath = '/de/catalogue';
    view.rerender(<SiteChrome>Page</SiteChrome>);
    expect(document.documentElement.lang).toBe('de');
    expect(localStorage.getItem('murmure-studio-locale')).toBe('de');
    mockPath = '/guides/marie';
    view.rerender(<SiteChrome>Page</SiteChrome>);
    expect(document.documentElement.lang).toBe('fr');
    expect(localStorage.getItem('murmure-studio-locale')).toBe('fr');
    expect(screen.getByTestId('visitor-nav')).toBeInTheDocument();
  });
  it.each(['/guide/studio', '/admin/moderation'])('uses the stored language for errors in %s', path => {
    mockPath = path; localStorage.setItem('murmure-studio-locale', 'de');
    render(<ErrorPage error={new Error('test')} reset={() => {}} />);
    expect(screen.getByRole('heading', {name: translate('de', 'Une erreur est survenue', 'Something went wrong')})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: translate('de', 'Accueil', 'Home')})).toHaveAttribute('href', '/de');
  });
});
