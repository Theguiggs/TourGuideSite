import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubmissionChecklist } from '../submission-checklist';
import type { StudioScene, SceneSegment } from '@/types/studio';

// --- Mock submitLanguageForModeration ---

const mockSubmit = jest.fn();

jest.mock('@/lib/api/language-purchase', () => {
  const actual = jest.requireActual('@/lib/api/language-purchase');
  return {
    ...actual,
    submitLanguageForModeration: (...args: unknown[]) => mockSubmit(...args),
  };
});

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// --- Helpers ---

function makeScene(id: string, title: string): StudioScene {
  return {
    id,
    sessionId: 'session-1',
    sceneIndex: 0,
    title,
    status: 'finalized',
    archived: false,
    photosRefs: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  } as unknown as StudioScene;
}

function makeSegment(sceneId: string, lang: string, hasText: boolean, hasAudio: boolean): SceneSegment {
  return {
    id: `seg-${sceneId}-${lang}`,
    sceneId,
    segmentIndex: 0,
    audioKey: hasAudio ? `audio/${sceneId}.mp3` : null,
    transcriptText: hasText ? `Text for ${sceneId}` : null,
    startTimeMs: null,
    endTimeMs: null,
    language: lang,
    sourceSegmentId: null,
    ttsGenerated: false,
    translationProvider: null,
    costProvider: null,
    costCharged: null,
    status: 'translated',
    manuallyEdited: false,
    translatedTitle: null,
    sourceUpdatedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

// --- Tests ---

beforeEach(() => {
  mockSubmit.mockReset();
});

describe('SubmissionChecklist', () => {
  it('displays correct scene count (X/Y) when all complete', () => {
    const scenes = [makeScene('s1', 'Intro'), makeScene('s2', 'Finale')];
    const segments = [
      makeSegment('s1', 'en', true, true),
      makeSegment('s2', 'en', true, true),
    ];

    render(
      <SubmissionChecklist
        sessionId="session-1"
        language="en"
        scenes={scenes}
        segments={segments}
        onSubmitted={jest.fn()}
      />,
    );

    expect(screen.getByTestId('submission-summary')).toHaveTextContent('2/2 scenes');
    expect(screen.getByTestId('submission-summary')).toHaveTextContent('Pret pour soumission');
  });

  it('shows incomplete status when scenes are missing text or audio', () => {
    const scenes = [makeScene('s1', 'Intro'), makeScene('s2', 'Finale')];
    const segments = [
      makeSegment('s1', 'en', true, true),
      makeSegment('s2', 'en', true, false), // missing audio
    ];

    render(
      <SubmissionChecklist
        sessionId="session-1"
        language="en"
        scenes={scenes}
        segments={segments}
        onSubmitted={jest.fn()}
      />,
    );

    expect(screen.getByTestId('submission-summary')).toHaveTextContent('1/2 scenes');
    expect(screen.getByTestId('submission-summary')).toHaveTextContent('1 scene(s) incomplete(s)');
    expect(screen.getByTestId('audio-status-s2')).toHaveTextContent('\u274C');
    expect(screen.getByTestId('text-status-s2')).toHaveTextContent('\u2705');
  });

  it('disables submit button when scenes are incomplete', () => {
    const scenes = [makeScene('s1', 'Intro')];
    const segments = [makeSegment('s1', 'en', false, false)];

    render(
      <SubmissionChecklist
        sessionId="session-1"
        language="en"
        scenes={scenes}
        segments={segments}
        onSubmitted={jest.fn()}
      />,
    );

    const button = screen.getByTestId('checklist-submit-button');
    expect(button).toBeDisabled();
  });

  it('enables submit button when all scenes are complete', () => {
    const scenes = [makeScene('s1', 'Intro')];
    const segments = [makeSegment('s1', 'en', true, true)];

    render(
      <SubmissionChecklist
        sessionId="session-1"
        language="en"
        scenes={scenes}
        segments={segments}
        onSubmitted={jest.fn()}
      />,
    );

    const button = screen.getByTestId('checklist-submit-button');
    expect(button).not.toBeDisabled();
  });

  it('calls submitLanguageForModeration and onSubmitted on success', async () => {
    mockSubmit.mockResolvedValue({
      ok: true,
      value: { moderationStatus: 'submitted' },
    });

    const onSubmitted = jest.fn();
    const scenes = [makeScene('s1', 'Intro')];
    const segments = [makeSegment('s1', 'en', true, true)];

    render(
      <SubmissionChecklist
        sessionId="session-1"
        language="en"
        scenes={scenes}
        segments={segments}
        onSubmitted={onSubmitted}
      />,
    );

    fireEvent.click(screen.getByTestId('checklist-submit-button'));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledWith('session-1', 'en', scenes, segments);
    });

    await waitFor(() => {
      expect(onSubmitted).toHaveBeenCalled();
    });
  });

  it('shows error message on submission failure', async () => {
    mockSubmit.mockResolvedValue({
      ok: false,
      error: { code: 2614, message: 'Submission failed: test error' },
    });

    const scenes = [makeScene('s1', 'Intro')];
    const segments = [makeSegment('s1', 'en', true, true)];

    render(
      <SubmissionChecklist
        sessionId="session-1"
        language="en"
        scenes={scenes}
        segments={segments}
        onSubmitted={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('checklist-submit-button'));

    await waitFor(() => {
      expect(screen.getByTestId('submission-error')).toHaveTextContent('Submission failed: test error');
    });
  });
});
