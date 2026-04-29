'use client';

import { cityFamily, FAMILY_META } from '@/components/studio/shell';
import {
  PROFILE_LIMITS,
  validateDraft,
  type GuideProfileDraft,
} from '@/lib/studio/profile-helpers';
import { SpecialtyChipsInput } from './SpecialtyChipsInput';
import { LanguageTogglePills } from './LanguageTogglePills';

interface ProfileFormProps {
  value: GuideProfileDraft;
  onChange: (next: GuideProfileDraft) => void;
  /** ISO code of the native language (typically the first language), shown with a NATIF badge. */
  nativeLanguageCode?: string;
}

/**
 * <ProfileForm> — colonne gauche de la page Profil.
 * Avatar + Nom + Bio + Ville + Année + Spécialités + Langues.
 * Port de docs/design/ds/studio-profile.jsx:30-132.
 */
export function ProfileForm({ value, onChange, nativeLanguageCode }: ProfileFormProps) {
  const initial = (value.displayName ?? 'S').trim().charAt(0).toUpperCase() || 'S';
  const fam = cityFamily(value.city);
  const famMeta = FAMILY_META[fam];
  const validation = validateDraft(value);

  const update = <K extends keyof GuideProfileDraft>(key: K, v: GuideProfileDraft[K]) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <div className="bg-card border border-line rounded-lg p-8">
      <div className="tg-eyebrow text-ink-60">Informations</div>

      {/* Avatar */}
      <div className="mt-4 flex gap-4 items-center">
        <div
          className={`w-[72px] h-[72px] rounded-full text-paper flex items-center justify-center font-display text-h4 relative ${famMeta.bg}`}
          aria-hidden="true"
        >
          {initial}
        </div>
        <div>
          <div className="text-caption font-semibold text-ink">Photo de profil</div>
          <div className="text-meta text-ink-60 mt-0.5">
            Carrée, format JPG ou PNG, 400 px minimum.
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              disabled
              title="Bientôt disponible"
              className="text-meta px-3 py-1.5 bg-ink text-paper border-none rounded-sm font-semibold cursor-not-allowed opacity-60"
            >
              Importer
            </button>
            {value.photoUrl && (
              <button
                type="button"
                onClick={() => update('photoUrl', null)}
                className="text-meta px-3 py-1.5 bg-transparent text-ink-60 border-none cursor-pointer hover:text-ink"
              >
                Retirer
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="mt-6">
        <label htmlFor="profile-name" className="text-meta font-semibold text-ink-80 flex justify-between">
          <span>Nom d&apos;auteur</span>
          <span className="text-ink-40 font-normal">
            {value.displayName.length} / {PROFILE_LIMITS.displayNameMax}
          </span>
        </label>
        <input
          id="profile-name"
          type="text"
          value={value.displayName}
          onChange={(e) => update('displayName', e.target.value)}
          maxLength={PROFILE_LIMITS.displayNameMax}
          data-testid="profile-name"
          className="mt-1.5 w-full px-3.5 py-3 text-body-lg font-display border border-line rounded-md bg-paper text-ink box-border outline-none focus:border-grenadine transition"
        />
        {validation.errors.displayName ? (
          <div className="text-meta text-danger mt-1" role="alert">
            {validation.errors.displayName}
          </div>
        ) : (
          <div className="text-meta text-ink-60 mt-1 italic">
            C&apos;est ce que les voyageurs voient en haut de chaque tour.
          </div>
        )}
      </div>

      {/* Bio */}
      <div className="mt-5">
        <label htmlFor="profile-bio" className="text-meta font-semibold text-ink-80 flex justify-between">
          <span>Biographie</span>
          <span className="text-ink-40 font-normal">
            {value.bio?.length ?? 0} / {PROFILE_LIMITS.bioMax}
          </span>
        </label>
        <textarea
          id="profile-bio"
          rows={4}
          value={value.bio ?? ''}
          onChange={(e) => update('bio', e.target.value)}
          maxLength={PROFILE_LIMITS.bioMax}
          placeholder="Quelques lignes pour que les voyageurs vous connaissent. Pourquoi racontez-vous ces lieux ?"
          data-testid="profile-bio"
          className="mt-1.5 w-full px-3.5 py-3 text-caption font-editorial italic border border-line rounded-md bg-paper text-ink box-border outline-none focus:border-grenadine transition resize-y leading-relaxed"
        />
        {validation.errors.bio && (
          <div className="text-meta text-danger mt-1" role="alert">
            {validation.errors.bio}
          </div>
        )}
      </div>

      {/* City + Year */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label htmlFor="profile-city" className="text-meta font-semibold text-ink-80">
            Ville d&apos;attache
          </label>
          <input
            id="profile-city"
            type="text"
            value={value.city}
            onChange={(e) => update('city', e.target.value)}
            data-testid="profile-city"
            className={`mt-1.5 w-full px-3.5 py-3 text-caption border-2 ${famMeta.border} rounded-md bg-paper text-ink box-border outline-none focus:border-grenadine transition`}
          />
          <div className={`mt-1.5 text-meta ${famMeta.text} flex items-center gap-1.5`}>
            <span className={`w-2 h-2 rounded-pill ${famMeta.bg}`} aria-hidden="true" />
            Famille {famMeta.label}
          </div>
          {validation.errors.city && (
            <div className="text-meta text-danger mt-1" role="alert">
              {validation.errors.city}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="profile-year" className="text-meta font-semibold text-ink-80">
            Année de début
          </label>
          <input
            id="profile-year"
            type="number"
            value={value.yearsExperience ?? ''}
            onChange={(e) => {
              const v = e.target.value;
              update('yearsExperience', v === '' ? null : Number(v));
            }}
            min={PROFILE_LIMITS.yearMin}
            max={PROFILE_LIMITS.yearMax}
            data-testid="profile-year"
            className="mt-1.5 w-full px-3.5 py-3 text-caption border border-line rounded-md bg-paper text-ink box-border outline-none focus:border-grenadine transition"
          />
          {validation.errors.yearsExperience && (
            <div className="text-meta text-danger mt-1" role="alert">
              {validation.errors.yearsExperience}
            </div>
          )}
        </div>
      </div>

      {/* Specialties */}
      <div className="mt-5">
        <label className="text-meta font-semibold text-ink-80">Spécialités</label>
        <div className="mt-2">
          <SpecialtyChipsInput
            value={value.specialties}
            onChange={(next) => update('specialties', next)}
            max={PROFILE_LIMITS.specialtyMaxCount}
            maxLength={PROFILE_LIMITS.specialtyMaxLength}
          />
        </div>
        {validation.errors.specialties && (
          <div className="text-meta text-danger mt-1" role="alert">
            {validation.errors.specialties}
          </div>
        )}
      </div>

      {/* Languages */}
      <div className="mt-5">
        <label className="text-meta font-semibold text-ink-80">Langues parlées</label>
        <div className="mt-2">
          <LanguageTogglePills
            value={value.languages}
            onChange={(next) => update('languages', next)}
            nativeCode={nativeLanguageCode ?? value.languages[0]}
          />
        </div>
      </div>
    </div>
  );
}
