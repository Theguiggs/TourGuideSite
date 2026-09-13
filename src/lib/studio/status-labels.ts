import { localizeValue } from '@/lib/i18n/translate';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { extendCopy } from '@/lib/i18n/translate';
import type { StudioSessionStatus } from '@/types/studio';

/**
 * UN libellé par statut de session, dans les deux langues (lot 6.1).
 *
 * Quatre tables se contredisaient : `STATUS_CONFIG` (FR), une table EN dans
 * WizardShell qui listait des statuts inexistants et en oubliait quatre, une
 * autre dans TourCard, et sur la page Publication une traduction indexée sur
 * le libellé FR qui ne connaissait pas « Rejeté » ni « En pause ».
 */
export type StudioLocaleCode = InterfaceLocale;

const LABELS: Record<StudioSessionStatus, { fr: string; en: string }> = {
  draft: extendCopy({ fr: 'Brouillon', en: 'Draft' }),
  transcribing: extendCopy({ fr: 'Transcription…', en: 'Transcribing…' }),
  editing: extendCopy({ fr: 'En cours d’édition', en: 'Editing' }),
  recording: extendCopy({ fr: 'Enregistrement', en: 'Recording' }),
  ready: extendCopy({ fr: 'Prêt', en: 'Ready' }),
  submitted: extendCopy({ fr: 'Soumis à la modération', en: 'Submitted for review' }),
  published: extendCopy({ fr: 'Publié', en: 'Published' }),
  paused: extendCopy({ fr: 'En pause', en: 'Paused' }),
  revision_requested: extendCopy({ fr: 'Révision demandée', en: 'Changes requested' }),
  rejected: extendCopy({ fr: 'Refusé', en: 'Rejected' }),
  archived: extendCopy({ fr: 'Archivé', en: 'Archived' }),
  ready_for_cleanup: extendCopy({ fr: 'Nettoyage requis', en: 'Cleanup needed' }),
};

export function sessionStatusLabel(status: StudioSessionStatus | string, locale: StudioLocaleCode = 'fr'): string {
  const entry = LABELS[status as StudioSessionStatus];
  if (!entry) return String(status);
  return localizeValue(locale, entry.fr, entry.en);
}
