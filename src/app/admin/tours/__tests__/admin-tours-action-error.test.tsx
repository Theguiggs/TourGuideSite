/**
 * Le refus de publication doit atteindre un humain.
 *
 * `adminSetTourStatus` refuse une republication sans mention de source audio avec
 * un message 29xx explicite. La page ne lisait que `result.ok` : le bouton
 * « Réactiver » paraissait inerte et le message n arrivait nulle part.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminToursPage from '../page';
import { getAllAdminTours, adminSetTourStatus } from '@/lib/api/moderation';

jest.mock('@/lib/api/moderation', () => ({
  getAllAdminTours: jest.fn(),
  adminSetTourStatus: jest.fn(),
  adminSyncTourToQueue: jest.fn(),
  adminDeleteTour: jest.fn(),
}));

jest.mock('@/lib/api/language-purchase', () => ({
  listLanguagePurchases: jest.fn(() => Promise.resolve({ ok: true, value: [] })),
}));

const mockGetAllAdminTours = getAllAdminTours as jest.Mock;
const mockAdminSetTourStatus = adminSetTourStatus as jest.Mock;

const ARCHIVED_TOUR = {
  id: 'tour-1',
  title: 'Les Parfums Modernes',
  city: 'Grasse',
  status: 'archived',
  guideId: 'guide-1',
  poiCount: 5,
  duration: 40,
  distance: 1.8,
  sessionId: 'session-1',
  guideName: 'Marie Dupont',
};

const REFUSAL =
  '[2900] Publication refusée : aucune mention de source audio pour la langue source « fr ». Approuvez le parcours via la modération pour la dériver.';

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAllAdminTours.mockResolvedValue([ARCHIVED_TOUR]);
});

/** Ouvre le dialogue « Réactiver » puis confirme. */
async function reactivate() {
  await screen.findByText('Les Parfums Modernes');
  fireEvent.click(screen.getByRole('button', { name: 'Réactiver' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Confirmer' }));
}

describe('AdminToursPage — refus de republication', () => {
  it('affiche le message 29xx renvoyé par adminSetTourStatus', async () => {
    mockAdminSetTourStatus.mockResolvedValue({ ok: false, error: REFUSAL });

    render(<AdminToursPage />);
    await reactivate();

    const alert = await screen.findByTestId('admin-tour-action-error');
    expect(alert).toHaveTextContent('2900');
    expect(alert).toHaveTextContent(/mention de source audio/i);
  });

  it('laisse le parcours en « Archivé » quand la republication est refusée', async () => {
    mockAdminSetTourStatus.mockResolvedValue({ ok: false, error: REFUSAL });

    render(<AdminToursPage />);
    await reactivate();

    await screen.findByTestId('admin-tour-action-error');
    // Le <select> de filtre porte les mêmes libellés : on vise le badge de ligne.
    expect(screen.getByText('Archivé', { selector: 'span' })).toBeInTheDocument();
    expect(screen.queryByText('Publié', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('n affiche aucune alerte quand la republication aboutit', async () => {
    mockAdminSetTourStatus.mockResolvedValue({ ok: true });

    render(<AdminToursPage />);
    await reactivate();

    await waitFor(() =>
      expect(screen.getByText('Publié', { selector: 'span' })).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('admin-tour-action-error')).not.toBeInTheDocument();
  });

  it('efface l alerte précédente à la tentative suivante', async () => {
    mockAdminSetTourStatus.mockResolvedValueOnce({ ok: false, error: REFUSAL });

    render(<AdminToursPage />);
    await reactivate();
    await screen.findByTestId('admin-tour-action-error');

    mockAdminSetTourStatus.mockResolvedValueOnce({ ok: true });
    fireEvent.click(screen.getByRole('button', { name: 'Réactiver' }));

    await waitFor(() =>
      expect(screen.queryByTestId('admin-tour-action-error')).not.toBeInTheDocument(),
    );
  });
});
