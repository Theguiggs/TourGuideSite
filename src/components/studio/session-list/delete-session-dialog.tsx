'use client';

import type { StudioSession } from '@/types/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

interface DeleteSessionDialogProps {
  session: StudioSession;
  isDeleting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * <DeleteSessionDialog> — modale de confirmation de suppression d'une session.
 * Extrait depuis l'ancien Dashboard (legacy /guide/studio/page.tsx).
 * Utilisé par le Dashboard Murmure et la future page "Mes tours".
 */
export function DeleteSessionDialog({
  session,
  isDeleting,
  errorMessage,
  onCancel,
  onConfirm,
}: DeleteSessionDialogProps) {
  const { locale } = useStudioLocale();
  const copy = locale === 'en' ? {
    title: 'Delete this session?', untitled: 'Untitled session', warning: 'All scenes, audio files and metadata will be permanently deleted. This action cannot be undone.',
    cancel: 'Cancel', deleting: 'Deleting...', delete: 'Delete',
  } : {
    title: 'Supprimer cette session ?', untitled: 'Session sans titre', warning: 'Toutes les scènes, les fichiers audio et les métadonnées seront définitivement supprimés. Cette action est irréversible.',
    cancel: 'Annuler', deleting: 'Suppression...', delete: 'Supprimer',
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-card rounded-lg shadow-lg max-w-sm w-full p-6">
        <h2 className="font-display text-h6 text-ink mb-1">{copy.title}</h2>
        <p className="text-caption text-ink-80 mb-1">
          <span className="font-semibold">{session.title || copy.untitled}</span>
        </p>
        <p className="text-caption text-ink-60 mb-4">
          {copy.warning}
        </p>
        {errorMessage && (
          <p className="text-caption text-danger mb-3">{errorMessage}</p>
        )}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-caption font-medium text-ink-80 bg-paper-soft rounded-md hover:bg-paper-deep disabled:opacity-50 transition"
          >
            {copy.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            data-testid="confirm-delete-btn"
            className="px-4 py-2 text-caption font-medium text-paper bg-danger rounded-md hover:opacity-90 disabled:opacity-50 transition"
          >
            {isDeleting ? copy.deleting : copy.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
