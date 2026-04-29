'use client';

import { logger } from '@/lib/logger';

const SERVICE_NAME = 'ManuallyEditedModal';

// --- Types ---

export interface ManuallyEditedModalProps {
  isOpen: boolean;
  sceneName: string;
  editedTextPreview: string;
  language: string;
  onKeep: () => void;
  onUpdate: () => void;
}

// --- Text preview helper ---

const MAX_PREVIEW_CHARS = 100;

export function truncatePreview(text: string): string {
  if (text.length <= MAX_PREVIEW_CHARS) return text;
  return text.slice(0, MAX_PREVIEW_CHARS) + '\u2026';
}

// --- Component ---

export function ManuallyEditedModal({
  isOpen,
  sceneName,
  editedTextPreview,
  language,
  onKeep,
  onUpdate,
}: ManuallyEditedModalProps) {
  if (!isOpen) return null;

  const preview = truncatePreview(editedTextPreview);

  return (
    <div
      data-testid="manually-edited-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manually-edited-modal-title"
    >
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2
          id="manually-edited-modal-title"
          className="text-lg font-semibold text-ink"
          data-testid="modal-scene-name"
        >
          {sceneName}
        </h2>

        <p className="mt-3 text-sm text-ink-80" data-testid="modal-warning-message">
          Vous avez corrige cette traduction a la main. Mettre a jour ecrasera vos corrections. Continuer ?
        </p>

        <div className="mt-3 rounded-lg border border-line bg-paper-soft p-3">
          <p className="text-xs font-medium text-ink-60 mb-1">
            Traduction actuelle ({language.toUpperCase()})
          </p>
          <p
            className="text-sm text-ink-80 italic"
            data-testid="modal-text-preview"
          >
            {preview || <span className="text-ink-40">Aucun texte</span>}
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            data-testid="modal-keep-button"
            onClick={() => {
              logger.info(SERVICE_NAME, 'User chose to keep manual edit', { sceneName, language });
              onKeep();
            }}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium text-ink-80 hover:bg-paper-soft"
          >
            Conserver ma version
          </button>
          <button
            type="button"
            data-testid="modal-update-button"
            onClick={() => {
              logger.info(SERVICE_NAME, 'User chose to update translation', { sceneName, language });
              onUpdate();
            }}
            className="rounded-md bg-ocre px-4 py-2 text-sm font-medium text-white hover:bg-ocre"
          >
            Mettre a jour
          </button>
        </div>
      </div>
    </div>
  );
}
