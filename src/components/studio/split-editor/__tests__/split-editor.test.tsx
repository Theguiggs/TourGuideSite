import { render, screen, fireEvent, act } from '@testing-library/react';
import { SplitEditor } from '../split-editor';
import type { SceneSegment } from '@/types/studio';
import { useAutoSave } from '@/hooks/use-auto-save';
import { updateSceneSegment } from '@/lib/api/studio';

// --- Mocks ---

jest.mock('@/hooks/use-auto-save', () => ({
  useAutoSave: jest.fn(),
}));

jest.mock('@/lib/api/studio', () => ({
  updateSceneSegment: jest.fn(),
}));

jest.mock('@/lib/stores/translation-store', () => ({
  useTranslationStore: jest.fn((selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      setSegmentStatus: jest.fn(),
    }),
  ),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockUseAutoSave = useAutoSave as jest.Mock;
const mockUpdateSceneSegment = updateSceneSegment as jest.Mock;

// --- Fixtures ---

function makeSegment(overrides: Partial<SceneSegment> = {}): SceneSegment {
  return {
    id: 'seg-1',
    sceneId: 'scene-1',
    segmentIndex: 0,
    audioKey: null,
    transcriptText: 'Bonjour le monde',
    startTimeMs: null,
    endTimeMs: null,
    language: 'en',
    sourceSegmentId: 'source-seg-1',
    ttsGenerated: false,
    translationProvider: 'marianmt',
    costProvider: null,
    costCharged: null,
    status: 'translated',
    manuallyEdited: false,
    translatedTitle: null,
    sourceUpdatedAt: null,
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-01T00:00:00.000Z',
    ...overrides,
  };
}

const defaultProps = {
  segment: makeSegment(),
  sourceText: 'Texte source original en francais',
  sourceTitle: 'Place du Marche',
  sourceLang: 'fr',
  targetLang: 'en',
  sessionId: 'session-1',
};

// --- Setup ---

let capturedOnSave: ((text: string) => Promise<void>) | null = null;

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnSave = null;

  mockUseAutoSave.mockImplementation((opts: { onSave: (text: string) => Promise<void> }) => {
    capturedOnSave = opts.onSave;
    return {
      isSaving: false,
      lastSavedAt: null,
      isDirty: false,
      saveNow: jest.fn(),
      resetBaseline: jest.fn(),
    };
  });

  mockUpdateSceneSegment.mockResolvedValue({ ok: true });
});

// --- Tests ---

describe('SplitEditor', () => {
  describe('readOnly=true (default)', () => {
    it('renders target text as plain text, not textarea', () => {
      render(<SplitEditor {...defaultProps} />);

      // Should show read-only text
      expect(screen.getByTestId('translated-text-readonly')).toHaveTextContent('Bonjour le monde');
      // Should NOT show textarea
      expect(screen.queryByTestId('translated-textarea')).not.toBeInTheDocument();
      // Should show Edit button
      expect(screen.getByTestId('edit-button')).toBeInTheDocument();
      expect(screen.getByTestId('edit-button')).toHaveTextContent('Editer');
    });

    it('shows title as plain text in readOnly mode', () => {
      render(<SplitEditor {...defaultProps} />);

      expect(screen.getByTestId('translated-title-readonly')).toBeInTheDocument();
      expect(screen.queryByTestId('translated-title-input')).not.toBeInTheDocument();
    });

    it('switches to editable mode when Edit button is clicked', () => {
      render(<SplitEditor {...defaultProps} />);

      // Click Edit
      fireEvent.click(screen.getByTestId('edit-button'));

      // Now textarea should appear
      expect(screen.getByTestId('translated-textarea')).toBeInTheDocument();
      expect(screen.queryByTestId('translated-text-readonly')).not.toBeInTheDocument();
      // Edit button should disappear
      expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument();
      // Title should also become editable
      expect(screen.getByTestId('translated-title-input')).toBeInTheDocument();
    });

    it('does not show save indicator when in readOnly mode', () => {
      render(<SplitEditor {...defaultProps} />);

      expect(screen.queryByTestId('save-indicator')).not.toBeInTheDocument();
    });

    it('shows save indicator after switching to edit mode', () => {
      mockUseAutoSave.mockImplementation((opts: { onSave: (text: string) => Promise<void> }) => {
        capturedOnSave = opts.onSave;
        return { isSaving: false, lastSavedAt: null, isDirty: false, saveNow: jest.fn(), resetBaseline: jest.fn() };
      });

      render(<SplitEditor {...defaultProps} />);

      fireEvent.click(screen.getByTestId('edit-button'));
      // Trigger re-render for auto-save to reflect
      const textarea = screen.getByTestId('translated-textarea');
      fireEvent.change(textarea, { target: { value: 'changed' } });

      expect(screen.getByTestId('save-indicator')).toBeInTheDocument();
    });

    it('has readOnly gray background on target text', () => {
      render(<SplitEditor {...defaultProps} />);

      const readOnlyDiv = screen.getByTestId('translated-text-readonly');
      expect(readOnlyDiv.className).toContain('bg-gray-50');
    });
  });

  describe('readOnly=false', () => {
    it('renders both columns with flags, source read-only and textarea editable', () => {
      render(<SplitEditor {...defaultProps} readOnly={false} />);

      // Source column
      const sourceText = screen.getByTestId('source-text');
      expect(sourceText).toHaveTextContent('Texte source original en francais');

      // Source flag image
      const sourceFlag = screen.getByAltText('FR');
      expect(sourceFlag).toHaveAttribute('src', expect.stringContaining('flagcdn.com'));
      expect(sourceFlag).toHaveAttribute('src', expect.stringContaining('/fr.png'));

      // Target flag image
      const targetFlag = screen.getByAltText('EN');
      expect(targetFlag).toHaveAttribute('src', expect.stringContaining('flagcdn.com'));
      expect(targetFlag).toHaveAttribute('src', expect.stringContaining('/gb.png'));

      // Textarea is editable
      const textarea = screen.getByTestId('translated-textarea') as HTMLTextAreaElement;
      expect(textarea).not.toBeDisabled();
      expect(textarea.value).toBe('Bonjour le monde');

      // Labels
      expect(screen.getByText(/Texte source \(FR\)/)).toBeInTheDocument();
      expect(screen.getByText(/Traduction \(EN\)/)).toBeInTheDocument();

      // No edit button when already editable
      expect(screen.queryByTestId('edit-button')).not.toBeInTheDocument();
    });

    it('calls updateSceneSegment with manuallyEdited=true when text is changed and saved', async () => {
      render(<SplitEditor {...defaultProps} readOnly={false} />);

      // Simulate user editing the textarea
      const textarea = screen.getByTestId('translated-textarea');
      fireEvent.change(textarea, { target: { value: 'Hello world edited' } });

      // The onSave callback was captured from useAutoSave
      expect(capturedOnSave).toBeTruthy();

      // Invoke onSave as useAutoSave would
      await act(async () => {
        await capturedOnSave!('Hello world edited');
      });

      expect(mockUpdateSceneSegment).toHaveBeenCalledWith('seg-1', {
        transcriptText: 'Hello world edited',
        translatedTitle: null,
        manuallyEdited: true,
      });
    });
  });

  it('preserves manuallyEdited=true if segment was already manually edited', async () => {
    const segment = makeSegment({ manuallyEdited: true });
    render(<SplitEditor {...defaultProps} segment={segment} readOnly={false} />);

    // Even without changing text, manuallyEdited stays true from segment
    expect(capturedOnSave).toBeTruthy();
    await act(async () => {
      await capturedOnSave!('Bonjour le monde');
    });

    expect(mockUpdateSceneSegment).toHaveBeenCalledWith('seg-1', {
      transcriptText: 'Bonjour le monde',
      translatedTitle: null,
      manuallyEdited: true,
    });
  });

  it('does not fire auto-save on initial render (enabled is false when text unchanged)', () => {
    render(<SplitEditor {...defaultProps} />);

    // useAutoSave should be called with enabled=false when text matches initial
    const callArgs = mockUseAutoSave.mock.calls[0][0];
    expect(callArgs.enabled).toBe(false);
  });

  it('has responsive grid classes (grid-cols-1 default, md:grid-cols-2)', () => {
    const { container } = render(<SplitEditor {...defaultProps} />);

    const grid = container.querySelector('.grid');
    expect(grid).toBeTruthy();
    expect(grid!.className).toContain('grid-cols-1');
    expect(grid!.className).toContain('md:grid-cols-2');
  });

  it('shows save indicator states correctly', () => {
    // Test "Sauvegarde..." when saving
    mockUseAutoSave.mockReturnValue({
      isSaving: true,
      lastSavedAt: null,
      isDirty: true,
      saveNow: jest.fn(),
      resetBaseline: jest.fn(),
    });

    const { rerender } = render(<SplitEditor {...defaultProps} readOnly={false} />);
    const indicator = screen.getByTestId('save-indicator');
    expect(indicator).toHaveTextContent('Sauvegarde...');

    // Test "Sauvegarde" when saved
    mockUseAutoSave.mockReturnValue({
      isSaving: false,
      lastSavedAt: Date.now(),
      isDirty: false,
      saveNow: jest.fn(),
      resetBaseline: jest.fn(),
    });

    rerender(<SplitEditor {...defaultProps} readOnly={false} />);
    expect(screen.getByTestId('save-indicator')).toHaveTextContent('Sauvegarde');

    // Test "Non sauvegarde" when dirty
    mockUseAutoSave.mockReturnValue({
      isSaving: false,
      lastSavedAt: null,
      isDirty: true,
      saveNow: jest.fn(),
      resetBaseline: jest.fn(),
    });

    rerender(<SplitEditor {...defaultProps} readOnly={false} />);
    expect(screen.getByTestId('save-indicator')).toHaveTextContent('Non sauvegarde');
  });

  it('calls onSaved callback after successful save', async () => {
    const onSaved = jest.fn();
    render(<SplitEditor {...defaultProps} readOnly={false} onSaved={onSaved} />);

    const textarea = screen.getByTestId('translated-textarea');
    fireEvent.change(textarea, { target: { value: 'Changed text' } });

    await act(async () => {
      await capturedOnSave!('Changed text');
    });

    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('does not call onSaved when save fails', async () => {
    mockUpdateSceneSegment.mockResolvedValue({ ok: false, error: 'Network error' });
    const onSaved = jest.fn();
    render(<SplitEditor {...defaultProps} readOnly={false} onSaved={onSaved} />);

    const textarea = screen.getByTestId('translated-textarea');
    fireEvent.change(textarea, { target: { value: 'Changed text' } });

    await act(async () => {
      await capturedOnSave!('Changed text');
    });

    expect(onSaved).not.toHaveBeenCalled();
  });
});
