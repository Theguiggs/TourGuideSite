import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TranslationEditor } from '../translation-editor';
import { useTranslationStore } from '@/lib/stores/translation-store';
import type { SceneSegment } from '@/types/studio';

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('@/hooks/use-auto-save', () => ({
  useAutoSave: jest.fn().mockReturnValue({
    isSaving: false,
    isDirty: false,
    resetBaseline: jest.fn(),
  }),
}));

jest.mock('@/lib/studio/studio-persistence-service', () => ({
  studioPersistenceService: {
    saveDraft: jest.fn(),
    loadDraft: jest.fn().mockReturnValue(null),
  },
}));

const makeSegment = (overrides?: Partial<SceneSegment>): SceneSegment => ({
  id: 'seg-1',
  sceneId: 'scene-1',
  segmentIndex: 0,
  audioKey: null,
  transcriptText: 'Texte source en français.',
  startTimeMs: null,
  endTimeMs: null,
  language: 'fr',
  sourceSegmentId: null,
  ttsGenerated: false,
  translationProvider: null,
  costProvider: null,
  costCharged: null,
  status: 'transcribed',
  manuallyEdited: false,
  translatedTitle: null,
  sourceUpdatedAt: null,
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('TranslationEditor', () => {
  beforeEach(() => {
    useTranslationStore.getState().resetStore();
    jest.clearAllMocks();
  });

  it('shows empty state when no translation exists', () => {
    render(<TranslationEditor segment={makeSegment()} sessionId="session-1" />);
    expect(screen.getByTestId('translation-empty')).toBeInTheDocument();
  });

  it('shows processing state', () => {
    useTranslationStore.getState().setSegmentStatus('seg-1', {
      status: 'processing',
    });

    render(<TranslationEditor segment={makeSegment()} sessionId="session-1" />);
    expect(screen.getByTestId('translation-processing')).toBeInTheDocument();
    expect(screen.getByText('Traduction en cours...')).toBeInTheDocument();
  });

  it('shows error state when translation failed', () => {
    useTranslationStore.getState().setSegmentStatus('seg-1', {
      status: 'failed',
      error: 'Échec de la traduction.',
    });

    render(<TranslationEditor segment={makeSegment()} sessionId="session-1" />);
    expect(screen.getByTestId('translation-failed')).toBeInTheDocument();
    expect(screen.getByText('Échec de la traduction.')).toBeInTheDocument();
  });

  it('shows editor with source and translated text when completed', () => {
    useTranslationStore.getState().setSegmentStatus('seg-1', {
      status: 'completed',
      translatedText: 'Welcome to the Place aux Aires.',
      provider: 'deepl',
    });

    render(<TranslationEditor segment={makeSegment()} sessionId="session-1" />);
    expect(screen.getByTestId('translation-editor')).toBeInTheDocument();

    // Source text displayed
    expect(screen.getByText('Texte source en français.')).toBeInTheDocument();

    // Translated text in textarea
    const textarea = screen.getByTestId('translated-text-editor') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Welcome to the Place aux Aires.');
  });

  it('displays source language label', () => {
    useTranslationStore.getState().setSegmentStatus('seg-1', {
      status: 'completed',
      translatedText: 'Hello',
    });

    render(<TranslationEditor segment={makeSegment()} sessionId="session-1" />);
    expect(screen.getByText(/Texte source \(FR\)/)).toBeInTheDocument();
  });

  it('shows provider badge', () => {
    useTranslationStore.getState().setSegmentStatus('seg-1', {
      status: 'completed',
      translatedText: 'Translated text',
      provider: 'deepl',
    });

    render(<TranslationEditor segment={makeSegment()} sessionId="session-1" />);
    expect(screen.getByText('DEEPL')).toBeInTheDocument();
  });

  it('shows cost when costCharged > 0', () => {
    useTranslationStore.getState().setSegmentStatus('seg-1', {
      status: 'completed',
      translatedText: 'Translated',
      provider: 'deepl',
      costProvider: 2,
      costCharged: 6,
    });

    render(<TranslationEditor segment={makeSegment()} sessionId="session-1" />);
    expect(screen.getByTestId('translation-cost')).toBeInTheDocument();
    expect(screen.getByText(/0\.06 EUR/)).toBeInTheDocument();
  });

  it('does not show cost for free translation', () => {
    useTranslationStore.getState().setSegmentStatus('seg-1', {
      status: 'completed',
      translatedText: 'Translated',
      provider: 'marianmt',
      costProvider: 0,
      costCharged: 0,
    });

    render(<TranslationEditor segment={makeSegment()} sessionId="session-1" />);
    expect(screen.queryByTestId('translation-cost')).not.toBeInTheDocument();
  });

  it('allows editing translated text', () => {
    useTranslationStore.getState().setSegmentStatus('seg-1', {
      status: 'completed',
      translatedText: 'Original translation',
    });

    render(<TranslationEditor segment={makeSegment()} sessionId="session-1" />);
    const textarea = screen.getByTestId('translated-text-editor') as HTMLTextAreaElement;

    fireEvent.change(textarea, { target: { value: 'Edited translation' } });
    expect(textarea.value).toBe('Edited translation');
  });

  it('shows generate TTS button when onGenerateTTS provided', () => {
    useTranslationStore.getState().setSegmentStatus('seg-1', {
      status: 'completed',
      translatedText: 'Translated text',
    });

    const onTTS = jest.fn();
    render(<TranslationEditor segment={makeSegment()} sessionId="session-1" onGenerateTTS={onTTS} />);
    const btn = screen.getByTestId('generate-tts-btn');
    expect(btn).toBeInTheDocument();

    fireEvent.click(btn);
    expect(onTTS).toHaveBeenCalled();
  });

  it('does not show generate TTS button without callback', () => {
    useTranslationStore.getState().setSegmentStatus('seg-1', {
      status: 'completed',
      translatedText: 'Translated text',
    });

    render(<TranslationEditor segment={makeSegment()} sessionId="session-1" />);
    expect(screen.queryByTestId('generate-tts-btn')).not.toBeInTheDocument();
  });
});
