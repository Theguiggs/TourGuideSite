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
import { useStudioLocale } from '@/lib/i18n/studio-locale';

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
      label: locale === 'en' ? ({ histoire: 'History', gastronomie: 'Food', art: 'Art', nature: 'Nature', architecture: 'Architecture', culture: 'Culture', insolite: 'Unusual', romantique: 'Romantic', famille: 'Family', sportif: 'Sports' } as Record<string, string>)[option.value] : option.label,
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('fr');
  const [difficulty, setDifficulty] = useState('facile');
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [duration, setDuration] = useState(0);
  const [distance, setDistance] = useState(0);
  // mon-1.2 (parité web) — monétisation
  const [purchaseType, setPurchaseType] = useState<'free' | 'paid' | 'subscription_only'>('free');
  const [priceEuros, setPriceEuros] = useState('');
  const [priceError, setPriceError] = useState<string | null>(null);

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

  const isLocked = session
    ? ['submitted', 'published', 'revision_requested'].includes(session.status)
    : false;
  const canEditMonetization = !isLocked || session?.status === 'published';

  const handleSave = useCallback(async () => {
    if (!session) return;

    // mon-1.2 (parité web) — validate price for a paid tour before saving.
    let priceCents: number | null = null;
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
          coverPhotoKey,
          availableLanguages: selectedLanguages,
        });
        if (!sessionResult.ok) throw new Error(sessionResult.error);
      }
      if (!session.tourId) throw new Error('No tour associated with this session.');
      const tourResult = await appsync.updateGuideTourMutation(
        session.tourId,
        isLocked ? { purchaseType, priceCents } : {
          title,
          city,
          description,
          duration,
          distance,
          poiCount: scenesCount,
          // mon-1.2 (parité web) → consommé par mon-1.3b (createTourPaymentIntent lit GuideTour).
          purchaseType,
          priceCents,
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
      setSaveError(t(
        "L'enregistrement a échoué. Vos modifications n'ont pas été sauvegardées.",
        'Save failed. Your changes were not saved.',
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
    selectedLanguages,
    selectedThemes,
    scenesCount,
    purchaseType,
    priceEuros,
    isLocked,
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
              : 'Visite soumise — les informations sont en lecture seule. Vous pouvez ajouter des langues.',
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

      {/* ───── Multilang (visible quand soumis/publié) ───── */}
      {(session.status === 'submitted' ||
        session.status === 'published' ||
        session.status === 'revision_requested') && (
        <div className="mb-5">
          <Collapsible
            storageKey={`general-multilang-${sessionId}`}
            defaultOpen={purchasedLanguages.length > 0}
            icon={<span aria-hidden="true">✦</span>}
            title={t('Langues additionnelles', 'Additional languages')}
            subtitle={
              purchasedLanguages.length > 0
                ? `${purchasedLanguages.length} langue${purchasedLanguages.length > 1 ? 's' : ''} ajoutée${purchasedLanguages.length > 1 ? 's' : ''}`
                : t('Aucune', 'None')
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
                {t('Ouvrir le multilangue', 'Open multilingual tools')}
              </span>
              <span className="block text-meta text-grenadine mt-0.5">
                {t('Traduisez vous-même ou utilisez la traduction automatique.', 'Translate it yourself or use automatic translation.')}
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
        {canEditMonetization && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            data-testid="save-general-btn"
            className="bg-ink text-paper border-none px-5 py-2.5 rounded-pill text-caption font-bold cursor-pointer hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving
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
      />
    </div>
  );
}
