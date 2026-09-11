/**
 * Tables de badges de statut de l'admin — une par domaine (lot 5).
 *
 * Sept copies vivaient dans six pages, deux divergeaient sur le même
 * domaine (`suspended` ocre ici, grenadine là), une avait perdu ses accents.
 */

export interface StatusBadgeSpec {
  label: string;
  className: string;
}

export type StatusBadgeTable = Record<string, StatusBadgeSpec>;

/** Statuts d'une visite (StudioSession / GuideTour), du brouillon à l'archive. */
export const TOUR_STATUS_BADGES: StatusBadgeTable = {
  draft: { label: 'Brouillon', className: 'bg-paper-deep text-ink-80' },
  synced: { label: 'Transféré', className: 'bg-mer-soft text-mer' },
  editing: { label: 'En cours d’édition', className: 'bg-mer-soft text-mer' },
  recording: { label: 'Enregistrement', className: 'bg-mer-soft text-mer' },
  ready: { label: 'Prêt', className: 'bg-olive-soft text-olive' },
  submitted: { label: 'Soumis', className: 'bg-ocre-soft text-ocre-ink' },
  review: { label: 'En revue', className: 'bg-ocre-soft text-ocre-ink' },
  pending_moderation: { label: 'En modération', className: 'bg-ocre-soft text-ocre-ink' },
  published: { label: 'Publié', className: 'bg-olive-soft text-olive' },
  revision_requested: { label: 'Révision demandée', className: 'bg-ocre-soft text-ocre-ink' },
  rejected: { label: 'Rejeté', className: 'bg-grenadine-soft text-danger' },
  archived: { label: 'Archivé', className: 'bg-paper-deep text-ink-60' },
};

/** Statuts d'un profil de guide. `suspended` est un refus : grenadine, pas ocre. */
export const GUIDE_PROFILE_STATUS_BADGES: StatusBadgeTable = {
  active: { label: 'Actif', className: 'bg-olive-soft text-olive' },
  pending_moderation: { label: 'En attente', className: 'bg-ocre-soft text-ocre-ink' },
  suspended: { label: 'Suspendu', className: 'bg-grenadine-soft text-danger' },
  rejected: { label: 'Rejeté', className: 'bg-grenadine-soft text-danger' },
  inactive: { label: 'Inactif', className: 'bg-paper-deep text-ink-60' },
};

/** File de modération (ModerationItem). */
export const MODERATION_STATUS_BADGES: StatusBadgeTable = {
  pending: { label: 'En attente', className: 'bg-ocre-soft text-ocre-ink' },
  resubmitted: { label: 'Resoumis', className: 'bg-ocre-soft text-ocre-ink' },
  in_review: { label: 'En revue', className: 'bg-mer-soft text-mer' },
  approved: { label: 'Approuvé', className: 'bg-olive-soft text-olive' },
  rejected: { label: 'Refusé', className: 'bg-grenadine-soft text-danger' },
};

/** Modération d'une langue (TourLanguagePurchase.moderationStatus). */
export const LANGUAGE_MODERATION_BADGES: StatusBadgeTable = {
  draft: { label: 'Brouillon', className: 'bg-paper-deep text-ink-60' },
  submitted: { label: 'Soumis', className: 'bg-ocre-soft text-ocre-ink' },
  approved: { label: 'OK', className: 'bg-olive-soft text-olive' },
  rejected: { label: 'Refusé', className: 'bg-grenadine-soft text-danger' },
  revision_requested: { label: 'Révision', className: 'bg-ocre-soft text-ocre-ink' },
};

/** État d'une Paire de narration à la demande (`PAIR_STATES`). */
export const PAIR_STATUS_BADGES: StatusBadgeTable = {
  absent: { label: 'Absente', className: 'bg-paper-deep text-ink-60' },
  queued: { label: 'En file', className: 'bg-mer-soft text-mer' },
  fabricating: { label: 'En fabrication', className: 'bg-mer-soft text-mer' },
  partially_ready: { label: 'Partiellement prête', className: 'bg-ocre-soft text-ocre-ink' },
  ready: { label: 'Prête', className: 'bg-olive-soft text-olive' },
  failed: { label: 'Échec', className: 'bg-grenadine-soft text-danger' },
};

export function badgeFor(table: StatusBadgeTable, status: string | null | undefined, fallback: string): StatusBadgeSpec {
  return (status && table[status]) || table[fallback];
}
