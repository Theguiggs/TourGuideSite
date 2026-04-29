import type { GuideProfile } from '@/types/tour';

/**
 * Subset of GuideProfile fields editable on the Studio profile page.
 * `id`, `userId`, `verified`, `tourCount`, `rating` are read-only / system-managed.
 */
export type GuideProfileDraft = Pick<
  GuideProfile,
  'displayName' | 'bio' | 'photoUrl' | 'city' | 'yearsExperience' | 'specialties' | 'languages'
>;

export interface ValidationResult {
  ok: boolean;
  errors: Partial<Record<keyof GuideProfileDraft, string>>;
}

export const PROFILE_LIMITS = {
  displayNameMax: 50,
  displayNameMin: 2,
  bioMax: 500,
  specialtyMaxCount: 8,
  specialtyMaxLength: 30,
  yearMin: 1980,
  yearMax: new Date().getFullYear(),
} as const;

export function validateDraft(draft: GuideProfileDraft): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  const name = draft.displayName?.trim() ?? '';
  if (name.length < PROFILE_LIMITS.displayNameMin) {
    errors.displayName = `Au moins ${PROFILE_LIMITS.displayNameMin} caractères.`;
  } else if (name.length > PROFILE_LIMITS.displayNameMax) {
    errors.displayName = `Maximum ${PROFILE_LIMITS.displayNameMax} caractères.`;
  }

  if (draft.bio && draft.bio.length > PROFILE_LIMITS.bioMax) {
    errors.bio = `Maximum ${PROFILE_LIMITS.bioMax} caractères.`;
  }

  if (!draft.city?.trim()) {
    errors.city = "Ville d'attache requise.";
  }

  if (draft.yearsExperience !== null && draft.yearsExperience !== undefined) {
    const year = draft.yearsExperience;
    if (
      !Number.isInteger(year) ||
      year < PROFILE_LIMITS.yearMin ||
      year > PROFILE_LIMITS.yearMax
    ) {
      errors.yearsExperience = `Année entre ${PROFILE_LIMITS.yearMin} et ${PROFILE_LIMITS.yearMax}.`;
    }
  }

  if (draft.specialties.length > PROFILE_LIMITS.specialtyMaxCount) {
    errors.specialties = `Maximum ${PROFILE_LIMITS.specialtyMaxCount} spécialités.`;
  } else if (draft.specialties.some((s) => s.length > PROFILE_LIMITS.specialtyMaxLength)) {
    errors.specialties = `Chaque spécialité fait moins de ${PROFILE_LIMITS.specialtyMaxLength} caractères.`;
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

/** True if any field differs between initial and current. */
export function hasUnsavedChanges(
  initial: GuideProfileDraft,
  current: GuideProfileDraft,
): boolean {
  if (initial.displayName !== current.displayName) return true;
  if ((initial.bio ?? '') !== (current.bio ?? '')) return true;
  if ((initial.photoUrl ?? '') !== (current.photoUrl ?? '')) return true;
  if (initial.city !== current.city) return true;
  if ((initial.yearsExperience ?? null) !== (current.yearsExperience ?? null)) return true;
  if (!arraysEqual(initial.specialties, current.specialties)) return true;
  if (!arraysEqual(initial.languages, current.languages)) return true;
  return false;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/**
 * Removes case-insensitive duplicates while preserving the first occurrence's casing.
 * Trims each entry. Filters out empty strings.
 */
export function dedupeChips(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const v = raw.trim();
    if (!v) continue;
    const key = v.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}
