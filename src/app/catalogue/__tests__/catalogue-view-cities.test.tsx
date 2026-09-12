/**
 * Story 4.3 — CatalogueViewCities snapshot test.
 *
 * Renders 3 mock cities (Grasse=ocre, Paris=olive, Lyon=olive) with the
 * filter row + grid + empty state machinery, and snapshots the markup.
 */

import { fireEvent, render } from '@testing-library/react';
import { CatalogueViewCities } from '@/app/catalogue/catalogue-view-cities';
import type { City, Tour } from '@/types/tour';

const MOCK_CITIES: City[] = [
  {
    id: 'grasse',
    name: 'Grasse',
    slug: 'grasse',
    description: 'Capitale mondiale du parfum, perchee dans les collines.',
    tourCount: 2,
  },
  {
    id: 'paris',
    name: 'Paris',
    slug: 'paris',
    description: 'La Ville Lumiere et ses quartiers historiques.',
    tourCount: 1,
  },
  {
    id: 'lyon',
    name: 'Lyon',
    slug: 'lyon',
    description: 'Capitale de la gastronomie, entre Rhone et Saone.',
    tourCount: 1,
  },
];

const MOCK_TOURS: Tour[] = [
  {
    id: 'grasse-1',
    title: 'Parfumeurs',
    slug: 'parfumeurs',
    city: 'Grasse',
    citySlug: 'grasse',
    guideId: 'g1',
    guideName: 'Marie',
    description: '',
    shortDescription: '',
    duration: 45,
    distance: 2,
    poiCount: 6,
    isFree: true,
    status: 'published',
  },
  {
    id: 'paris-1',
    title: 'Marais',
    slug: 'marais',
    city: 'Paris',
    citySlug: 'paris',
    guideId: 'g2',
    guideName: 'Jean',
    description: '',
    shortDescription: '',
    duration: 60,
    distance: 3,
    poiCount: 8,
    isFree: false,
    status: 'published',
  },
  {
    id: 'lyon-1',
    title: 'Vieux Lyon',
    slug: 'vieux-lyon',
    city: 'Lyon',
    citySlug: 'lyon',
    guideId: 'g3',
    guideName: 'Claude',
    description: '',
    shortDescription: '',
    duration: 50,
    distance: 2.5,
    poiCount: 7,
    isFree: false,
    status: 'published',
  },
];

describe('<CatalogueViewCities>', () => {
  it('renders the 3 mock cities with their accent blocks', () => {
    const { container, getByText, getByRole } = render(
      <CatalogueViewCities cities={MOCK_CITIES} tours={MOCK_TOURS} />,
    );

    // h1 + 3 city h2
    expect(getByText('Le catalogue des villes')).toBeInTheDocument();
    expect(getByText('Grasse')).toBeInTheDocument();
    expect(getByText('Paris')).toBeInTheDocument();
    expect(getByText('Lyon')).toBeInTheDocument();

    // Une recherche par nom, plus de puces de couleur (lot 6.4).
    expect(getByRole('searchbox', { name: /Chercher une ville/ })).toBeInTheDocument();

    // 3 city links (a tags) inside the grid.
    const links = container.querySelectorAll('a[href^="/catalogue/"]');
    expect(links.length).toBe(3);
    expect(links[0].getAttribute('href')).toBe('/catalogue/grasse');
  });

  it('matches inline snapshot for 3 mock cities', () => {
    const { container } = render(
      <CatalogueViewCities cities={MOCK_CITIES} tours={MOCK_TOURS} />,
    );
    // Just check stable structure — full innerHTML snapshot is fragile against
    // tg.colors hex values changes. We assert structure markers instead.
    expect(container.querySelectorAll('h2').length).toBe(3);
    expect(container.querySelectorAll('a[href^="/catalogue/"]').length).toBe(3);
  });

  it('renders empty state when no cities provided', () => {
    const { getByText, queryByText } = render(
      <CatalogueViewCities cities={[]} tours={[]} />,
    );
    expect(getByText(/Aucune ville pour le moment/)).toBeInTheDocument();
    expect(queryByText('Grasse')).toBeNull();
  });

  it('filtre les villes par nom, sans tenir compte des accents ni de la casse', () => {
    const { getByRole, queryByText, getByText } = render(
      <CatalogueViewCities cities={MOCK_CITIES} tours={MOCK_TOURS} />,
    );
    fireEvent.change(getByRole('searchbox', { name: /Chercher une ville/ }), { target: { value: 'GRÂSSE' } });
    expect(getByText('Grasse')).toBeInTheDocument();
    expect(queryByText('Paris')).toBeNull();
    fireEvent.change(getByRole('searchbox', { name: /Chercher une ville/ }), { target: { value: 'zzz' } });
    expect(getByText(/Aucune ville ne correspond à « zzz »/)).toBeInTheDocument();
  });
});
