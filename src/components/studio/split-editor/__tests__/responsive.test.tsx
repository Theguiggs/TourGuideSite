import React from 'react';
import { render, screen } from '@testing-library/react';
import { SplitEditor } from '../split-editor';
import type { SceneSegment } from '@/types/studio';

// --- Mocks ---

jest.mock('@/hooks/use-auto-save', () => ({
  useAutoSave: jest.fn().mockReturnValue({ isSaving: false, isDirty: false }),
}));

jest.mock('@/lib/api/studio', () => ({
  updateSceneSegment: jest.fn(),
}));

jest.mock('@/lib/stores/translation-store', () => ({
  useTranslationStore: jest.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({ setSegmentStatus: jest.fn() }),
  ),
}));

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const mockSegment: SceneSegment = {
  id: 'seg-1',
  sceneId: 'scene-1',
  segmentIndex: 0,
  audioKey: null,
  transcriptText: 'Translated text',
  startTimeMs: null,
  endTimeMs: null,
  language: 'en',
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

describe('SplitEditor — Responsive', () => {
  it('uses grid-cols-1 md:grid-cols-2 for desktop/tablet breakpoint', () => {
    render(
      <SplitEditor
        segment={mockSegment}
        sourceText="Source text"
        sourceTitle=""
        sourceLang="fr"
        targetLang="en"
        sessionId="session-1"
      />,
    );

    const editor = screen.getByTestId('split-editor');
    // The grid container inside should have responsive classes
    const gridDiv = editor.querySelector('.grid');
    expect(gridDiv).not.toBeNull();
    expect(gridDiv!.className).toContain('grid-cols-1');
    expect(gridDiv!.className).toContain('md:grid-cols-2');
  });

  it('title translation row uses responsive grid-cols-1 md:grid-cols-2', () => {
    render(
      <SplitEditor
        segment={mockSegment}
        sourceText="Source text"
        sourceTitle="Notre-Dame"
        sourceLang="fr"
        targetLang="en"
        sessionId="session-1"
      />,
    );

    const titleRow = screen.getByTestId('title-translation-row');
    expect(titleRow.className).toContain('grid-cols-1');
    expect(titleRow.className).toContain('md:grid-cols-2');
  });

  it('LanguageTabs container has overflow-x-auto for scrollable tabs', () => {
    // Import LanguageTabs directly for this test
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LanguageTabs } = require('../../language-tabs/language-tabs');
    const langs = [
      { code: 'fr', label: 'Français', countryCode: 'fr', isBase: true, progress: { completed: 12, total: 12 } },
      { code: 'en', label: 'English', countryCode: 'gb', isBase: false, progress: { completed: 8, total: 12 } },
    ];
    render(<LanguageTabs languages={langs} activeLanguage="fr" onLanguageChange={jest.fn()} />);
    const tablist = screen.getByRole('tablist');
    expect(tablist.className).toContain('overflow-x-auto');
  });
});
