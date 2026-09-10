'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes, updateSceneData } from '@/lib/api/studio';
import { shouldUseStubs } from '@/config/api-mode';
import {
  useStudioSessionStore,
  selectSetActiveSession,
  selectClearSession,
} from '@/lib/stores/studio-session-store';
import { S3Image } from '@/components/studio/s3-image';
import * as studioUploadService from '@/lib/studio/studio-upload-service';
import {
  StepNav,
  WizField,
  WizInput,
  WizTextarea,
  WizSelect,
} from '@/components/studio/wizard';
import {
  ThemeChips,
  CityFamilyBadge,
  SessionTerrainCard,
} from '@/components/studio/wizard-general';
import type { NarrationMode, StudioScene, StudioSession } from '@/types/studio';
import type { ContentProvenance } from '@/types/moderation';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

const SERVICE_NAME = 'GeneralPage';

const TOUR_THEMES_OPTIONS = [
  { value: 'histoire', label: 'Histoire' },
  { value: 'art', label: 'Art' },
  { value: 'nature', label: 'Nature' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'culture', label: 'Culture' },
  { value: 'insolite', label: 'Insolite' },
  { value: 'romantique', label: 'Romantique' },
  { value: 'famille', label: 'Famille' },
  { value: 'sportif', label: 'Sportif' },
] as const;

// mon-1.2 (parité web) — modèle d'accès de la visite, écrit sur GuideTour.
const PRICE_MIN_EUROS = 0.99;
const PRICE_MAX_EUROS = 49.99;

export default function GeneralPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const { locale, t } = useStudioLocale();

  const themeOptions = useMemo(
    () => TOUR_THEMES_OPTIONS.map((option) => ({
      ...option,
      label: locale === 'en' ? ({ histoire: 'History', art: 'Art', nature: 'Nature', architecture: 'Architecture', culture: 'Culture', insolite: 'Unusual', romantique: 'Romantic', famille: 'Family', sportif: 'Sports' } as Record<string, string>)[option.value] : option.label,
    })),
    [locale],
  );
  const difficultyOptions = useMemo(() => [
    { value: 'facile', label: t('Facile — accessible à tous', 'Easy — accessible to everyone') },
    { value: 'moyen', label: t('Moyen — quelques montées', 'Moderate — some uphill sections') },
    { value: 'difficile', label: t('Difficile — terrain accidenté', 'Difficult — uneven terrain') },
  ], [t]);
  const languageOptions = useMemo(() => [
    { value: 'fr', label: t('Français', 'French') },
    { value: 'en', label: t('Anglais', 'English') },
    { value: 'es', label: t('Espagnol', 'Spanish') },
    { value: 'de', label: t('Allemand', 'German') },
    { value: 'it', label: t('Italien', 'Italian') },
  ], [t]);
  const purchaseTypeOptions = useMemo(() => [
    { value: 'free', label: t('Gratuite', 'Free') },
    { value: 'paid', label: t('Payante', 'Paid') },
    { value: 'subscription_only', label: t('Abonnés uniquement', 'Subscribers only') },
  ], [t]);

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenesCount, setScenesCount] = useState(0);
  const [scenesWithAudio, setScenesWithAudio] = useState<StudioScene[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);
  const [isSavingMode, setIsSavingMode] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('fr');
  const [narrationMode, setNarrationMode] = useState<NarrationMode | null>(null);
  const [difficulty, setDifficulty] = useState('facile');
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [contentProvenance, setContentProvenance] = useState<ContentProvenance | null>(null);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  // BTU-8 — conseils pratiques libres du guide (météo locale, horaires, marées…),
  // éditables même une fois le tour publié (comme le prix).
  const [practicalTips, setPracticalTips] = useState('');
  // mon-1.2 (parité web) — monétisation
  const [purchaseType, setPurchaseType] = useState<'free' | 'paid' | 'subscription_only'>('free');
  const [priceEuros, setPriceEuros] = useState('');
  const [priceError, setPriceError] = useState<string | null>(null);
  const [supportsMonetization, setSupportsMonetization] = useState(false);

  // Cover photo state
  const [coverPhotoKey, setCoverPhotoKey] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const clearSession = useStudioSessionStore(selectClearSession);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    async function load() {
      try {
        const [sess, scenesList] = await Promise.all([
          getStudioSession(sessionId),
          listStudioScenes(sessionId),
        ]);
        if (cancelled) return;
        setSession(sess);
        setScenesCount(scenesList.length);
        setScenesWithAudio(scenesList.filter((scene) => Boolean(scene.originalAudioKey || scene.studioAudioKey)));
        if (sess) {
          setActiveSession(sess);
          setTitle(sess.title || '');
          setLanguage(sess.language || 'fr');
          setNarrationMode(sess.narrationMode ?? null);
          setCoverPhotoKey(sess.coverPhotoKey);

          let databaseThemes = (sess.themes ?? []).filter((theme) => theme !== 'gastronomie');
          let databaseDifficulty: string | null = null;
          if (databaseThemes.length > 0) setSelectedThemes(databaseThemes);

          if (sess.tourId) {
            try {
              const { getGuideTourById } = await import('@/lib/api/appsync-client');
              const tourResult = await getGuideTourById(sess.tourId);
              if (tourResult) {
                const tour = tourResult as unknown as Record<string, unknown>;
                setSupportsMonetization('purchaseType' in tour || 'priceCents' in tour);
                setCity((tour.city as string) || '');
                setDescription((tour.description as string) || '');
                databaseThemes = Array.isArray(tour.themes)
                  ? (tour.themes as string[]).filter((theme) => theme !== 'gastronomie')
                  : databaseThemes;
                if (databaseThemes.length > 0) setSelectedThemes(databaseThemes);
                databaseDifficulty = typeof tour.difficulty === 'string' ? tour.difficulty : null;
                if (databaseDifficulty) setDifficulty(databaseDifficulty);
                if (
                  tour.contentProvenance === 'human'
                  || tour.contentProvenance === 'ai'
                  || tour.contentProvenance === 'mixed'
                ) {
                  setContentProvenance(tour.contentProvenance);
                }
                setDuration((tour.duration as number) || 0);
                setDistance((tour.distance as number) || 0);
                setPracticalTips((tour.practicalTips as string) || '');
                setPurchaseType(
                  (tour.purchaseType as 'free' | 'paid' | 'subscription_only') ?? 'free',
                );
                const pc = tour.priceCents as number | undefined;
                setPriceEuros(typeof pc === 'number' ? (pc / 100).toFixed(2) : '');
              }
            } catch (e) {
              logger.warn(SERVICE_NAME, 'Failed to load tour data', {
                tourId: sess.tourId,
                error: String(e),
              });
            }
          }

          try {
            const stored = localStorage.getItem(`tour-meta-${sess.tourId ?? sessionId}`);
            if (stored) {
              const meta = JSON.parse(stored) as { difficulty?: string; themes?: string[] };
              // Migration douce des anciennes saisies stockées uniquement dans
              // le navigateur. La base reste désormais la source de vérité.
              if (!databaseDifficulty && meta.difficulty) setDifficulty(meta.difficulty);
              if (databaseThemes.length === 0 && meta.themes) {
                setSelectedThemes(meta.themes.filter((theme) => theme !== 'gastronomie'));
              }
            }
          } catch {
            // ignore
          }
        }
        logger.info(SERVICE_NAME, 'General page loaded', { sessionId });
      } catch (e) {
        if (!cancelled) {
          setError('Impossible de charger la session.');
          logger.error(SERVICE_NAME, 'Load failed', { error: String(e) });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      clearSession();
    };
  }, [sessionId, setActiveSession, clearSession]);

  const handleCoverUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setCoverError('Format non supporté. Utilisez JPEG, PNG ou WebP.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setCoverError('Photo trop volumineuse (max 5 MB).');
        return;
      }

      setCoverError(null);
      setIsUploadingCover(true);

      if (shouldUseStubs()) {
        const url = URL.createObjectURL(file);
        setCoverPreviewUrl(url);
        setCoverPhotoKey(`cover-stub-${Date.now()}`);
        setIsUploadingCover(false);
        return;
      }

      try {
        const result = await studioUploadService.uploadCoverPhoto(file, sessionId);
        if (result.ok) {
          if (coverPhotoKey) studioUploadService.clearCacheEntry(coverPhotoKey);
          studioUploadService.clearCacheEntry(result.s3Key);
          setCoverPhotoKey(result.s3Key);
          setCoverPreviewUrl(URL.createObjectURL(file));
        } else {
          setCoverError(result.error);
        }
      } catch (err) {
        setCoverError('Erreur inattendue.');
        logger.error(SERVICE_NAME, 'Cover upload failed', { error: String(err) });
      } finally {
        setIsUploadingCover(false);
      }

      if (coverInputRef.current) coverInputRef.current.value = '';
    },
    [sessionId, coverPhotoKey],
  );

  const handleRemoveCover = useCallback(() => {
    setCoverPhotoKey(null);
    setCoverPreviewUrl(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  }, []);

  const isLocked = session
    ? ['submitted', 'published', 'revision_requested'].includes(session.status)
    : false;
  const canEditMonetization = supportsMonetization
    && (!isLocked || session?.status === 'published');
  // BTU-8 — comme le prix, les conseils pratiques restent modifiables une fois publié.
  const canEditPracticalTips = !isLocked || session?.status === 'published';
  const canSave = !isLocked || canEditMonetization || canEditPracticalTips;

  const chooseNarrationMode = useCallback(async (nextMode: NarrationMode) => {
    if (!session || isSavingMode) return;
    const removesRecordedAudio = nextMode === 'tts_on_demand' && scenesWithAudio.length > 0;
    if (nextMode === narrationMode && !removesRecordedAudio) return;
    if (removesRecordedAudio) {
      const confirmed = window.confirm(t(
        `Passer à la voix de synthèse supprimera définitivement les audios enregistrés sur ${scenesWithAudio.length} scène${scenesWithAudio.length > 1 ? 's' : ''}. Les textes seront conservés. Confirmer ce changement ?`,
        `Switching to text-to-speech will permanently delete recorded audio from ${scenesWithAudio.length} scene${scenesWithAudio.length > 1 ? 's' : ''}. Text will be kept. Confirm this change?`,
      ));
      if (!confirmed) return;
    }
    setModeError(null);
    setIsSavingMode(true);
    const clearedScenes: StudioScene[] = [];
    try {
      const appsync = await import('@/lib/api/appsync-client');
      if (removesRecordedAudio) {
        for (const scene of scenesWithAudio) {
          const clearResult = await updateSceneData(scene.id, {
            studioAudioKey: null,
            originalAudioKey: null,
            baseAudioSource: null,
            status: scene.transcriptText?.trim() ? 'edited' : 'empty',
            takesCount: 0,
            selectedTakeIndex: null,
          });
          if (!clearResult.ok) throw new Error(`L’audio de la scène ${scene.sceneIndex + 1} n’a pas pu être supprimé.`);
          clearedScenes.push(scene);
        }
      }

      const result = await appsync.updateStudioSessionMutation(sessionId, { narrationMode: nextMode });
      if (!result.ok) throw new Error(result.error);
      if (!result.data) throw new Error('AppSync n’a renvoyé aucune session mise à jour.');
      const updatedSession = { ...session, narrationMode: nextMode };
      setSession(updatedSession);
      setNarrationMode(nextMode);
      setActiveSession(updatedSession);
      if (removesRecordedAudio) {
        const keys = [...new Set(scenesWithAudio.flatMap((scene) => [scene.studioAudioKey, scene.originalAudioKey])
          .filter((key): key is string => Boolean(key)))];
        setScenesWithAudio([]);
        const { removeStoredAudio } = await import('@/lib/studio/studio-upload-service');
        const removals = await Promise.all(keys.map((key) => removeStoredAudio(key)));
        if (removals.some((removal) => !removal.ok)) {
          logger.warn(SERVICE_NAME, 'Narration mode changed but some orphan audio objects remain', { sessionId });
        }
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      if (clearedScenes.length > 0) {
        await Promise.all(clearedScenes.map((scene) => updateSceneData(scene.id, {
          studioAudioKey: scene.studioAudioKey,
          originalAudioKey: scene.originalAudioKey,
          baseAudioSource: scene.baseAudioSource,
          status: scene.status,
          takesCount: scene.takesCount,
          selectedTakeIndex: scene.selectedTakeIndex,
        })));
      }
      const detail = e instanceof Error ? e.message : String(e);
      setModeError(t(
        `Le choix de narration n'a pas été sauvegardé : ${detail}`,
        `The narration choice was not saved: ${detail}`,
      ));
    } finally {
      setIsSavingMode(false);
    }
  }, [isSavingMode, narrationMode, scenesWithAudio, session, sessionId, setActiveSession, t]);

  const handleSave = useCallback(async () => {
    if (!session) return;
    if (!narrationMode && !isLocked) {
      setSaveError('Choisissez comment cette version sera racontée.');
      return;
    }
    if (!isLocked && selectedThemes.length === 0) {
      setSaveError(t('Choisissez au moins un thème.', 'Choose at least one theme.'));
      return;
    }
    if (!isLocked && contentProvenance === null) {
      setSaveError(t(
        'Indiquez comment le contenu de la visite a été créé.',
        'Tell us how the tour content was created.',
      ));
      return;
    }

    // mon-1.2 (parité web) — validate price for a paid tour before saving.
    // AppSync rejects `null` for owner updates on this optional field. Zero also
    // clears any stale paid price while purchaseType remains the access source of truth.
    let priceCents = 0;
    if (purchaseType === 'paid') {
      const euros = Number(priceEuros.replace(',', '.'));
      if (!Number.isFinite(euros) || euros < PRICE_MIN_EUROS || euros > PRICE_MAX_EUROS) {
        setPriceError(
          `Prix entre ${PRICE_MIN_EUROS.toFixed(2).replace('.', ',')} € et ${PRICE_MAX_EUROS.toFixed(2).replace('.', ',')} €`,
        );
        return;
      }
      priceCents = Math.round(euros * 100);
    }
    setPriceError(null);
    setSaveError(null);
    setIsSaved(false);
    setIsSaving(true);

    try {
      const appsync = await import('@/lib/api/appsync-client');
      if (!isLocked) {
        const sessionResult = await appsync.updateStudioSessionMutation(sessionId, {
          title,
          language,
          narrationMode,
          coverPhotoKey,
          availableLanguages: [language],
          description,
          themes: selectedThemes,
          durationMinutes: duration,
        });
        if (!sessionResult.ok) throw new Error(sessionResult.error);
        const updatedSession = {
          ...session,
          title,
          language,
          narrationMode,
          coverPhotoKey,
          description,
          themes: selectedThemes,
          durationMinutes: duration,
        };
        setSession(updatedSession);
        setActiveSession(updatedSession);
      }
      if (!session.tourId) throw new Error('No tour associated with this session.');
      const monetizationUpdates = supportsMonetization ? { purchaseType, priceCents } : {};
      const practicalTipsUpdates = canEditPracticalTips ? { practicalTips } : {};
      const tourResult = await appsync.updateGuideTourMutation(
        session.tourId,
        isLocked ? { ...monetizationUpdates, ...practicalTipsUpdates } : {
          title,
          city,
          description,
          themes: selectedThemes,
          difficulty,
          contentProvenance,
          coverPhotoKey,
          duration,
          distance,
          poiCount: scenesCount,
          // mon-1.2 (parité web) → consommé par mon-1.3b (createTourPaymentIntent lit GuideTour).
          ...monetizationUpdates,
          ...practicalTipsUpdates,
        },
      );
      if (!tourResult.ok) throw new Error(tourResult.error);
      if (!isLocked) {
        localStorage.setItem(
          `tour-meta-${session.tourId ?? sessionId}`,
          JSON.stringify({ difficulty, themes: selectedThemes }),
        );
      }
      logger.info(SERVICE_NAME, 'Saved general info', { sessionId });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (e) {
      logger.error(SERVICE_NAME, 'Save failed', { error: String(e) });
      const detail = e instanceof Error ? e.message : String(e);
      setSaveError(t(
        `L'enregistrement a échoué : ${detail}`,
        `Save failed: ${detail}`,
      ));
    } finally {
      setIsSaving(false);
    }
  }, [
    sessionId,
    session,
    title,
    city,
    description,
    language,
    difficulty,
    duration,
    distance,
    coverPhotoKey,
    narrationMode,
    selectedThemes,
    contentProvenance,
    scenesCount,
    purchaseType,
    priceEuros,
    supportsMonetization,
    isLocked,
    practicalTips,
    canEditPracticalTips,
    setActiveSession,
    t,
  ]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto" aria-busy="true">
        <div className="bg-paper-deep rounded-md h-96 animate-pulse" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl mx-auto">
        <Link
          href={`/guide/studio/${sessionId}`}
          className="text-grenadine text-caption font-semibold no-underline hover:opacity-80 mb-3 inline-block"
        >
          ← {t('Retour', 'Back')}
        </Link>
        <div
          className="bg-grenadine-soft border border-grenadine rounded-md p-4 text-danger"
          role="alert"
        >
          {error || t('Session introuvable.', 'Session not found.')}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {isLocked && (
        <div
          className="mb-4 rounded-md border border-ocre bg-ocre-soft px-4 py-2.5 text-meta text-ocre"
          role="status"
          data-testid="readonly-banner"
        >
          {t(
            session.status === 'published'
              ? 'Visite publiée — le contenu est en lecture seule. Vous pouvez modifier son accès et son tarif.'
              : 'Visite soumise — les informations sont en lecture seule.',
            session.status === 'published'
              ? 'Published tour — content is read-only. You can still change access and pricing.'
              : 'Submitted tour — information is read-only. You can still add languages.',
          )}
        </div>
      )}

      {/* ───── Photo de couverture ───── */}
      <WizField label={t('Photo de couverture', 'Cover photo')}>
        <div className="flex flex-wrap gap-4 items-start">
          <div className="w-[200px] h-[132px] rounded-md overflow-hidden border border-line bg-paper-soft flex items-center justify-center">
            {coverPreviewUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={coverPreviewUrl}
                alt="Couverture"
                className="w-full h-full object-cover"
              />
            ) : coverPhotoKey ? (
              <S3Image
                s3Key={coverPhotoKey}
                alt="Couverture"
                className="w-full h-full object-cover"
                fallback="Photo de couverture"
              />
            ) : (
              <span className="text-meta text-ink-40 text-center px-2">
                {t('Aucune photo', 'No photo')}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleCoverUpload}
              className="hidden"
              data-testid="cover-photo-input"
              disabled={isLocked}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={isUploadingCover || isLocked}
              data-testid="cover-photo-btn"
              className="text-meta text-grenadine font-semibold underline underline-offset-2 hover:opacity-80 transition disabled:opacity-50 text-left"
            >
              {isUploadingCover ? t('Envoi…', 'Uploading...') : coverPhotoKey ? t('Changer', 'Change') : t('Ajouter', 'Add')}
            </button>
            {coverPhotoKey && !isLocked && (
              <button
                type="button"
                onClick={handleRemoveCover}
                data-testid="remove-cover-btn"
                className="text-meta text-danger font-semibold underline underline-offset-2 hover:opacity-80 transition text-left"
              >
                {t('Supprimer', 'Remove')}
              </button>
            )}
            <div className="text-meta text-ink-60 italic mt-1 max-w-[200px]">
              JPG, PNG ou WebP · 1200 × 800 minimum · 5 Mo max.
            </div>
            {coverError && (
              <div className="text-meta text-danger mt-1">{coverError}</div>
            )}
          </div>
        </div>
      </WizField>

      {/* ───── Titre + Ville ───── */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-4">
        <WizField label={t('Titre du tour', 'Tour title')} required htmlFor="tour-title">
          <WizInput
            id="tour-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            disabled={isLocked}
            data-testid="title-input"
            placeholder={t('Ex : Vence — Chapelle Matisse et Cité Épiscopale', 'Example: Vence — Matisse Chapel and Episcopal City')}
          />
        </WizField>
        <WizField
          label={t('Ville', 'City')}
          required
          htmlFor="tour-city"
          helper={t('Couleur attribuée automatiquement selon la ville.', 'Colour is assigned automatically based on the city.')}
        >
          <div className="relative">
            <WizInput
              id="tour-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={50}
              disabled={isLocked}
              data-testid="city-input"
              placeholder="Ex : Vence"
            />
            <CityFamilyBadge city={city} />
          </div>
        </WizField>
      </div>

      {/* ───── Description ───── */}
      <WizField
        label={t('Description longue', 'Full description')}
        hint={`${description.length} / 2000`}
        htmlFor="tour-description"
      >
        <WizTextarea
          id="tour-description"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          disabled={isLocked}
          data-testid="description-input"
          placeholder={t("Décrivez votre tour tel qu'il apparaîtra dans le catalogue…", 'Describe your tour as it will appear in the catalogue...')}
        />
      </WizField>

      {/* ───── BTU-8 : Conseils pratiques (éditable même une fois publié) ───── */}
      <WizField
        label={t('Conseils pratiques', 'Practical tips')}
        hint={`${practicalTips.length} / 500`}
        htmlFor="tour-practical-tips"
        helper={t(
          "Visible par le visiteur avant/pendant la visite : météo locale, horaires, marées, toilettes…",
          'Shown to the visitor before/during the tour: local weather, opening hours, tides, restrooms…',
        )}
      >
        <WizTextarea
          id="tour-practical-tips"
          rows={3}
          value={practicalTips}
          onChange={(e) => setPracticalTips(e.target.value)}
          maxLength={500}
          disabled={!canEditPracticalTips}
          data-testid="practical-tips-input"
          placeholder={t('Ex : Prévoir de bonnes chaussures, le quai est glissant par temps de pluie.', 'E.g. Wear good shoes, the quay is slippery when wet.')}
        />
      </WizField>

      {/* ───── Langue / Difficulté / Durée / Distance ───── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <WizField label={t('Langue', 'Language')} htmlFor="tour-language">
          <WizSelect
            id="tour-language"
            options={languageOptions}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isLocked}
            data-testid="language-select"
          />
        </WizField>
        <WizField label={t('Difficulté', 'Difficulty')} htmlFor="tour-difficulty">
          <WizSelect
            id="tour-difficulty"
            options={difficultyOptions}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            disabled={isLocked}
            data-testid="difficulty-select"
          />
        </WizField>
        <WizField label={t('Durée (min)', 'Duration (min)')} htmlFor="tour-duration">
          <WizInput
            id="tour-duration"
            type="number"
            min={0}
            max={300}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            disabled={isLocked}
            data-testid="duration-input"
          />
        </WizField>
        <WizField label={t('Distance (km)', 'Distance (km)')} htmlFor="tour-distance">
          <WizInput
            id="tour-distance"
            type="number"
            min={0}
            max={50}
            step={0.1}
            value={distance}
            onChange={(e) => setDistance(Number(e.target.value))}
            disabled={isLocked}
            data-testid="distance-input"
          />
        </WizField>
      </div>

      <WizField
        label={t('Comment sera racontée cette visite ?', 'How will this tour be narrated?')}
        helper={t(
          scenesWithAudio.length > 0
            ? `${scenesWithAudio.length} scène${scenesWithAudio.length > 1 ? 's ont' : ' a'} actuellement un audio enregistré. Passer au TTS supprimera ces audios après confirmation.`
            : 'Ce choix vaut pour toute cette version et ne peut pas être mélangé scène par scène.',
          scenesWithAudio.length > 0
            ? `${scenesWithAudio.length} scene${scenesWithAudio.length > 1 ? 's currently have' : ' currently has'} recorded audio. Switching to TTS will delete it after confirmation.`
            : 'This choice applies to the whole version and cannot be mixed scene by scene.',
        )}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="narration-mode-picker">
          {([
            ['recording', 'Ma voix', 'Ajoutez un texte final et un enregistrement humain à chaque scène.'],
            ['tts_on_demand', 'Voix de synthèse à la demande', 'Finalisez uniquement les textes. Murmure fabriquera une narration mutualisée à la première écoute.'],
          ] as const).map(([value, label, descriptionText]) => (
            <button
              key={value}
              type="button"
              disabled={isLocked || isSavingMode}
              aria-pressed={narrationMode === value}
              data-testid={`narration-mode-${value}`}
              onClick={() => chooseNarrationMode(value)}
              className={`rounded-md border p-4 text-left transition ${
                narrationMode === value
                  ? 'border-grenadine bg-grenadine-soft'
                  : 'border-line bg-paper hover:border-ink-40'
              } disabled:opacity-60`}
            >
              <span className="block text-caption font-bold text-ink">{label}</span>
              <span className="mt-1 block text-meta text-ink-60">{descriptionText}</span>
            </button>
          ))}
        </div>
        {modeError && (
          <div className="mt-3 rounded-md border border-grenadine bg-grenadine-soft p-3 text-sm text-danger" role="alert">
            <p>{modeError}</p>
          </div>
        )}
        {isSavingMode && (
          <p className="mt-2 text-sm text-ink-60" role="status" data-testid="narration-mode-saving">
            {t('Sauvegarde du choix…', 'Saving choice…')}
          </p>
        )}
      </WizField>

      {/* ───── Thèmes ───── */}
      <WizField
        label={t('Thèmes', 'Themes')}
        helper={t('Maximum 3 thèmes. Ils servent à la recherche dans le catalogue.', 'Choose up to 3 themes. They are used for catalogue search.')}
      >
        <ThemeChips
          options={themeOptions}
          value={selectedThemes}
          onChange={setSelectedThemes}
          max={3}
        />
      </WizField>

      <WizField
        label={t('Comment le contenu a-t-il été créé ?', 'How was the content created?')}
        helper={t(
          "Ce choix concerne les textes et le parcours, pas la voix audio. Il permet d'afficher correctement la mention « Developed with AI ».",
          'This choice concerns the text and itinerary, not the audio voice. It ensures the “Developed with AI” label is shown correctly.',
        )}
        required
      >
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
          role="radiogroup"
          aria-label={t('Origine du contenu', 'Content origin')}
          data-testid="content-provenance-picker"
        >
          {([
            ['human', t('Écrit par moi', 'Written by me'), t('Le contenu a été créé sans IA.', 'The content was created without AI.')],
            ['mixed', t("Avec l'aide de l'IA", 'With AI assistance'), t("J'ai vérifié et adapté le contenu proposé par l'IA.", 'I reviewed and adapted AI-assisted content.')],
            ['ai', t("Créé principalement avec l'IA", 'Created mainly with AI'), t('La mention « Developed with AI » sera affichée.', 'The “Developed with AI” label will be shown.')],
          ] as const).map(([value, label, explanation]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={contentProvenance === value}
              disabled={isLocked}
              data-testid={`content-provenance-${value}`}
              onClick={() => setContentProvenance(value)}
              className={`rounded-md border p-4 text-left transition ${
                contentProvenance === value
                  ? 'border-grenadine bg-grenadine-soft'
                  : 'border-line bg-paper hover:border-ink-40'
              } disabled:opacity-60`}
            >
              <span className="block text-caption font-bold text-ink">{label}</span>
              <span className="mt-1 block text-meta text-ink-60">{explanation}</span>
            </button>
          ))}
        </div>
      </WizField>

      {/* ───── Monétisation (mon-1.2 parité web) ───── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizField
          label={t('Monétisation', 'Access and pricing')}
          htmlFor="tour-purchase-type"
          helper={t('Comment les voyageurs accèdent à cette visite.', 'Choose how visitors access this tour.')}
        >
          <WizSelect
            id="tour-purchase-type"
            options={purchaseTypeOptions}
            value={purchaseType}
            onChange={(e) =>
              setPurchaseType(e.target.value as 'free' | 'paid' | 'subscription_only')
            }
            disabled={!canEditMonetization}
            data-testid="purchase-type-select"
          />
        </WizField>
        {purchaseType === 'paid' && (
          <WizField
            label={t('Prix (€)', 'Price (€)')}
            htmlFor="tour-price"
            helper={t('Entre 0,99 € et 49,99 €. Le prix in-app dépend du produit créé sur le store.', 'Between €0.99 and €49.99. The in-app price depends on the store product.')}
          >
            <WizInput
              id="tour-price"
              type="number"
              min={PRICE_MIN_EUROS}
              max={PRICE_MAX_EUROS}
              step={0.01}
              value={priceEuros}
              onChange={(e) => setPriceEuros(e.target.value)}
              disabled={!canEditMonetization}
              data-testid="price-input"
              placeholder="4.99"
            />
          </WizField>
        )}
      </div>
      {priceError && (
        <div className="text-meta text-danger mb-3" role="alert" data-testid="price-error">
          {priceError}
        </div>
      )}

      {/* ───── Session terrain ───── */}
      <div className="mb-5">
        <SessionTerrainCard
          scenesCount={scenesCount}
          capturedAt={session.createdAt}
          status={session.status}
          defaultCollapsed
        />
      </div>

      {/* ───── Save bar ───── */}
      <div className="flex items-center gap-3 flex-wrap mt-2 mb-2">
        {canSave && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isSavingMode}
            data-testid="save-general-btn"
            className="bg-ink text-paper border-none px-5 py-2.5 rounded-pill text-caption font-bold cursor-pointer hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving || isSavingMode
              ? t('Enregistrement...', 'Saving...')
              : session.status === 'published'
                ? t('Enregistrer le tarif', 'Save pricing')
                : t('Enregistrer', 'Save')}
          </button>
        )}
        {isSaved && (
          <span className="text-caption text-success font-semibold" role="status">
            ✓ {t('Enregistré', 'Saved')}
          </span>
        )}
        {saveError && (
          <span className="text-caption text-danger font-semibold" role="alert" data-testid="save-general-error">
            {saveError}
          </span>
        )}
      </div>

      {/* ───── Step nav ───── */}
      <StepNav
        prevHref={`/guide/studio/${sessionId}`}
        prevLabel={t('Accueil', 'Home')}
        nextHref={`/guide/studio/${sessionId}/itinerary`}
        nextLabel={t('Itinéraire', 'Itinerary')}
        prevDisabled={isSavingMode}
        nextDisabled={isSavingMode}
      />
    </div>
  );
}
