import { useStudioSessionStore } from '../studio-session-store';
import type { StudioSession } from '@/types/studio';

const mockSession = (status: StudioSession['status']): StudioSession => ({
  id: 'test-session',
  guideId: 'guide-1',
  sourceSessionId: 'mobile-001',
  tourId: null,
  title: 'Test Session',
  status,
  language: 'fr',
  transcriptionQuotaUsed: null,
  coverPhotoKey: null,
  availableLanguages: ['fr'],
  translatedTitles: null,
  translatedDescriptions: null,
  version: 1,
  consentRGPD: true,
  createdAt: '2026-03-10T14:30:00.000Z',
  updatedAt: '2026-03-10T14:30:00.000Z',
});

describe('useStudioSessionStore', () => {
  beforeEach(() => {
    useStudioSessionStore.getState().clearSession();
  });

  it('starts with no active session', () => {
    const state = useStudioSessionStore.getState();
    expect(state.activeSession).toBeNull();
    expect(state.currentStep).toBe('general');
  });

  it('draft maps to general step', () => {
    useStudioSessionStore.getState().setActiveSession(mockSession('draft'));
    expect(useStudioSessionStore.getState().currentStep).toBe('general');
  });

  it('transcribing/editing/recording map to scenes step', () => {
    for (const status of ['transcribing', 'editing', 'recording'] as const) {
      useStudioSessionStore.getState().setActiveSession(mockSession(status));
      expect(useStudioSessionStore.getState().currentStep).toBe('scenes');
    }
  });

  it('ready maps to preview', () => {
    useStudioSessionStore.getState().setActiveSession(mockSession('ready'));
    expect(useStudioSessionStore.getState().currentStep).toBe('preview');
  });

  it('submitted/published map to submission', () => {
    for (const status of ['submitted', 'published'] as const) {
      useStudioSessionStore.getState().setActiveSession(mockSession(status));
      expect(useStudioSessionStore.getState().currentStep).toBe('submission');
    }
  });

  it('revision_requested/rejected map to scenes', () => {
    for (const status of ['revision_requested', 'rejected'] as const) {
      useStudioSessionStore.getState().setActiveSession(mockSession(status));
      expect(useStudioSessionStore.getState().currentStep).toBe('scenes');
    }
  });

  it('clears session', () => {
    useStudioSessionStore.getState().setActiveSession(mockSession('editing'));
    useStudioSessionStore.getState().clearSession();
    expect(useStudioSessionStore.getState().activeSession).toBeNull();
    expect(useStudioSessionStore.getState().currentStep).toBe('general');
  });

  it('completed steps advance correctly', () => {
    useStudioSessionStore.getState().setActiveSession(mockSession('recording'));
    const completed = useStudioSessionStore.getState().completedSteps;
    expect(completed).toContain('general');
    expect(completed).toContain('itinerary');
    expect(completed).not.toContain('scenes');
  });
});
