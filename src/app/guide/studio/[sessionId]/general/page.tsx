'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes } from '@/lib/api/studio';
import { shouldUseStubs } from '@/config/api-mode';
import {
  useStudioSessionStore,
  selectSetActiveSession,
  selectClearSession,
} from '@/lib/stores/studio-session-store';
import { S3Image } from '@/components/studio/s3-image';
import * as studioUploadService from '@/lib/studio/studio-upload-service';
import { OpenMultilangModal } from '@/components/studio/open-multilang-modal';
import { LANGUAGE_CONFIG } from '@/components/studio/language-checkout/language-checkbox-card';
import { useLanguagePurchaseStore } from '@/lib/stores/language-purchase-store';
import { listLanguagePurchases } from '@/lib/api/language-purchase';
import { Collapsible } from '@/components/ui/collapsible';
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
import type { StudioSession } from '@/types/studio';

const SERVICE_NAME = 'GeneralPage';

const TOUR_THEMES_OPTIONS = [
  { value: 'histoire', label: 'Histoire' },
  { value: 'gastronomie', label: 'Gastronomie' },
  { value: 'art', label: 'Art' },
  { value: 'nature', label: 'Nature' },
  { value: 'architecture', label: 'Architecture' },
  { value: 'culture', label: 'Culture' },
  { value: 'insolite', label: 'Insolite' },
  { value: 'romantique', label: 'Romantique' },
  { value: 'famille', label: 'Famille' },
  { value: 'sportif', label: 'Sportif' },
] as const;

const DIFFICULTY_OPTIONS = [
  { value: 'facile', label: 'Facile — accessible à tous' },
  { value: 'moyen', label: 'Moyen — quelques montées' },
  { value: 'difficile', label: 'Difficile — terrain accidenté' },
];

const AVAILABLE_LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'Anglais' },
  { value: 'es', label: 'Espagnol' },
  { value: 'de', label: 'Allemand' },
  { value: 'it', label: 'Italien' },
];

export default function GeneralPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;

  const [session, setSession] = useState<StudioSession | null>(null);
  const [scenesCount, setScenesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('fr');
  const [difficulty, setDifficulty] = useState('facile');
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);

  // Cover photo state
  const [coverPhotoKey, setCoverPhotoKey] = useState<string | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Multilang
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['fr']);
  const [isMultilangModalOpen, setIsMultilangModalOpen] = useState(false);

  const allPurchases = useLanguagePurchaseStore((s) => s.purchases);
  const setPurchases = useLanguagePurchaseStore((s) => s.setPurchases);
  const purchasedLanguages = useMemo(() => {
    const prefix = `${sessionId}_`;
    return Object.entries(allPurchases)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .filter((p) => p.status === 'active');
  }, [allPurchases, sessionId]);

  useEffect(() => {
    if (!session) return;
    const prefix = `${sessionId}_`;
    const hasStoreData = Object.keys(allPurchases).some((k) => k.startsWith(prefix));
    if (hasStoreData) return;

    listLanguagePurchases(sessionId).then((result) => {
      if (result.ok && result.value.length > 0) {
        setPurchases(result.value);
      }
    });
  }, [session, sessionId, allPurchases, setPurchases]);

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
        if (sess) {
          setActiveSession(sess);
          setTitle(sess.title || '');
          setLanguage(sess.language || 'fr');
          setCoverPhotoKey(sess.coverPhotoKey);
          setSelectedLanguages(
            sess.availableLanguages.length > 0
              ? sess.availableLanguages
              : [sess.language || 'fr'],
          );

          if (sess.tourId) {
            try {
              const { getGuideTourById } = await import('@/lib/api/appsync-client');
              const tourResult = await getGuideTourById(sess.tourId);
              if (tourResult) {
                const tour = tourResult as unknown as Record<string, unknown>;
                setCity((tour.city as string) || '');
                setDescription((tour.description as string) || '');
                setDuration((tour.duration as number) || 0);
                setDistance((tour.distance as number) || 0);
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
              if (meta.difficulty) setDifficulty(meta.difficulty);
              if (meta.themes) setSelectedThemes(meta.themes);
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

  const handleSave = useCallback(async () => {
    if (!session) return;
    try {
      const appsync = await import('@/lib/api/appsync-client');
      await appsync.updateStudioSessionMutation(sessionId, {
        title,
        language,
        coverPhotoKey,
        availableLanguages: selectedLanguages,
      });
      if (session.tourId) {
        await appsync.updateGuideTourMutation(session.tourId, {
          title,
          city,
          description,
          duration,
          distance,
          poiCount: scenesCount,
        });
      }
      localStorage.setItem(
        `tour-meta-${session.tourId ?? sessionId}`,
        JSON.stringify({ difficulty, themes: selectedThemes }),
      );
      logger.info(SERVICE_NAME, 'Saved general info', { sessionId });
    } catch (e) {
      logger.error(SERVICE_NAME, 'Save failed', { error: String(e) });
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
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
    selectedLanguages,
    selectedThemes,
    scenesCount,
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
          ← Retour
        </Link>
        <div
          className="bg-grenadine-soft border border-grenadine rounded-md p-4 text-danger"
          role="alert"
        >
          {error || 'Session introuvable.'}
        </div>
      </div>
    );
  }

  const isLocked = ['submitted', 'published', 'revision_requested'].includes(session.status);

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      {isLocked && (
        <div
          className="mb-4 rounded-md border border-ocre bg-ocre-soft px-4 py-2.5 text-meta text-ocre"
          role="status"
          data-testid="readonly-banner"
        >
          Visite soumise — les informations sont en lecture seule. Vous pouvez ajouter des langues.
        </div>
      )}

      {/* ───── Photo de couverture ───── */}
      <WizField label="Photo de couverture">
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
                Aucune photo
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
              {isUploadingCover ? 'Envoi…' : coverPhotoKey ? 'Changer' : 'Ajouter'}
            </button>
            {coverPhotoKey && !isLocked && (
              <button
                type="button"
                onClick={handleRemoveCover}
                data-testid="remove-cover-btn"
                className="text-meta text-danger font-semibold underline underline-offset-2 hover:opacity-80 transition text-left"
              >
                Supprimer
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
        <WizField label="Titre du tour" required htmlFor="tour-title">
          <WizInput
            id="tour-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            disabled={isLocked}
            data-testid="title-input"
            placeholder="Ex : Vence — Chapelle Matisse et Cité Épiscopale"
          />
        </WizField>
        <WizField
          label="Ville"
          required
          htmlFor="tour-city"
          helper="Couleur attribuée automatiquement selon la ville."
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
        label="Description longue"
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
          placeholder="Décrivez votre tour tel qu'il apparaîtra dans le catalogue…"
        />
      </WizField>

      {/* ───── Langue / Difficulté / Durée / Distance ───── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <WizField label="Langue" htmlFor="tour-language">
          <WizSelect
            id="tour-language"
            options={AVAILABLE_LANGUAGES}
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isLocked}
            data-testid="language-select"
          />
        </WizField>
        <WizField label="Difficulté" htmlFor="tour-difficulty">
          <WizSelect
            id="tour-difficulty"
            options={DIFFICULTY_OPTIONS}
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            disabled={isLocked}
            data-testid="difficulty-select"
          />
        </WizField>
        <WizField label="Durée (min)" htmlFor="tour-duration">
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
        <WizField label="Distance (km)" htmlFor="tour-distance">
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

      {/* ───── Thèmes ───── */}
      <WizField
        label="Thèmes"
        helper="Maximum 3 thèmes. Ils servent à la recherche dans le catalogue."
      >
        <ThemeChips
          options={TOUR_THEMES_OPTIONS}
          value={selectedThemes}
          onChange={setSelectedThemes}
          max={3}
        />
      </WizField>

      {/* ───── Multilang (visible quand soumis/publié) ───── */}
      {(session.status === 'submitted' ||
        session.status === 'published' ||
        session.status === 'revision_requested') && (
        <div className="mb-5">
          <Collapsible
            storageKey={`general-multilang-${sessionId}`}
            defaultOpen={purchasedLanguages.length > 0}
            icon={<span aria-hidden="true">✦</span>}
            title="Langues additionnelles"
            subtitle={
              purchasedLanguages.length > 0
                ? `${purchasedLanguages.length} langue${purchasedLanguages.length > 1 ? 's' : ''} ajoutée${purchasedLanguages.length > 1 ? 's' : ''}`
                : 'Aucune'
            }
            compact
            testId="multilang-section"
          >
            <button
              type="button"
              onClick={() => setIsMultilangModalOpen(true)}
              className="w-full rounded-md border-2 border-dashed border-grenadine bg-grenadine-soft px-3 py-3 text-center hover:opacity-90 transition mb-2"
              data-testid="open-multilang-btn"
            >
              <span className="block text-caption font-bold text-grenadine">
                Ouvrir le multilangue
              </span>
              <span className="block text-meta text-grenadine mt-0.5">
                Traduisez vous-même ou utilisez la traduction automatique.
              </span>
            </button>

            {purchasedLanguages.length > 0 && (
              <ul className="space-y-1" data-testid="purchased-languages-list">
                {purchasedLanguages.map((p) => {
                  const langConfig = LANGUAGE_CONFIG.find((l) => l.code === p.language);
                  return (
                    <li
                      key={p.language}
                      className="flex items-center gap-2 text-caption text-ink-80"
                      data-testid={`purchased-lang-${p.language}`}
                    >
                      <span className="text-meta font-bold tracking-wider text-ink-60">
                        {p.language.toUpperCase()}
                      </span>
                      <span>{langConfig?.label ?? p.language}</span>
                      <span className="text-meta text-ink-40 ml-auto capitalize">
                        {p.purchaseType === 'manual'
                          ? 'Manuel'
                          : p.qualityTier === 'pro'
                            ? 'Pro'
                            : 'Standard'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            <OpenMultilangModal
              sessionId={sessionId}
              baseLanguage={language}
              isOpen={isMultilangModalOpen}
              onClose={() => setIsMultilangModalOpen(false)}
              onBatchTranslationNeeded={(languages, qualityTier) => {
                logger.info(SERVICE_NAME, 'Batch will auto-run on Scenes tab', {
                  languages,
                  qualityTier,
                });
              }}
            />
          </Collapsible>
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
        {!isLocked && (
          <button
            type="button"
            onClick={handleSave}
            data-testid="save-general-btn"
            className="bg-ink text-paper border-none px-5 py-2.5 rounded-pill text-caption font-bold cursor-pointer hover:opacity-90 transition"
          >
            Enregistrer
          </button>
        )}
        {isSaved && (
          <span className="text-caption text-success font-semibold" role="status">
            ✓ Enregistré
          </span>
        )}
      </div>

      {/* ───── Step nav ───── */}
      <StepNav
        prevHref={`/guide/studio/${sessionId}`}
        prevLabel="Accueil"
        nextHref={`/guide/studio/${sessionId}/itinerary`}
        nextLabel="Itinéraire"
      />
    </div>
  );
}
