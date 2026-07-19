'use client';

import { useRef, useState } from 'react';
import { cityFamily, FAMILY_META } from '@/components/studio/shell';
import {
  PROFILE_LIMITS,
  validateDraft,
  type GuideProfileDraft,
} from '@/lib/studio/profile-helpers';
import { uploadGuideProfilePhoto } from '@/lib/studio/studio-upload-service';
import { S3Image } from '@/components/studio/s3-image';
import { SpecialtyChipsInput } from './SpecialtyChipsInput';
import { LanguageTogglePills } from './LanguageTogglePills';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

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
  const { locale } = useStudioLocale();
  const copy = locale === 'en' ? {
    information: 'Information', profilePhoto: 'Profile photo', photoAlt: 'Profile photo', photoHint: 'Square JPG or PNG, at least 400 px (5 MB max).',
    uploading: 'Uploading...', change: 'Change', import: 'Upload', remove: 'Remove', uploadFailed: 'Photo upload failed.',
    authorName: 'Author name', nameHint: 'This is what travellers see at the top of every tour.', bio: 'Biography',
    bioPlaceholder: 'A few lines to help travellers get to know you. Why do you tell the stories of these places?',
    homeCity: 'Home city', family: 'Family', startYear: 'Starting year', specialties: 'Specialties', languages: 'Languages spoken',
  } : {
    information: 'Informations', profilePhoto: 'Photo de profil', photoAlt: 'Photo de profil', photoHint: 'Carrée, format JPG ou PNG, 400 px minimum (max 5 Mo).',
    uploading: 'Import...', change: 'Changer', import: 'Importer', remove: 'Retirer', uploadFailed: 'Échec de l’envoi de la photo.',
    authorName: "Nom d'auteur", nameHint: 'C’est ce que les voyageurs voient en haut de chaque visite.', bio: 'Biographie',
    bioPlaceholder: 'Quelques lignes pour que les voyageurs vous connaissent. Pourquoi racontez-vous ces lieux ?',
    homeCity: "Ville d'attache", family: 'Famille', startYear: 'Année de début', specialties: 'Spécialités', languages: 'Langues parlées',
  };
  const initial = (value.displayName ?? 'S').trim().charAt(0).toUpperCase() || 'S';
  const fam = cityFamily(value.city);
  const famMeta = FAMILY_META[fam];
  const validation = validateDraft(value);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const update = <K extends keyof GuideProfileDraft>(key: K, v: GuideProfileDraft[K]) => {
    onChange({ ...value, [key]: v });
  };

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const result = await uploadGuideProfilePhoto(file);
      if (result.ok) {
        update('photoUrl', result.s3Key);
      } else {
        setUploadError(result.error);
      }
    } catch {
      setUploadError(copy.uploadFailed);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-card border border-line rounded-lg p-8">
      <div className="tg-eyebrow text-ink-60">{copy.information}</div>

      {/* Avatar */}
      <div className="mt-4 flex gap-4 items-center">
        {value.photoUrl ? (
          <S3Image
            s3Key={value.photoUrl}
            alt={copy.photoAlt}
            className="w-[72px] h-[72px] rounded-full shrink-0"
          />
        ) : (
          <div
            className={`w-[72px] h-[72px] rounded-full text-paper flex items-center justify-center font-display text-h4 relative shrink-0 ${famMeta.bg}`}
            aria-hidden="true"
          >
            {initial}
          </div>
        )}
        <div>
          <div className="text-caption font-semibold text-ink">{copy.profilePhoto}</div>
          <div className="text-meta text-ink-60 mt-0.5">
            {copy.photoHint}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoSelected}
            className="hidden"
            data-testid="profile-photo-input"
          />
          <div className="flex gap-2 mt-2 items-center">
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="text-meta px-3 py-1.5 bg-ink text-paper border-none rounded-sm font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="profile-photo-import"
            >
              {uploading ? copy.uploading : value.photoUrl ? copy.change : copy.import}
            </button>
            {value.photoUrl && !uploading && (
              <button
                type="button"
                onClick={() => update('photoUrl', null)}
                className="text-meta px-3 py-1.5 bg-transparent text-ink-60 border-none cursor-pointer hover:text-ink"
              >
                {copy.remove}
              </button>
            )}
          </div>
          {uploadError && (
            <div className="text-meta text-danger mt-1" role="alert">
              {uploadError}
            </div>
          )}
        </div>
      </div>

      {/* Display name */}
      <div className="mt-6">
        <label htmlFor="profile-name" className="text-meta font-semibold text-ink-80 flex justify-between">
          <span>{copy.authorName}</span>
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
            {copy.nameHint}
          </div>
        )}
      </div>

      {/* Bio */}
      <div className="mt-5">
        <label htmlFor="profile-bio" className="text-meta font-semibold text-ink-80 flex justify-between">
          <span>{copy.bio}</span>
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
          placeholder={copy.bioPlaceholder}
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
            {copy.homeCity}
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
            {copy.family} {famMeta.label}
          </div>
          {validation.errors.city && (
            <div className="text-meta text-danger mt-1" role="alert">
              {validation.errors.city}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="profile-year" className="text-meta font-semibold text-ink-80">
            {copy.startYear}
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
        <label className="text-meta font-semibold text-ink-80">{copy.specialties}</label>
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
        <label className="text-meta font-semibold text-ink-80">{copy.languages}</label>
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
