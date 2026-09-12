'use client';

import { Dialog } from '@/components/ui/Dialog';
import { logger } from '@/lib/logger';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

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
  const { t } = useStudioLocale();
  if (!isOpen) return null;

  const preview = truncatePreview(editedTextPreview);

  return (
    <Dialog
      open
      onClose={onKeep}
      labelledBy="manually-edited-modal-title"
      data-testid="manually-edited-modal"
      className="max-w-lg bg-card"
    >
      <div className="w-full p-6">
        <h2
          id="manually-edited-modal-title"
          className="text-h6 font-semibold text-ink"
          data-testid="modal-scene-name"
        >
          {sceneName}
        </h2>

        <p className="mt-3 text-body text-ink-80" data-testid="modal-warning-message">
          {t('Vous avez corrigé cette traduction à la main. Mettre à jour écrasera vos corrections. Continuer ?', 'You corrected this translation by hand. Updating will overwrite your corrections. Continue?')}
        </p>

        <div className="mt-3 rounded-lg border border-line bg-paper-soft p-3">
          <p className="text-meta font-medium text-ink-60 mb-1">
            {t('Traduction actuelle', 'Current translation')} ({language.toUpperCase()})
          </p>
          <p
            className="text-body text-ink-80 italic"
            data-testid="modal-text-preview"
          >
            {preview || <span className="text-ink-40">{t('Aucun texte', 'No text')}</span>}
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
            className="rounded-md border border-line px-4 py-2 text-body font-medium text-ink-80 hover:bg-paper-soft"
          >
            {t('Conserver ma version', 'Keep my version')}
          </button>
          <button
            type="button"
            data-testid="modal-update-button"
            onClick={() => {
              logger.info(SERVICE_NAME, 'User chose to update translation', { sceneName, language });
              onUpdate();
            }}
            className="rounded-md bg-ocre px-4 py-2 text-body font-medium text-ink hover:brightness-110"
          >
            {t('Mettre à jour', 'Update')}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
