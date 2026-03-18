'use client';

import { useCallback, useRef, useState } from 'react';
import { validateAndImportFile, ALLOWED_AUDIO_TYPES, MAX_FILE_SIZE_MB } from '@/lib/studio/file-import-service';
import { useRecordingStore } from '@/lib/stores/recording-store';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'FileImport';

interface FileImportProps {
  sceneId: string;
}

export function FileImport({ sceneId }: FileImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const addTake = useRecordingStore((s) => s.addTake);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsProcessing(true);

    const result = await validateAndImportFile(file);

    if (result.ok) {
      addTake(sceneId, {
        blob: result.result.blob,
        mimeType: result.result.mimeType,
        durationMs: result.result.durationMs ?? 0,
      });
      logger.info(SERVICE_NAME, 'File imported as take', { sceneId, name: result.result.fileName });
    } else {
      setError(result.error.message);
      logger.warn(SERVICE_NAME, 'Import rejected', { sceneId, error: result.error.message });
    }

    setIsProcessing(false);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [sceneId, addTake]);

  return (
    <div className="mt-3" data-testid="file-import">
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_AUDIO_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
        data-testid="file-input"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isProcessing}
        className="text-sm text-gray-500 hover:text-teal-600 underline transition-colors disabled:text-gray-300"
        data-testid="import-btn"
      >
        {isProcessing ? 'Import en cours...' : `📁 Importer un fichier audio (max ${MAX_FILE_SIZE_MB} Mo)`}
      </button>
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert" data-testid="import-error">
          {error}
        </p>
      )}
    </div>
  );
}
