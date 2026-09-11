'use client';

import type { StudioSession } from '@/types/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';
import { ConfirmDialog } from '@/components/ui/Dialog';

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
    <ConfirmDialog
      open
      danger
      title={copy.title}
      subject={session.title || copy.untitled}
      description={copy.warning}
      confirmLabel={isDeleting ? copy.deleting : copy.delete}
      cancelLabel={copy.cancel}
      busy={isDeleting}
      error={errorMessage}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmTestId="confirm-delete-btn"
    />
  );
}
