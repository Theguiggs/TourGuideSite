import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MesVisitesContent } from '../mes-visites-content';
import { clearAllResumes, writeResume } from '../scene-player/resume-store';
import type { PurchasedTour } from '@/types/purchase';

let mockAccount = 'a';
const mockGet = jest.fn();
jest.mock('@/lib/auth/auth-context', () => ({ useAuth: () => ({ user: { id: mockAccount }, isAuthenticated: true, isLoading: false }) }));
jest.mock('@/lib/api/purchases-client', () => ({ getMyPurchasesClient: () => mockGet() }));
jest.mock('../purchased-tour-card', () => ({ PurchasedTourCard: ({ purchase, resume }: { purchase: PurchasedTour; resume?: boolean }) => <div>{purchase.tour.title}{resume && ' — Reprendre'}</div> }));
const purchase = (id: string) => ({ tour: { id, title: id, status: 'published' }, purchasedAt: '' }) as PurchasedTour;

beforeEach(() => { mockAccount = 'a'; mockGet.mockReset(); localStorage.clear(); });

it('ignore la réponse tardive du compte précédent', async () => {
  let finish!: (value: unknown) => void;
  mockGet.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<MesVisitesContent />);
  mockAccount = 'b';
  mockGet.mockResolvedValue({ purchases: [purchase('visite B')] });
  view.rerender(<MesVisitesContent />);
  await screen.findByText('visite B');
  await act(async () => finish({ purchases: [purchase('visite A')] }));
  expect(screen.queryByText('visite A')).not.toBeInTheDocument();
});

it('propose une nouvelle tentative après rejet réseau', async () => {
  mockGet.mockRejectedValueOnce(new Error('réseau')).mockResolvedValue({ purchases: [purchase('retour')] });
  render(<MesVisitesContent />);
  fireEvent.click(await screen.findByRole('button', { name: 'Réessayer' }));
  await screen.findByText('retour');
});

it('distingue la reprise locale puis la retire après purge', async () => {
  writeResume('audio', { sceneId: 'scene', position: 12, language: 'en' });
  mockGet.mockResolvedValue({ purchases: [purchase('audio'), purchase('autre')] });
  render(<MesVisitesContent />);
  await screen.findByText('audio — Reprendre');
  expect(screen.getByText('Vos autres visites')).toBeInTheDocument();
  await act(async () => clearAllResumes());
  await waitFor(() => expect(screen.queryByText('audio — Reprendre')).not.toBeInTheDocument());
  expect(screen.getByText('audio')).toBeInTheDocument();
});
