import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ModerationReviewPage from '../page';
import type { ModerationDetail } from '@/types/moderation';
import type { SceneSegment } from '@/types/studio';

const mockGetModerationDetail = jest.fn();
const mockGetQueueItemIds = jest.fn();
const mockGetStudioSession = jest.fn();
const mockListSegmentsByScene = jest.fn();
const mockListLanguagePurchases = jest.fn();
const mockGetGuideTourById = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useParams: () => ({ moderationId: 'moderation-1' }),
  useSearchParams: () => new URLSearchParams('lang=en'),
}));
jest.mock('next/dynamic', () => () => function DynamicMock() { return <div data-testid="map" />; });
jest.mock('@/components/studio/s3-image', () => ({ S3Image: () => <div data-testid="image" /> }));
jest.mock('@/components/studio/audio-player', () => ({ AudioPlayerBar: () => null }));
jest.mock('@/components/studio/tour-comment-thread', () => ({ TourCommentThread: () => null }));
jest.mock('@/lib/api/moderation', () => ({
  getModerationDetail: (...args: unknown[]) => mockGetModerationDetail(...args),
  getQueueItemIds: (...args: unknown[]) => mockGetQueueItemIds(...args),
  approveTour: jest.fn(),
  rejectTour: jest.fn(),
  sendBackForRevision: jest.fn(),
  addReviewComment: jest.fn(),
}));
jest.mock('@/lib/api/language-purchase', () => {
  const actual = jest.requireActual('@/lib/api/language-purchase');
  return {
    ...actual,
    listLanguagePurchases: (...args: unknown[]) => mockListLanguagePurchases(...args),
  };
});
jest.mock('@/lib/api/studio', () => ({
  getStudioSession: (...args: unknown[]) => mockGetStudioSession(...args),
  listSegmentsByScene: (...args: unknown[]) => mockListSegmentsByScene(...args),
}));
jest.mock('@/lib/api/appsync-client', () => ({
  getGuideTourById: (...args: unknown[]) => mockGetGuideTourById(...args),
}));
jest.mock('@/lib/studio/studio-upload-service', () => ({ getPlayableUrl: jest.fn() }));
jest.mock('@/lib/studio/audio-player-service', () => ({
  audioPlayerService: { pause: jest.fn(), play: jest.fn() },
}));
jest.mock('@/lib/api/tour-comments', () => ({ addTourComment: jest.fn() }));
jest.mock('@/config/api-mode', () => ({ shouldUseStubs: () => true }));
jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
  AdminAnalyticsEvents: new Proxy({}, { get: (_target, property) => String(property) }),
}));
jest.mock('@/lib/api/guide-notifications', () => ({ sendGuideNotification: jest.fn() }));

const detail: ModerationDetail = {
  id: 'moderation-1', tourId: 'tour-1', sessionId: 'session-1', tourTitle: 'Les remparts',
  guideId: 'guide-1', guideName: 'Guide', guidePhotoUrl: null, city: 'Mennetou-sur-Cher',
  submissionDate: '2026-09-09T08:00:00.000Z', status: 'pending', isResubmission: false,
  narrationMode: 'recording',
  poiCount: 2, duration: 20, distance: 1.2, description: 'Description source.',
  descriptionLongue: '', pois: [], guideSubmissionCount: 0, guideApprovalRate: 0,
  isFirstSubmission: true, themes: ['patrimoine'], languePrincipale: 'fr', difficulty: 'facile',
  scenes: [
    { id: 'scene-1', title: 'Porte basse', order: 1, audioRef: 'fr-1.mp3', baseAudioSource: 'recording', photosRefs: [], durationSeconds: 60, latitude: 0, longitude: 0, poiDescription: null, transcriptText: 'Source un.' },
    { id: 'scene-2', title: 'Porte haute', order: 2, audioRef: 'fr-2.mp3', baseAudioSource: 'recording', photosRefs: [], durationSeconds: 60, latitude: 47, longitude: 1, poiDescription: null, transcriptText: 'Source deux.' },
  ],
  adminComments: [], heroImageUrl: null, coverPhotoKey: 'cover.jpg', contentProvenance: 'ai',
  purchaseType: 'free', priceCents: 0, guideBio: null, guideLanguages: ['fr'], guideTourCount: 1,
};

function segment(sceneId: string): SceneSegment {
  return {
    id: `segment-${sceneId}`, sceneId, segmentIndex: 0, audioKey: `${sceneId}-en.mp3`,
    transcriptText: 'Translated text.', startTimeMs: null, endTimeMs: null, language: 'en',
    sourceSegmentId: null, ttsGenerated: true, translationProvider: 'claude', costProvider: null,
    costCharged: null, status: 'tts_generated', manuallyEdited: false,
    translatedTitle: `Translated ${sceneId}`, sourceUpdatedAt: null, sourceTextHash: null,
    createdAt: '', updatedAt: '',
  };
}

describe('ModerationReviewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetModerationDetail.mockResolvedValue(detail);
    mockGetQueueItemIds.mockResolvedValue(['moderation-1']);
    mockGetStudioSession.mockResolvedValue({
      narrationMode: 'recording',
      sourceLanguage: 'fr',
      routePath: { computedPath: [{ lat: 0, lng: 0 }, { lat: 47, lng: 1 }] },
      translatedTitles: { en: 'The ramparts' },
      translatedDescriptions: { en: 'Translated description.' },
    });
    mockListLanguagePurchases.mockResolvedValue({ ok: true, value: [] });
    mockGetGuideTourById.mockResolvedValue(null);
  });

  it('bloque le bouton et montre les traductions absentes sans repli', async () => {
    mockListSegmentsByScene.mockResolvedValue([]);
    render(<ModerationReviewPage />);

    const approve = await screen.findByRole('button', { name: 'Valider et publier' });
    await waitFor(() => expect(screen.getByText(/blocage\(s\)/)).toBeInTheDocument());
    expect(approve).toBeDisabled();
    expect(screen.getAllByText('Titre non traduit').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/audio traduit/).length).toBeGreaterThan(0);
  });

  it('active le bouton uniquement après rapport conforme et checklist traduite complète', async () => {
    mockListSegmentsByScene.mockImplementation((sceneId: string) => Promise.resolve([segment(sceneId)]));
    render(<ModerationReviewPage />);

    const approve = await screen.findByRole('button', { name: 'Valider et publier' });
    await waitFor(() => expect(screen.getByText('Conforme')).toBeInTheDocument());
    expect(screen.getByText('Qualite de traduction')).toBeInTheDocument();
    expect(approve).toBeDisabled();

    screen.getAllByRole('checkbox').forEach((checkbox) => fireEvent.click(checkbox));
    expect(approve).toBeEnabled();
  });
});
