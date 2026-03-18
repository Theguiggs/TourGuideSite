import { create } from 'zustand';
import type { StudioSession, StudioWorkflowStep, StudioSessionStatus } from '@/types/studio';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'StudioSessionStore';

interface StudioSessionState {
  activeSession: StudioSession | null;
  currentStep: StudioWorkflowStep;
  completedSteps: StudioWorkflowStep[];
  setActiveSession: (session: StudioSession | null) => void;
  clearSession: () => void;
}

function deriveStep(status: StudioSessionStatus): StudioWorkflowStep {
  switch (status) {
    case 'draft': return 'general';
    case 'transcribing':
    case 'editing':
    case 'recording':
      return 'scenes';
    case 'ready': return 'preview';
    case 'submitted':
    case 'published':
      return 'submission';
    case 'revision_requested':
    case 'rejected':
      return 'scenes';
  }
}

function deriveCompletedSteps(status: StudioSessionStatus): StudioWorkflowStep[] {
  const allSteps: StudioWorkflowStep[] = ['general', 'itinerary', 'scenes', 'preview', 'submission'];
  const currentStep = deriveStep(status);
  const currentIndex = allSteps.indexOf(currentStep);
  return allSteps.slice(0, currentIndex);
}

export const useStudioSessionStore = create<StudioSessionState>((set) => ({
  activeSession: null,
  currentStep: 'general',
  completedSteps: [],

  setActiveSession: (session) => {
    if (session) {
      const currentStep = deriveStep(session.status);
      const completedSteps = deriveCompletedSteps(session.status);
      set({ activeSession: session, currentStep, completedSteps });
      logger.info(SERVICE_NAME, 'Active session set', { sessionId: session.id, step: currentStep });
    } else {
      set({ activeSession: null, currentStep: 'general', completedSteps: [] });
    }
  },

  clearSession: () => {
    set({ activeSession: null, currentStep: 'general', completedSteps: [] });
  },
}));

// Selectors
export const selectActiveSession = (s: StudioSessionState) => s.activeSession;
export const selectCurrentStep = (s: StudioSessionState) => s.currentStep;
export const selectCompletedSteps = (s: StudioSessionState) => s.completedSteps;
export const selectSetActiveSession = (s: StudioSessionState) => s.setActiveSession;
export const selectClearSession = (s: StudioSessionState) => s.clearSession;
