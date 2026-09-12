import type { StudioSessionStatus } from '@/types/studio';

/**
 * UN libellé par statut de session, dans les deux langues (lot 6.1).
 *
 * Quatre tables se contredisaient : `STATUS_CONFIG` (FR), une table EN dans
 * WizardShell qui listait des statuts inexistants et en oubliait quatre, une
 * autre dans TourCard, et sur la page Publication une traduction indexée sur
 * le libellé FR qui ne connaissait pas « Rejeté » ni « En pause ».
 */
export type StudioLocaleCode = 'fr' | 'en';

const LABELS: Record<StudioSessionStatus, { fr: string; en: string }> = {
  draft: { fr: 'Brouillon', en: 'Draft' },
  transcribing: { fr: 'Transcription…', en: 'Transcribing…' },
  editing: { fr: 'En cours d’édition', en: 'Editing' },
  recording: { fr: 'Enregistrement', en: 'Recording' },
  ready: { fr: 'Prêt', en: 'Ready' },
  submitted: { fr: 'Soumis à la modération', en: 'Submitted for review' },
  published: { fr: 'Publié', en: 'Published' },
  paused: { fr: 'En pause', en: 'Paused' },
  revision_requested: { fr: 'Révision demandée', en: 'Changes requested' },
  rejected: { fr: 'Refusé', en: 'Rejected' },
  archived: { fr: 'Archivé', en: 'Archived' },
  ready_for_cleanup: { fr: 'Nettoyage requis', en: 'Cleanup needed' },
};

export function sessionStatusLabel(status: StudioSessionStatus | string, locale: StudioLocaleCode = 'fr'): string {
  const entry = LABELS[status as StudioSessionStatus];
  if (!entry) return String(status);
  return locale === 'en' ? entry.en : entry.fr;
}
