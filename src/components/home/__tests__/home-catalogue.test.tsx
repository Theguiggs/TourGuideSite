import { render, screen } from '@testing-library/react';
import { HomeCatalogue } from '../home-catalogue';
import { getAllTours } from '@/lib/api/tours-server';
import type { Tour } from '@/types/tour';

jest.mock('@/lib/api/tours-server', () => ({ getAllTours: jest.fn() }));
jest.mock('@/components/catalogue/tour-price-badge', () => ({ TourPriceBadge: () => null }));
const mockTours = jest.mocked(getAllTours);
beforeEach(() => localStorage.clear());
it.each([false, true])('laisse une issue utilisable sans suggestions (rejet API=%s)', async error => {
  if (error) mockTours.mockRejectedValueOnce(new Error('API')); else mockTours.mockResolvedValueOnce([]);
  render(await HomeCatalogue({ locale: 'fr' }));
  expect(screen.getByRole('status')).toHaveTextContent('ne sont pas disponibles');
  expect(screen.getByRole('link', { name: 'Voir toutes les destinations' })).toHaveAttribute('href', '/catalogue');
});
it('localise les liens de destinations et les visites sans inventer une durée', async () => {
  mockTours.mockResolvedValueOnce([{ id: 't', title: 'Récit', city: 'Nice', citySlug: 'nice', slug: 'recit', status: 'published', duration: NaN }] as Tour[]);
  render(await HomeCatalogue({ locale: 'en' }));
  expect(screen.getByRole('link', { name: 'Nice' })).toHaveAttribute('href', '/en/catalogue/nice');
  expect(screen.getByTestId('home-tour')).toHaveAttribute('href', '/en/catalogue/nice/recit');
  expect(screen.queryByText(/min/)).not.toBeInTheDocument();
});
