import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FileImport } from '../file-import';
import { useRecordingStore } from '@/lib/stores/recording-store';
import { validateAndImportFile } from '@/lib/studio/file-import-service';

jest.mock('@/lib/studio/file-import-service', () => ({
  ALLOWED_AUDIO_TYPES: ['audio/mpeg'],
  MAX_FILE_SIZE_MB: 50,
  validateAndImportFile: jest.fn(),
}));

const mockValidateAndImportFile = validateAndImportFile as jest.Mock;

describe('FileImport', () => {
  beforeEach(() => {
    useRecordingStore.getState().resetStore();
    mockValidateAndImportFile.mockReset();
  });

  it('selects the newly imported take even when another take was selected', async () => {
    const previous = useRecordingStore.getState().addTake('scene-1', {
      blob: new Blob(['old'], { type: 'audio/mpeg' }),
      mimeType: 'audio/mpeg',
      durationMs: 500,
    });
    useRecordingStore.getState().selectTake('scene-1', previous.id);
    const importedBlob = new Blob(['new'], { type: 'audio/mpeg' });
    mockValidateAndImportFile.mockResolvedValue({
      ok: true,
      result: { blob: importedBlob, mimeType: 'audio/mpeg', durationMs: 800, fileName: 'new.mp3' },
    });
    render(<FileImport sceneId="scene-1" />);

    fireEvent.change(screen.getByTestId('file-input'), {
      target: { files: [new File(['new'], 'new.mp3', { type: 'audio/mpeg' })] },
    });

    await waitFor(() => expect(mockValidateAndImportFile).toHaveBeenCalledTimes(1));
    expect(useRecordingStore.getState().getSelectedTake('scene-1')?.blob).toBe(importedBlob);
  });
});
