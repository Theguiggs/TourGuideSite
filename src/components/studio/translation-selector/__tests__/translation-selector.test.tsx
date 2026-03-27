import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TranslationSelector } from '../translation-selector';
import { useTranslationStore } from '@/lib/stores/translation-store';
import type { SceneSegment } from '@/types/studio';

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

/** Helper: select a language to unlock the rest of the UI */
function selectLanguage(langCode: string = 'en') {
  fireEvent.click(screen.getByTestId(`lang-${langCode}`));
}

describe('TranslationSelector', () => {
  beforeEach(() => {
    useTranslationStore.getState().resetStore();
    jest.clearAllMocks();
  });

  it('shows empty state when segment has no text', () => {
    render(<TranslationSelector segment={makeSegment({ transcriptText: null })} />);
    expect(screen.getByTestId('translation-no-text')).toBeInTheDocument();
  });

  it('renders language buttons on mount', async () => {
    await act(async () => {
      render(<TranslationSelector segment={makeSegment()} />);
    });
    expect(screen.getByTestId('lang-en')).toBeInTheDocument();
    expect(screen.getByTestId('lang-it')).toBeInTheDocument();
    expect(screen.getByTestId('lang-de')).toBeInTheDocument();
    expect(screen.getByTestId('lang-es')).toBeInTheDocument();
  });

  it('shows required message when no language selected', async () => {
    await act(async () => {
      render(<TranslationSelector segment={makeSegment()} />);
    });
    expect(screen.getByTestId('lang-required')).toBeInTheDocument();
    expect(screen.getByText(/Veuillez sélectionner/)).toBeInTheDocument();
  });

  it('hides required message after selecting a language', async () => {
    await act(async () => {
      render(<TranslationSelector segment={makeSegment()} />);
    });
    selectLanguage('en');
    expect(screen.queryByTestId('lang-required')).not.toBeInTheDocument();
  });

  it('shows mode selector after language selection', async () => {
    await act(async () => {
      render(<TranslationSelector segment={makeSegment()} />);
    });
    selectLanguage('en');
    expect(screen.getByTestId('mode-auto')).toBeInTheDocument();
    expect(screen.getByTestId('mode-manual')).toBeInTheDocument();
  });

  it('shows providers only after language selected in auto mode', async () => {
    await act(async () => {
      render(<TranslationSelector segment={makeSegment()} />);
    });

    // No providers before language selection
    expect(screen.queryByTestId('provider-marianmt')).not.toBeInTheDocument();

    selectLanguage('it');

    // Providers visible now
    expect(screen.getByTestId('provider-marianmt')).toBeInTheDocument();
    expect(screen.getByTestId('provider-deepl')).toBeInTheDocument();
    expect(screen.getByTestId('provider-openai')).toBeInTheDocument();
  });

  it('calls requestTranslation with selected language', async () => {
    await act(async () => {
      render(<TranslationSelector segment={makeSegment()} />);
    });

    selectLanguage('de');

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('translate-btn'));
    });

    expect(requestTranslation).toHaveBeenCalledWith(
      'seg-1',
      'Bienvenue sur la Place aux Aires.',
      'fr',
      'de',
      'marianmt',
    );
  });

  it('shows manual mode UI when "Je traduis moi-même" selected', async () => {
    await act(async () => {
      render(<TranslationSelector segment={makeSegment()} />);
    });

    selectLanguage('en');
    fireEvent.click(screen.getByTestId('mode-manual'));

    expect(screen.getByTestId('manual-translate-btn')).toBeInTheDocument();
    expect(screen.getByText(/Vous allez saisir votre propre traduction/)).toBeInTheDocument();
    // No provider selection in manual mode
    expect(screen.queryByTestId('provider-marianmt')).not.toBeInTheDocument();
  });

  it('fires onManualTranslation callback', async () => {
    const onManual = jest.fn();
    await act(async () => {
      render(<TranslationSelector segment={makeSegment()} onManualTranslation={onManual} />);
    });

    selectLanguage('es');
    fireEvent.click(screen.getByTestId('mode-manual'));
    fireEvent.click(screen.getByTestId('manual-translate-btn'));

    expect(onManual).toHaveBeenCalledWith('es');
  });

  it('disables marianmt when GPU is down', async () => {
    checkMicroserviceHealth.mockResolvedValueOnce({
      tts: false,
      translation: false,
      silence_detection: true,
    });

    await act(async () => {
      render(<TranslationSelector segment={makeSegment()} />);
    });

    selectLanguage('en');

    await waitFor(() => {
      const marianmt = screen.getByTestId('provider-marianmt');
      const radio = marianmt.querySelector('input[type="radio"]') as HTMLInputElement;
      expect(radio.disabled).toBe(true);
    });

    expect(screen.getByText('Temporairement indisponible')).toBeInTheDocument();
  });
});
