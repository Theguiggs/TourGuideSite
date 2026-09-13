import { render, screen, cleanup } from '@testing-library/react';
import { StudioLocaleProvider } from '@/lib/i18n/studio-locale';
import { SITE_LOCALES } from '@/lib/i18n/locales';
import { adminText } from '@/lib/admin/copy';
import AdminToursPage from '../tours/page';
import AdminGuidesPage from '../guides/page';
import ModerationQueuePage from '../moderation/page';
import ModerationHistoryPage from '../moderation/history/page';
import AdminNarrationPage from '../narration/page';

jest.mock('@/lib/auth/auth-context', () => ({useAuth: () => ({user: {id: 'admin'}})}));
jest.mock('@/lib/api/moderation', () => ({
  getAllAdminTours: async () => [], getAllAdminGuides: async () => [],
  getLanguageModerationQueue: async () => [], getModerationHistory: async () => [],
  getModerationMetrics: async () => ({pendingCount: 0, avgReviewTimeMinutes: 0, approvalRate: 0, reviewedThisMonth: 0}),
}));
jest.mock('@/lib/api/narration-requests', () => ({listerDemandesNarration: async () => [], resoudreEmails: async () => ({})}));
jest.mock('@/lib/analytics', () => ({trackEvent: jest.fn(), AdminAnalyticsEvents: {ADMIN_MODERATION_QUEUE_VIEW: 'queue'}}));

describe('administration pages adopt the selected language', () => {
  afterEach(() => { cleanup(); localStorage.clear(); });
  it.each(SITE_LOCALES)('renders each list and its empty state in %s', async locale => {
    localStorage.setItem('murmure-studio-locale', locale);
    for (const [Component, title, empty] of [
      [AdminToursPage, 'Toutes les visites', 'Aucune visite trouvée.'],
      [AdminGuidesPage, 'Tous les guides', 'Aucun guide trouvé.'],
      [ModerationQueuePage, "File d'attente de modération", 'Aucune visite en attente de modération.'],
      [ModerationHistoryPage, 'Historique de modération', 'Aucun historique de modération.'],
      [AdminNarrationPage, 'Narrations à la demande', 'Aucune demande.'],
    ] as const) {
      render(<StudioLocaleProvider><Component /></StudioLocaleProvider>);
      expect(await screen.findByRole('heading', {name: adminText(locale, title)})).toBeInTheDocument();
      expect((await screen.findAllByText(adminText(locale, empty))).length).toBeGreaterThan(0);
      cleanup();
    }
  });
});
