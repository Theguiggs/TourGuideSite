'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { logger } from '@/lib/logger';
import { getStudioSession, listStudioScenes } from '@/lib/api/studio';
import { shouldUseStubs } from '@/config/api-mode';
import { useStudioSessionStore, selectSetActiveSession, selectClearSession } from '@/lib/stores/studio-session-store';
import { S3Image } from '@/components/studio/s3-image';
import * as studioUploadService from '@/lib/studio/studio-upload-service';
import type { StudioSession } from '@/types/studio';
import { OpenMultilangModal } from '@/components/studio/open-multilang-modal';
import { LANGUAGE_CONFIG } from '@/components/studio/language-checkout/language-checkbox-card';
import { useLanguagePurchaseStore } from '@/lib/stores/language-purchase-store';
import { listLanguagePurchases } from '@/lib/api/language-purchase';
import { getSessionStatusConfig } from '@/lib/api/studio';

const SERVICE_NAME = 'GeneralPage';

const TOUR_THEMES = [
  'histoire', 'gastronomie', 'art', 'nature',
  'architecture', 'culture', 'insolite', 'romantique',
  'famille', 'sportif',
] as const;

const DIFFICULTY_OPTIONS = [
  { value: 'facile', label: 'Facile — accessible à tous' },
  { value: 'moyen', label: 'Moyen — quelques montées' },
  { value: 'difficile', label: 'Difficile — terrain accidenté' },
];

const AVAILABLE_LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
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

  // Multilang state
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(['fr']);
  const [isMultilangModalOpen, setIsMultilangModalOpen] = useState(false);

  // Purchased languages from store
  const allPurchases = useLanguagePurchaseStore((s) => s.purchases);
  const setPurchases = useLanguagePurchaseStore((s) => s.setPurchases);
  const purchasedLanguages = useMemo(() => {
    const prefix = `${sessionId}_`;
    return Object.entries(allPurchases)
      .filter(([key]) => key.startsWith(prefix))
      .map(([, value]) => value)
      .filter((p) => p.status === 'active');
  }, [allPurchases, sessionId]);

  // Hydrate language purchases from AppSync on mount (survives page refresh)
  useEffect(() => {
    if (!session) return;
    const prefix = `${sessionId}_`;
    const hasStoreData = Object.keys(allPurchases).some((k) => k.startsWith(prefix));
    if (hasStoreData) return;

    listLanguagePurchases(sessionId).then((result) => {
      if (result.ok && result.value.length > 0) {
        setPurchases(result.value);
        logger.info(SERVICE_NAME, 'Hydrated language purchases from AppSync', { count: result.value.length });
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
          setSelectedLanguages(sess.availableLanguages.length > 0 ? sess.availableLanguages : [sess.language || 'fr']);

          // Load tour data (city, description, duration, distance) from GuideTour if available
          if (sess.tourId) {
            try {
              const { getGuideTourById } = await import('@/lib/api/appsync-client');
              const tourResult = await getGuideTourById(sess.tourId);
              if (tourResult) {
                const tour = tourResult as Record<string, unknown>;
                setCity((tour.city as string) || '');
                setDescription((tour.description as string) || '');
                setDuration((tour.duration as number) || 0);
                setDistance((tour.distance as number) || 0);
              }
            } catch (e) {
              logger.warn(SERVICE_NAME, 'Failed to load tour data', { tourId: sess.tourId, error: String(e) });
              // Fallback defaults
              setCity('');
              setDescription('');
              setDuration(0);
              setDistance(0);
            }
          } else {
            setCity('');
            setDescription('');
            setDuration(0);
            setDistance(0);
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
    return () => { cancelled = true; clearSession(); };
  }, [sessionId, setActiveSession, clearSession]);

  const toggleTheme = useCallback((theme: string) => {
    setSelectedThemes((prev) =>
      prev.includes(theme) ? prev.filter((t) => t !== theme) : [...prev, theme],
    );
  }, []);

  const handleCoverUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
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
      // Stub: use local object URL
      const url = URL.createObjectURL(file);
      setCoverPreviewUrl(url);
      setCoverPhotoKey(`cover-stub-${Date.now()}`);
      setIsUploadingCover(false);
      logger.info(SERVICE_NAME, 'Cover photo set (stub)', { sessionId });
      return;
    }

    try {
      const result = await studioUploadService.uploadCoverPhoto(file, sessionId);
      if (result.ok) {
        setCoverPhotoKey(result.s3Key);
        setCoverPreviewUrl(null); // will use S3Image
        logger.info(SERVICE_NAME, 'Cover photo uploaded', { sessionId, s3Key: result.s3Key });
      } else {
        setCoverError(result.error);
      }
    } catch (err) {
      setCoverError('Erreur inattendue.');
      logger.error(SERVICE_NAME, 'Cover upload failed', { error: String(err) });
    } finally {
      setIsUploadingCover(false);
    }

    // Reset input so same file can be re-selected
    if (coverInputRef.current) coverInputRef.current.value = '';
  }, [sessionId]);

  const handleRemoveCover = useCallback(() => {
    setCoverPhotoKey(null);
    setCoverPreviewUrl(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  }, []);

  const handleSave = useCallback(async () => {
    if (!session) return;
    try {
      const appsync = await import('@/lib/api/appsync-client');
      // Persist session fields (title, language, cover, languages)
      await appsync.updateStudioSessionMutation(sessionId, {
        title,
        language,
        coverPhotoKey,
        availableLanguages: selectedLanguages,
      });
      // Persist tour fields (city, description, themes, etc.) if tour exists
      if (session.tourId) {
        await appsync.updateGuideTourMutation(session.tourId, {
          title,
          city,
          description,
          duration,
          distance,
        });
      }
      logger.info(SERVICE_NAME, 'Saved general info', { sessionId, title, city, description: description.substring(0, 50) });
    } catch (e) {
      logger.error(SERVICE_NAME, 'Save failed', { error: String(e) });
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  }, [sessionId, session, title, city, description, language, difficulty, duration, distance, coverPhotoKey, selectedLanguages]);

  if (isLoading) {
    return <div className="p-6" aria-busy="true"><div className="bg-gray-100 rounded-lg h-96 animate-pulse" /></div>;
  }

  if (error || !session) {
    return (
      <div className="p-6">
        <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">&larr; Retour</Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700" role="alert">{error || 'Session introuvable.'}</div>
      </div>
    );
  }

  const isLocked = ['submitted', 'published', 'revision_requested'].includes(session.status);

  return (
    <div className="p-6 max-w-2xl">
      <Link href={`/guide/studio/${sessionId}`} className="text-teal-600 hover:text-teal-700 text-sm mb-4 inline-block">
        &larr; Retour au tour
      </Link>

      {/* Status badge */}
      {(() => {
        const statusConfig = getSessionStatusConfig(session.status);
        return (
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold mb-4 ${statusConfig.color}`}
            data-testid="session-status-badge"
          >
            {statusConfig.label}
          </span>
        );
      })()}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Informations g&eacute;n&eacute;rales</h1>

      {isLocked && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status" data-testid="readonly-banner">
          Visite soumise &mdash; les informations sont en lecture seule. Vous pouvez ajouter des langues.
        </div>
      )}

      <div className="space-y-6">
        {/* Cover Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photo de couverture</label>
          <div className="flex items-start gap-4">
            <div className="w-48 h-32 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50 flex-shrink-0">
              {coverPreviewUrl ? (
                <img src={coverPreviewUrl} alt="Couverture" className="w-full h-full object-cover" />
              ) : coverPhotoKey ? (
                <S3Image s3Key={coverPhotoKey} alt="Couverture" className="w-full h-full object-cover" fallback="Photo de couverture" />
              ) : (
                <span className="text-gray-400 text-sm text-center px-2">Aucune photo</span>
              )}
            </div>
            {!isLocked && (
              <div className="flex flex-col gap-2">
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverUpload}
                  className="hidden"
                  data-testid="cover-photo-input"
                />
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                  data-testid="cover-photo-btn"
                >
                  {isUploadingCover ? 'Envoi...' : coverPhotoKey ? 'Changer la photo' : 'Ajouter une photo'}
                </button>
                {coverPhotoKey && (
                  <button
                    onClick={handleRemoveCover}
                    className="text-red-500 hover:text-red-700 text-xs"
                    data-testid="remove-cover-btn"
                  >
                    Supprimer
                  </button>
                )}
                {coverError && <p className="text-xs text-red-600">{coverError}</p>}
                <p className="text-xs text-gray-400">JPEG, PNG ou WebP. Max 5 MB.</p>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div>
          <label htmlFor="tour-title" className="block text-sm font-medium text-gray-700 mb-1">Titre du tour *</label>
          <input id="tour-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: L'Âme des Parfumeurs de Grasse" maxLength={100} disabled={isLocked}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500" data-testid="title-input" />
          <p className="text-xs text-gray-400 mt-1">{title.length}/100</p>
        </div>

        {/* City */}
        <div>
          <label htmlFor="tour-city" className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
          <input id="tour-city" type="text" value={city} onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Grasse" maxLength={50} disabled={isLocked}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500" data-testid="city-input" />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="tour-description" className="block text-sm font-medium text-gray-700 mb-1">Description longue</label>
          <textarea id="tour-description" value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre tour tel qu'il apparaîtra dans le catalogue..."
            rows={4} maxLength={2000} disabled={isLocked}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 resize-y disabled:bg-gray-100 disabled:text-gray-500" data-testid="description-input" />
          <p className="text-xs text-gray-400 mt-1">{description.length}/2000</p>
        </div>

        {/* Primary Language + Difficulty row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tour-language" className="block text-sm font-medium text-gray-700 mb-1">Langue principale</label>
            <select id="tour-language" value={language} onChange={(e) => setLanguage(e.target.value)} disabled={isLocked}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500" data-testid="language-select">
              {AVAILABLE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tour-difficulty" className="block text-sm font-medium text-gray-700 mb-1">Difficulté</label>
            <select id="tour-difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value)} disabled={isLocked}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500" data-testid="difficulty-select">
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Multilang — Open button + purchased languages list */}
        {(session?.status === 'submitted' || session?.status === 'published' || session?.status === 'revision_requested') && (
          <div className="space-y-4" data-testid="multilang-section">
            <button
              type="button"
              onClick={() => setIsMultilangModalOpen(true)}
              className="w-full rounded-lg border-2 border-dashed border-teal-300 bg-teal-50 px-4 py-5 text-center hover:bg-teal-100 transition-colors"
              data-testid="open-multilang-btn"
            >
              <span className="block text-sm font-semibold text-teal-700">
                Ouvrir le multilangue
              </span>
              <span className="block text-xs text-teal-600 mt-1">
                Proposez votre visite dans d&apos;autres langues. Vous pouvez traduire vous-m&ecirc;me ou utiliser la traduction automatique.
              </span>
            </button>

            {/* Already purchased languages */}
            {purchasedLanguages.length > 0 && (
              <div data-testid="purchased-languages-list">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Langues ajout&eacute;es</h4>
                <ul className="space-y-1">
                  {purchasedLanguages.map((p) => {
                    const langConfig = LANGUAGE_CONFIG.find((l) => l.code === p.language);
                    return (
                      <li
                        key={p.language}
                        className="flex items-center gap-2 text-sm text-gray-700"
                        data-testid={`purchased-lang-${p.language}`}
                      >
                        <img
                          src={`https://flagcdn.com/w40/${langConfig?.countryCode ?? p.language}.png`}
                          width="16"
                          height="12"
                          alt=""
                          aria-hidden="true"
                        />
                        <span>{langConfig?.label ?? p.language}</span>
                        <span className="text-xs text-gray-400 ml-auto capitalize">
                          {p.purchaseType === 'manual' ? 'Manuel' : p.qualityTier === 'pro' ? 'Pro' : 'Standard'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <OpenMultilangModal
              sessionId={sessionId}
              baseLanguage={language}
              isOpen={isMultilangModalOpen}
              onClose={() => setIsMultilangModalOpen(false)}
              onBatchTranslationNeeded={(languages, qualityTier) => {
                // Don't run batch from General — the guide should go to Scenes to see progress
                // The batch will auto-trigger when the guide opens the language tab in Scenes
                logger.info(SERVICE_NAME, 'Batch will auto-run when guide opens language tab in Scenes', { languages, qualityTier });
              }}
            />
          </div>
        )}

        {/* Duration + Distance row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="tour-duration" className="block text-sm font-medium text-gray-700 mb-1">Durée (minutes)</label>
            <input id="tour-duration" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))}
              min={0} max={300} disabled={isLocked}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500" data-testid="duration-input" />
          </div>
          <div>
            <label htmlFor="tour-distance" className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
            <input id="tour-distance" type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))}
              min={0} max={50} step={0.1} disabled={isLocked}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-500" data-testid="distance-input" />
          </div>
        </div>

        {/* Themes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Thèmes</label>
          <div className="flex flex-wrap gap-2">
            {TOUR_THEMES.map((theme) => {
              const isSelected = selectedThemes.includes(theme);
              return (
                <button key={theme} onClick={() => toggleTheme(theme)} disabled={isLocked}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`} data-testid={`theme-${theme}`}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Session info */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Session terrain</h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-gray-500">Scènes</dt>
            <dd className="text-gray-900">{scenesCount}</dd>
            <dt className="text-gray-500">Statut</dt>
            <dd className="text-gray-900 capitalize">{session.status}</dd>
            <dt className="text-gray-500">Créée le</dt>
            <dd className="text-gray-900">{new Date(session.createdAt).toLocaleDateString('fr-FR')}</dd>
          </dl>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          {!isLocked && (
            <button onClick={handleSave}
              className="bg-teal-600 hover:bg-teal-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors"
              data-testid="save-general-btn">
              Enregistrer
            </button>
          )}
          <Link href={`/guide/studio/${sessionId}/itinerary`}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 px-6 rounded-lg transition-colors">
            Étape suivante : Itinéraire →
          </Link>
          {isSaved && <span className="text-sm text-green-600" role="status">✓ Enregistré</span>}
        </div>
      </div>
    </div>
  );
}
