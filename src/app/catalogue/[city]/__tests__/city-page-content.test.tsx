/**
 * Lot SEO-3 — la page ville porte, dans chacune des six langues, un contenu
 * qui lui est propre : introduction relue quand elle existe, faits réels du
 * catalogue toujours, et des liens vers les autres destinations.
 */
import { render, screen, cleanup, within } from '@testing-library/react';
import { SITE_LOCALES } from '@/lib/i18n/locales';
import { cityFactsCopy } from '@/lib/cities/city-facts';
import { CITY_INTROS } from '@/lib/cities/city-intro';

jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/lib/api/tours-server', () => ({
  getCities: async () => [
    { id: 'nice', name: 'Nice', slug: 'nice', description: '', tourCount: 2 },
    { id: 'arles', name: 'Arles', slug: 'arles', description: '', tourCount: 1 },
    { id: 'vide', name: 'Vide', slug: 'vide', description: '', tourCount: 0 },
  ],
  getCityBySlug: async (slug: string) => ({ id: slug, name: 'Nice', slug, description: '', tourCount: 2 }),
  getToursByCity: async () => [
    { id: 't1', title: 'Vieux Nice', slug: 'vieux-nice', citySlug: 'nice', city: 'Nice', guideId: 'g1', guideName: 'Marie Dupont',
      description: 'd', shortDescription: 'd', duration: 45, distance: 2, poiCount: 6, isFree: true, status: 'published',
      availableLanguages: ['fr', 'en'], sourceLanguage: 'fr' },
    { id: 't2', title: 'Promenade', slug: 'promenade', citySlug: 'nice', city: 'Nice', guideId: 'g2', guideName: 'Jean Martin',
      description: 'd', shortDescription: 'd', duration: 70, distance: 3, poiCount: 8, isFree: true, status: 'published',
      availableLanguages: ['fr'], sourceLanguage: 'fr' },
  ],
}));
jest.mock('@/lib/api/guides-public-server', () => ({ getGuidesByCity: async () => [] }));
jest.mock('../tour-list-filter', () => ({ TourListWithFilter: () => null }));

import { LocalizedCityPage } from '../page';

const renderCity = async (locale: (typeof SITE_LOCALES)[number]) =>
  render(await LocalizedCityPage({ params: Promise.resolve({ city: 'nice' }), searchParams: Promise.resolve({}), locale }));

describe('contenu localisé de la page ville', () => {
  afterEach(cleanup);

  it.each(SITE_LOCALES)('donne un texte propre à la ville et à la langue en %s', async locale => {
    await renderCity(locale);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Nice');
    // Introduction relue de la ville, dans sa langue.
    expect(screen.getByText(CITY_INTROS.nice[locale])).toBeInTheDocument();
    // Faits réels : deux visites, de 45 à 70 minutes, deux guides.
    const copy = cityFactsCopy(locale);
    const terms = screen.getAllByRole('term').map(node => node.textContent);
    expect(terms).toContain(copy.labels.tours);
    expect(terms).toContain(copy.labels.duration);
    expect(terms).toContain(copy.labels.languages);
    expect(terms).toContain(copy.labels.guides);
    const definitions = screen.getAllByRole('definition').map(node => node.textContent);
    expect(definitions).toContain('2');
    expect(definitions.join(' ')).toContain('45');
    expect(definitions.join(' ')).toContain('70');
    expect(definitions.join(' ')).toContain('Marie Dupont');
  });

  it.each(SITE_LOCALES)('relie la ville aux autres destinations sans perdre la langue en %s', async locale => {
    await renderCity(locale);
    const prefix = locale === 'fr' ? '' : `/${locale}`;
    const others = screen.getByRole('heading', { level: 2, name: cityFactsCopy(locale).otherCities }).parentElement!;
    const links = within(others).getAllByRole('link');
    expect(links.map(l => l.getAttribute('href'))).toEqual([`${prefix}/catalogue/arles`]);
    // Le fil d'Ariane reste dans la langue de la page.
    expect(screen.getAllByRole('link').some(l => l.getAttribute('href') === `${prefix}/catalogue`)).toBe(true);
  });

  it('n’annonce ni la ville vide ni elle-même dans les autres destinations', async () => {
    await renderCity('fr');
    const hrefs = screen.getAllByRole('link').map(l => l.getAttribute('href'));
    expect(hrefs).not.toContain('/catalogue/vide');
    expect(hrefs).not.toContain('/catalogue/nice');
  });

  it('écrit le texte principal dans le HTML serveur, sans JavaScript', async () => {
    const { container } = await renderCity('de');
    expect(container.textContent).toContain(CITY_INTROS.nice.de);
    expect(container.textContent).toContain('Audiotouren in Nice');
  });
});
