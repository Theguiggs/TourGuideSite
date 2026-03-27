import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TranslationSelector } from '../translation-selector';
import { useTranslationStore } from '@/lib/stores/translation-store';
import type { SceneSegment } from '@/types/studio';

// Mock API
jest.mock('@/lib/api/translation', () => ({
  estimateCost: jest.fn().mockResolvedValue({
    provider: 'marianmt',
    charCount: 100,
    costProvider: 0,
    costCharged: 0,
    isFree: true,
  }),
  checkMicroserviceHealth: jest.fn().mockResolvedValue({
    tts: true,
    translation: true,
    silence_detection: true,
  }),
  requestTranslation: jest.fn().mockResolvedValue({
    jobId: 'trans-123',
    status: 'processing',
    translatedText: null,
    provider: 'marianmt',
    costProvider: null,
    costCharged: null,
  }),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { estimateCost, checkMicroserviceHealth, requestTranslation } = jest.requireMock('@/lib/api/translation');

const makeSegment = (overrides?: Partial<SceneSegment>): SceneSegment => ({
  id: 'seg-1',
  sceneId: 'scene-1',
  segmentIndex: 0,
  audioKey: null,
  transcriptText: 'Bienvenue sur la Place aux Aires.',
  startTimeMs: null,
  endTimeMs: null,
  language: 'fr',
  sourceSegmentId: null,
  ttsGenerated: false,
  translationProvider: null,
  costProvider: null,
  costCharged: null,
  status: 'transcribed',
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

describe('TranslationSelector', () => {
  beforeEach(() => {
    useTranslationStore.getState().resetStore();
    jest.clearAllMocks();
  });

  it('shows empty state when segment has no text', () => {
    render(<TranslationSelector segment={makeSegment({ transcriptText: null })} />);
    expect(screen.getByTestId('translation-no-text')).toBeInTheDocument();
  });

  it('renders selector with language buttons and providers', async () => {
    render(<TranslationSelector segment={makeSegment()} />);

    await waitFor(() => {
      expect(screen.getByTestId('translation-selector')).toBeInTheDocument();
    });

    // Language buttons
    expect(screen.getByTestId('lang-en')).toBeInTheDocument();
    expect(screen.getByTestId('lang-it')).toBeInTheDocument();
    expect(screen.getByTestId('lang-de')).toBeInTheDocument();
    expect(screen.getByTestId('lang-es')).toBeInTheDocument();

    // Providers
    expect(screen.getByTestId('provider-marianmt')).toBeInTheDocument();
    expect(screen.getByTestId('provider-deepl')).toBeInTheDocument();
    expect(screen.getByTestId('provider-openai')).toBeInTheDocument();
  });

  it('calls estimateCost on mount and displays free label in button', async () => {
    await act(async () => {
      render(<TranslationSelector segment={makeSegment()} />);
    });

    // estimateCost should have been called
    expect(estimateCost).toHaveBeenCalledWith('Bienvenue sur la Place aux Aires.', 'marianmt');

    // Allow async state updates to flush
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // Button text reflects the free cost
    const btn = screen.getByTestId('translate-btn');
    expect(btn.textContent).toContain('gratuit');
  });

  it('updates cost when provider changes', async () => {
    estimateCost.mockResolvedValueOnce({
      provider: 'marianmt', charCount: 100, costProvider: 0, costCharged: 0, isFree: true,
    }).mockResolvedValueOnce({
      provider: 'deepl', charCount: 100, costProvider: 2, costCharged: 6, isFree: false,
    });

    render(<TranslationSelector segment={makeSegment()} />);

    await waitFor(() => {
      expect(screen.getByTestId('cost-estimate')).toBeInTheDocument();
    });

    // Click DeepL provider radio
    const deeplLabel = screen.getByTestId('provider-deepl');
    const radio = deeplLabel.querySelector('input[type="radio"]');
    if (radio) fireEvent.click(radio);

    await waitFor(() => {
      expect(estimateCost).toHaveBeenCalledTimes(2);
    });
  });

  it('disables marianmt when GPU is down', async () => {
    checkMicroserviceHealth.mockResolvedValueOnce({
      tts: false,
      translation: false,
      silence_detection: true,
    });

    render(<TranslationSelector segment={makeSegment()} />);

    await waitFor(() => {
      const marianmt = screen.getByTestId('provider-marianmt');
      const radio = marianmt.querySelector('input[type="radio"]') as HTMLInputElement;
      expect(radio.disabled).toBe(true);
    });

    expect(screen.getByText('Temporairement indisponible')).toBeInTheDocument();
  });

  it('calls requestTranslation on translate button click', async () => {
    render(<TranslationSelector segment={makeSegment()} />);

    await waitFor(() => {
      expect(screen.getByTestId('translate-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('translate-btn'));
    });

    expect(requestTranslation).toHaveBeenCalledWith(
      'seg-1',
      'Bienvenue sur la Place aux Aires.',
      'fr',
      'en',
      'marianmt',
    );
  });

  it('fires onTranslationStarted callback', async () => {
    const onStarted = jest.fn();
    render(<TranslationSelector segment={makeSegment()} onTranslationStarted={onStarted} />);

    await waitFor(() => {
      expect(screen.getByTestId('translate-btn')).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('translate-btn'));
    });

    expect(onStarted).toHaveBeenCalled();
  });

  it('shows translate button text with cost for premium providers', async () => {
    estimateCost.mockResolvedValue({
      provider: 'deepl', charCount: 500, costProvider: 1, costCharged: 3, isFree: false,
    });

    render(<TranslationSelector segment={makeSegment()} />);

    // Switch to DeepL
    await waitFor(() => {
      expect(screen.getByTestId('provider-deepl')).toBeInTheDocument();
    });
    const radio = screen.getByTestId('provider-deepl').querySelector('input[type="radio"]');
    if (radio) fireEvent.click(radio);

    await waitFor(() => {
      const btn = screen.getByTestId('translate-btn');
      expect(btn.textContent).toContain('EUR');
    });
  });
});
