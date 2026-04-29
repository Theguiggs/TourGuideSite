import {
  validateDraft,
  hasUnsavedChanges,
  dedupeChips,
  PROFILE_LIMITS,
  type GuideProfileDraft,
} from '../profile-helpers';

const baseDraft: GuideProfileDraft = {
  displayName: 'Steffen Guillaume',
  bio: 'Une bio courte et soignée.',
  photoUrl: null,
  city: 'Grasse',
  yearsExperience: 2018,
  specialties: ['Parfumerie', 'Histoire locale'],
  languages: ['fr', 'en'],
};

describe('validateDraft', () => {
  it('accepte un draft valide', () => {
    const r = validateDraft(baseDraft);
    expect(r.ok).toBe(true);
    expect(r.errors).toEqual({});
  });

  it("refuse un displayName trop court", () => {
    const r = validateDraft({ ...baseDraft, displayName: 'a' });
    expect(r.ok).toBe(false);
    expect(r.errors.displayName).toBeTruthy();
  });

  it('refuse un displayName trop long', () => {
    const long = 'x'.repeat(PROFILE_LIMITS.displayNameMax + 1);
    const r = validateDraft({ ...baseDraft, displayName: long });
    expect(r.errors.displayName).toBeTruthy();
  });

  it('refuse une bio dépassant la limite', () => {
    const long = 'a'.repeat(PROFILE_LIMITS.bioMax + 1);
    const r = validateDraft({ ...baseDraft, bio: long });
    expect(r.errors.bio).toBeTruthy();
  });

  it('refuse une ville vide', () => {
    const r = validateDraft({ ...baseDraft, city: '   ' });
    expect(r.errors.city).toBeTruthy();
  });

  it('refuse une année hors bornes', () => {
    expect(validateDraft({ ...baseDraft, yearsExperience: 1900 }).errors.yearsExperience).toBeTruthy();
    expect(validateDraft({ ...baseDraft, yearsExperience: 9999 }).errors.yearsExperience).toBeTruthy();
  });

  it('accepte yearsExperience null', () => {
    expect(validateDraft({ ...baseDraft, yearsExperience: null }).ok).toBe(true);
  });

  it('refuse trop de spécialités', () => {
    const tooMany = Array.from({ length: PROFILE_LIMITS.specialtyMaxCount + 1 }, (_, i) => `s${i}`);
    const r = validateDraft({ ...baseDraft, specialties: tooMany });
    expect(r.errors.specialties).toBeTruthy();
  });
});

describe('hasUnsavedChanges', () => {
  it('false si tout est égal', () => {
    expect(hasUnsavedChanges(baseDraft, { ...baseDraft })).toBe(false);
  });

  it('true sur changement de displayName', () => {
    expect(hasUnsavedChanges(baseDraft, { ...baseDraft, displayName: 'Autre' })).toBe(true);
  });

  it('true sur ajout de spécialité', () => {
    expect(
      hasUnsavedChanges(baseDraft, { ...baseDraft, specialties: ['Parfumerie', 'Histoire locale', 'Autre'] }),
    ).toBe(true);
  });

  it('true sur changement d’ordre des spécialités', () => {
    expect(
      hasUnsavedChanges(baseDraft, { ...baseDraft, specialties: ['Histoire locale', 'Parfumerie'] }),
    ).toBe(true);
  });

  it('false si bio passe de null à "" et vice-versa', () => {
    expect(hasUnsavedChanges(
      { ...baseDraft, bio: null },
      { ...baseDraft, bio: '' },
    )).toBe(false);
  });
});

describe('dedupeChips', () => {
  it('retire les doublons case-insensitive', () => {
    expect(dedupeChips(['Histoire', 'histoire', 'HISTOIRE'])).toEqual(['Histoire']);
  });

  it('trim les espaces et retire les vides', () => {
    expect(dedupeChips(['  abc  ', '', '   '])).toEqual(['abc']);
  });

  it("conserve l'ordre d'origine", () => {
    expect(dedupeChips(['c', 'a', 'b', 'A'])).toEqual(['c', 'a', 'b']);
  });

  it('retourne un tableau vide pour input vide', () => {
    expect(dedupeChips([])).toEqual([]);
  });
});
