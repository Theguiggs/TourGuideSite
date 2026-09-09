'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { S3Image } from '@/components/studio/s3-image';

const PreviewMap = dynamic(() => import('@/components/studio/preview-map').then((m) => ({ default: m.PreviewMap })), {
  ssr: false,
  loading: () => <div className="bg-paper-deep rounded-lg h-48 animate-pulse" />,
});

const TourMap = dynamic(() => import('@/components/map/TourMap'), {
  ssr: false,
  loading: () => <div className="bg-paper-deep rounded-lg h-64 animate-pulse" />,
});
import {
  getModerationDetail,
  approveTour,
  rejectTour,
  sendBackForRevision,
  addReviewComment,
  getQueueItemIds,
} from '@/lib/api/moderation';
import { listLanguagePurchases } from '@/lib/api/language-purchase';
import { listSegmentsByScene, getStudioSession } from '@/lib/api/studio';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';
import { audioPlayerService } from '@/lib/studio/audio-player-service';
import { AudioPlayerBar } from '@/components/studio/audio-player';
import { TourCommentThread } from '@/components/studio/tour-comment-thread';
import { addTourComment } from '@/lib/api/tour-comments';
import { shouldUseStubs } from '@/config/api-mode';
import type { TourLanguagePurchase, SceneSegment } from '@/types/studio';
import { trackEvent, AdminAnalyticsEvents } from '@/lib/analytics';
import { sendGuideNotification } from '@/lib/api/guide-notifications';
import { logger } from '@/lib/logger';
import {
  buildAdminValidationReport,
  canApproveAdminReview,
  getModerationScenePresentation,
  hasValidCoordinates,
} from '@/lib/moderation/admin-validation';
import {
  getQualityChecklistTemplate,
  REJECTION_CATEGORIES,
} from '@/types/moderation';
import type {
  ModerationDetail,
  ModerationAdminComment,
  QualityChecklistItem,
  RejectionCategory,
} from '@/types/moderation';

const LANG_FLAGS: Record<string, string> = {
  fr: 'FR', en: 'EN', es: 'ES', it: 'IT', de: 'DE',
};

const SERVICE_NAME = 'ModerationReviewPage';

function PhotoGallery({ scenes }: { scenes: Array<{ id: string; title: string; photosRefs: string[]; order: number }> }) {
  const [lightbox, setLightbox] = useState<{ s3Key: string; title: string } | null>(null);
  const allPhotos = scenes.flatMap((s) =>
    s.photosRefs.map((ref, i) => ({ s3Key: ref, title: `${s.title} — Photo ${i + 1}`, sceneOrder: s.order })),
  );
  if (allPhotos.length === 0) return null;

  return (
    <>
      <div className="bg-card rounded-md border border-line p-4">
        <h3 className="text-sm font-semibold text-ink mb-3">Photos ({allPhotos.length})</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {allPhotos.map((photo, i) => (
            <button
              key={`${photo.s3Key}-${i}`}
              type="button"
              onClick={() => setLightbox(photo)}
              className="relative group aspect-square rounded-lg overflow-hidden border border-line hover:border-grenadine transition-colors cursor-zoom-in"
            >
              <S3Image s3Key={photo.s3Key} alt={photo.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-white text-lg transition-opacity">🔍</span>
              </div>
              <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[9px] px-1 rounded">
                {photo.sceneOrder}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox overlay */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setLightbox(null)}
          data-testid="photo-lightbox"
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 text-white text-3xl hover:text-ink-20 z-10"
            aria-label="Fermer"
          >
            ✕
          </button>
          <p className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded">
            {lightbox.title}
          </p>
          <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <S3Image
              s3Key={lightbox.s3Key}
              alt={lightbox.title}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
          {/* Navigation arrows */}
          {allPhotos.length > 1 && (() => {
            const idx = allPhotos.findIndex((p) => p.s3Key === lightbox.s3Key);
            return (
              <>
                {idx > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightbox(allPhotos[idx - 1]); }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-ink-20 bg-black/40 rounded-full w-12 h-12 flex items-center justify-center"
                    aria-label="Précédente"
                  >
                    ‹
                  </button>
                )}
                {idx < allPhotos.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightbox(allPhotos[idx + 1]); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-ink-20 bg-black/40 rounded-full w-12 h-12 flex items-center justify-center"
                    aria-label="Suivante"
                  >
                    ›
                  </button>
                )}
                <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded">
                  {idx + 1} / {allPhotos.length}
                </p>
              </>
            );
          })()}
        </div>
      )}
    </>
  );
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function parseTranslationMap(value: unknown): Record<string, string> {
  let parsed = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return {};
    }
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return Object.fromEntries(
    Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
}

export default function ModerationReviewPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const moderationId = params.moderationId as string;
  const initialTab = searchParams.get('tab') as 'overview' | 'scenes' | 'pois' | 'tourist' | null;
  const initialLang = searchParams.get('lang');

  const [detail, setDetail] = useState<ModerationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState<QualityChecklistItem[]>([]);
  const [overallNotes, setOverallNotes] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [rejectCategory, setRejectCategory] = useState<RejectionCategory>('audio_quality');
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [rejectPoiIds, setRejectPoiIds] = useState<string[]>([]);
  const [revisionFeedback, setRevisionFeedback] = useState('');
  const [commentText, setCommentText] = useState('');
  const [commentSceneId, setCommentSceneId] = useState<string>('');
  const [localComments, setLocalComments] = useState<ModerationAdminComment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [reviewStartTime] = useState(() => Date.now());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [playingSceneId, setPlayingSceneId] = useState<string | null>(null);
  const [activeContentTab, setActiveContentTab] = useState<'overview' | 'scenes' | 'pois' | 'tourist'>(
    initialTab === 'tourist' || initialTab === 'overview' || initialTab === 'scenes' || initialTab === 'pois'
      ? initialTab
      : initialLang ? 'tourist' : 'overview',
  );
  // Language purchases and translated segments for preview
  const [, setLanguagePurchases] = useState<TourLanguagePurchase[]>([]);
  const [segmentsByScene, setSegmentsByScene] = useState<Record<string, SceneSegment[]>>({});
  // Fixed to the language from ?lang= param — no toggle, one language at a time
  const activePreviewLang = initialLang || detail?.languePrincipale || 'fr';
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [translatedDescriptions, setTranslatedDescriptions] = useState<Record<string, string>>({});
  const [translatedTitles, setTranslatedTitles] = useState<Record<string, string>>({});
  const [guideRoutePath, setGuideRoutePath] = useState<Array<{ lat: number; lng: number }> | null>(null);
  // mon-1.2/1.3b : monétisation de la visite (lue sur GuideTour) pour la revue admin.
  const [routeLoaded, setRouteLoaded] = useState(false);
  const [segmentsLoaded, setSegmentsLoaded] = useState(false);
  const [metadataLoaded, setMetadataLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
    setRouteLoaded(false);
    setSegmentsLoaded(false);
    setMetadataLoaded(false);
    setGuideRoutePath(null);
    setSegmentsByScene({});
    setTranslatedTitles({});
    setTranslatedDescriptions({});

    const loadReview = async () => {
      try {
        const [d, ids] = await Promise.all([
          getModerationDetail(moderationId),
          getQueueItemIds(),
        ]);
        if (cancelled) return;

        setDetail(d);
        setQueueIds(ids);
        setLocalComments(d?.adminComments ?? []);
        const reviewLanguage = initialLang || d?.languePrincipale || 'fr';
        setChecklist(
          getQualityChecklistTemplate(
            d !== null && reviewLanguage !== d.languePrincipale,
          ).map((item) => ({ ...item, checked: false, note: '' })),
        );

        if (!d) {
          setRouteLoaded(true);
          setSegmentsLoaded(true);
          setMetadataLoaded(true);
          return;
        }

        setLoadingSegments(d.scenes.length > 0 && reviewLanguage !== d.languePrincipale);
        const sessionPromise = d.sessionId
          ? getStudioSession(d.sessionId).catch((error: unknown) => {
              logger.error(SERVICE_NAME, 'Chargement de la session impossible', { error: String(error) });
              return null;
            })
          : Promise.resolve(null);
        const tourPromise = import('@/lib/api/appsync-client')
          .then(({ getGuideTourById }) => getGuideTourById(d.tourId))
          .catch((error: unknown) => {
            logger.error(SERVICE_NAME, 'Chargement des métadonnées traduites impossible', { error: String(error) });
            return null;
          });
        const segmentsPromise = d.sessionId && d.scenes.length > 0
          ? Promise.all(d.scenes.map(async (scene) => {
              try {
                return { sceneId: scene.id, segments: await listSegmentsByScene(scene.id) };
              } catch (error) {
                logger.error(SERVICE_NAME, 'Chargement des segments impossible', {
                  sceneId: scene.id,
                  error: String(error),
                });
                return { sceneId: scene.id, segments: [] as SceneSegment[] };
              }
            }))
          : Promise.resolve([]);
        const purchasesPromise = d.sessionId
          ? listLanguagePurchases(d.sessionId).catch((error: unknown) => {
              logger.warn(SERVICE_NAME, 'Chargement des achats de langue impossible', { error: String(error) });
              return null;
            })
          : Promise.resolve(null);

        const [session, tour, segmentResults, purchases] = await Promise.all([
          sessionPromise,
          tourPromise,
          segmentsPromise,
          purchasesPromise,
        ]);
        if (cancelled) return;

        const tourData = tour as Record<string, unknown> | null;
        setGuideRoutePath(
          session?.routePath?.computedPath && session.routePath.computedPath.length > 1
            ? session.routePath.computedPath
            : null,
        );
        setTranslatedDescriptions({
          ...parseTranslationMap(tourData?.translatedDescriptions),
          ...parseTranslationMap(session?.translatedDescriptions),
        });
        setTranslatedTitles({
          ...parseTranslationMap(tourData?.translatedTitles),
          ...parseTranslationMap(session?.translatedTitles),
        });
        setSegmentsByScene(Object.fromEntries(
          segmentResults.map((result) => [result.sceneId, result.segments]),
        ));
        if (purchases?.ok) setLanguagePurchases(purchases.value);
        setRouteLoaded(true);
        setSegmentsLoaded(true);
        setMetadataLoaded(true);
        setLoadingSegments(false);
      } catch (error) {
        if (!cancelled) {
          logger.error(SERVICE_NAME, 'Chargement de la revue impossible', { error: String(error) });
          setDetail(null);
          setErrorMessage('Impossible de charger les données de modération. Réessayez.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadReview();
    trackEvent(AdminAnalyticsEvents.ADMIN_MODERATION_REVIEW_START, { moderation_id: moderationId });
    return () => {
      cancelled = true;
    };
  }, [initialLang, moderationId]);

  useEffect(() => {
    const interval = setInterval(() => setElapsedMinutes(Math.round((Date.now() - reviewStartTime) / 60000)), 60000);
    return () => clearInterval(interval);
  }, [reviewStartTime]);

  const allChecked = checklist.length > 0 && checklist.every((item) => item.checked);
  const isTranslation = detail !== null && activePreviewLang !== detail.languePrincipale;
  const validationReport = useMemo(
    () => detail
      ? buildAdminValidationReport({
          detail,
          language: activePreviewLang,
          segmentsByScene,
          routePath: guideRoutePath,
          dependentDataLoaded: routeLoaded && metadataLoaded && (!isTranslation || segmentsLoaded),
          translatedTourTitle: translatedTitles[activePreviewLang] ?? null,
          translatedTourDescription: translatedDescriptions[activePreviewLang] ?? null,
        })
      : null,
    [activePreviewLang, detail, guideRoutePath, isTranslation, metadataLoaded, routeLoaded, segmentsByScene, segmentsLoaded, translatedDescriptions, translatedTitles],
  );
  const canApprove = canApproveAdminReview(validationReport, checklist);
  const currentIndex = queueIds.indexOf(moderationId);
  const prevId = currentIndex > 0 ? queueIds[currentIndex - 1] : null;
  const nextId = currentIndex < queueIds.length - 1 ? queueIds[currentIndex + 1] : null;

  const toggleChecklistItem = useCallback((id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item,
      ),
    );
  }, []);

  const updateChecklistNote = useCallback((id: string, note: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, note } : item,
      ),
    );
  }, []);

  const handleApprove = async () => {
    if (!canApprove || !detail) return;
    setSubmitting(true);
    setErrorMessage(null);

    // If examining a specific language, approve the language purchase
    if (activePreviewLang !== detail.languePrincipale) {
      const { updateModerationStatusByLang } = await import('@/lib/api/language-purchase');
      const langResult = await updateModerationStatusByLang(
        detail.sessionId, activePreviewLang, 'approved',
      );
      if (langResult.ok) {
        addTourComment(detail.tourId, { message: overallNotes || `Langue ${activePreviewLang.toUpperCase()} approuvée`, author: 'admin', authorName: 'Admin', action: 'approved', language: activePreviewLang }).catch(() => {});
        setSubmitting(false);
        setSuccessMessage(`Langue ${activePreviewLang.toUpperCase()} approuvée !`);
        setTimeout(() => router.push('/admin/moderation'), 2000);
        return;
      }
      setSubmitting(false);
      setErrorMessage(langResult.error?.message || 'Erreur');
      return;
    }

    const checklistData: Record<string, { checked: boolean; note: string }> = {};
    checklist.forEach((item) => {
      checklistData[item.id] = { checked: item.checked, note: item.note };
    });

    const result = await approveTour(moderationId, checklistData, overallNotes);
    setSubmitting(false);

    if (result.ok) {
      const reviewTime = Math.round((Date.now() - reviewStartTime) / 60000);
      trackEvent(AdminAnalyticsEvents.ADMIN_MODERATION_APPROVED, {
        moderation_id: moderationId,
        review_time_minutes: reviewTime,
      });
      trackEvent(AdminAnalyticsEvents.ADMIN_TOUR_REVIEW_ACTION, {
        action: 'validate', tourId: detail.tourId,
      });
      sendGuideNotification(detail.guideId, detail.tourId, detail.tourTitle, 'validate')
        .catch((error: unknown) => logger.warn(SERVICE_NAME, 'Notification de validation impossible', { error: String(error) }));
      setSuccessMessage('Parcours approuve et publie !');
      setTimeout(() => router.push('/admin/moderation'), 2000);
    } else {
      setErrorMessage(result.error || 'Erreur lors de l\'approbation');
    }
  };

  const handleReject = async () => {
    if (!detail) return;
    if (rejectFeedback.length < 20) return;
    setSubmitting(true);
    setErrorMessage(null);

    // If examining a specific language, reject the language purchase instead of the whole tour
    if (activePreviewLang !== detail.languePrincipale) {
      const { updateModerationStatusByLang } = await import('@/lib/api/language-purchase');
      const langResult = await updateModerationStatusByLang(
        detail.sessionId, activePreviewLang, 'rejected',
        { global: rejectFeedback },
      );
      if (langResult.ok) {
        addTourComment(detail.tourId, { message: rejectFeedback, author: 'admin', authorName: 'Admin', action: 'rejected', language: activePreviewLang }).catch(() => {});
        setSubmitting(false);
        setSuccessMessage(`Langue ${activePreviewLang.toUpperCase()} refusée.`);
        setTimeout(() => router.push('/admin/moderation'), 2000);
        return;
      }
      setSubmitting(false);
      setErrorMessage(langResult.error?.message || 'Erreur');
      return;
    }

    const result = await rejectTour(moderationId, rejectCategory, rejectFeedback, rejectPoiIds);
    setSubmitting(false);

    if (result.ok) {
      const reviewTime = Math.round((Date.now() - reviewStartTime) / 60000);
      trackEvent(AdminAnalyticsEvents.ADMIN_MODERATION_REJECTED, {
        moderation_id: moderationId,
        category: rejectCategory,
        review_time_minutes: reviewTime,
      });
      sendGuideNotification(detail.guideId, detail.tourId, detail.tourTitle, 'reject', rejectFeedback)
        .catch((error: unknown) => logger.warn(SERVICE_NAME, 'Notification de refus impossible', { error: String(error) }));
      setSuccessMessage('Retour envoye au guide.');
      setTimeout(() => router.push('/admin/moderation'), 2000);
    } else {
      setErrorMessage(result.error || 'Erreur lors du rejet');
    }
  };

  const handleSendRevision = async () => {
    if (!detail || revisionFeedback.length < 10) return;
    setSubmitting(true);
    setErrorMessage(null);

    // If examining a specific language, send revision for that language only
    if (activePreviewLang !== detail.languePrincipale) {
      const { updateModerationStatusByLang } = await import('@/lib/api/language-purchase');
      const langResult = await updateModerationStatusByLang(
        detail.sessionId, activePreviewLang, 'revision_requested',
        { global: revisionFeedback },
      );
      if (langResult.ok) {
        addTourComment(detail.tourId, { message: revisionFeedback, author: 'admin', authorName: 'Admin', action: 'revision', language: activePreviewLang }).catch(() => {});
        setSubmitting(false);
        setSuccessMessage(`Révision demandée pour ${activePreviewLang.toUpperCase()}.`);
        setTimeout(() => router.push('/admin/moderation'), 2000);
        return;
      }
      setSubmitting(false);
      setErrorMessage(langResult.error?.message || 'Erreur');
      return;
    }

    const result = await sendBackForRevision(moderationId, revisionFeedback);
    setSubmitting(false);

    if (result.ok) {
      trackEvent(AdminAnalyticsEvents.ADMIN_TOUR_REVIEW_ACTION, {
        action: 'revision', tourId: detail.tourId, commentCount: localComments.length,
      });
      sendGuideNotification(detail.guideId, detail.tourId, detail.tourTitle, 'revision', revisionFeedback)
        .catch((error: unknown) => logger.warn(SERVICE_NAME, 'Notification de révision impossible', { error: String(error) }));
      setSuccessMessage('Renvoyé au guide pour corrections.');
      setTimeout(() => router.push('/admin/moderation'), 2000);
    } else {
      setErrorMessage(result.error || 'Erreur lors du renvoi');
    }
  };

  const handleAddComment = async () => {
    if (!detail || !commentText.trim()) return;
    setSubmitting(true);
    setErrorMessage(null);

    const result = await addReviewComment(detail.tourId, {
      sceneId: commentSceneId || undefined,
      comment: commentText.trim(),
      reviewerId: 'admin-current',
      reviewerName: 'Admin',
    });
    setSubmitting(false);

    if (result.ok) {
      trackEvent(AdminAnalyticsEvents.ADMIN_TOUR_REVIEW_ACTION, {
        action: 'comment', tourId: detail.tourId, sceneId: commentSceneId || undefined,
      });
      const newComment: ModerationAdminComment = {
        id: `ac-${Date.now()}`,
        sceneId: commentSceneId || undefined,
        comment: commentText.trim(),
        date: new Date().toISOString(),
        reviewerId: 'admin-current',
        reviewerName: 'Admin',
      };
      setLocalComments((prev) => [...prev, newComment]);
      setCommentText('');
      setCommentSceneId('');
      setShowCommentForm(false);
    } else {
      setErrorMessage(result.error || 'Erreur lors de l\'ajout du commentaire');
    }
  };

  const toggleRejectPoi = (poiId: string) => {
    setRejectPoiIds((prev) =>
      prev.includes(poiId) ? prev.filter((id) => id !== poiId) : [...prev, poiId],
    );
  };

  /** Play audio for a scene (resolves S3 URL, then uses audioPlayerService) */
  const handlePlayAudio = useCallback(async (sceneId: string, audioRef: string) => {
    if (playingSceneId === sceneId) {
      audioPlayerService.stop();
      setPlayingSceneId(null);
      return;
    }
    try {
      let url: string;
      if (audioRef.startsWith('blob:') || audioRef.startsWith('http')) {
        url = audioRef;
      } else if (shouldUseStubs()) {
        // In stub mode, no real S3 — just toggle the visual indicator
        setPlayingSceneId(sceneId);
        return;
      } else {
        url = await getPlayableUrl(audioRef);
      }
      audioPlayerService.play(url);
      setPlayingSceneId(sceneId);
    } catch {
      setPlayingSceneId(null);
    }
  }, [playingSceneId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-ink-60">Chargement...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-12">
        <p className="text-ink-60 text-lg">Item de moderation introuvable.</p>
        <Link href="/admin/moderation" className="text-danger hover:underline mt-4 inline-block">
          Retour a la file d&apos;attente
        </Link>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-4xl mb-4">✅</div>
          <p className="text-xl font-semibold text-ink">{successMessage}</p>
          <p className="text-sm text-ink-60 mt-2">Redirection vers la file d&apos;attente...</p>
        </div>
      </div>
    );
  }

  const sortedScenes = [...detail.scenes].sort((a, b) => a.order - b.order);
  const globalComments = localComments.filter((c) => !c.sceneId);
  const getSceneComments = (sceneId: string) => localComments.filter((c) => c.sceneId === sceneId);

  return (
    <div>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/admin/moderation" className="text-sm text-ink-60 hover:text-danger">
            ← Retour a la file d&apos;attente
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl font-bold text-ink">
              {(activePreviewLang !== detail.languePrincipale && translatedTitles[activePreviewLang]) ? translatedTitles[activePreviewLang] : detail.tourTitle}
            </h1>
            {detail.languePrincipale && (
              <span className="bg-paper-deep text-ink-60 text-xs font-medium px-2 py-0.5 rounded">
                {LANG_FLAGS[detail.languePrincipale] ?? detail.languePrincipale}
              </span>
            )}
            {detail.themes.length > 0 && detail.themes.map((t) => (
              <span key={t} className="bg-grenadine-soft text-grenadine text-xs px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-40">En revue depuis {elapsedMinutes} min</span>
          {prevId && (
            <Link href={`/admin/moderation/${prevId}`} className="text-sm text-ink-60 hover:text-danger">
              ← Precedent
            </Link>
          )}
          {nextId && (
            <Link href={`/admin/moderation/${nextId}`} className="text-sm text-ink-60 hover:text-danger">
              Suivant →
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guide profile summary */}
          <div className="bg-card rounded-md border border-line p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-grenadine-soft rounded-full flex items-center justify-center text-grenadine font-bold text-lg">
                {detail.guideName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-ink">
                  {detail.guideName}
                  {detail.isFirstSubmission && (
                    <span className="ml-2 bg-mer-soft text-mer text-xs font-medium px-2 py-0.5 rounded-full">
                      Nouveau guide
                    </span>
                  )}
                </p>
                <p className="text-sm text-ink-60">
                  {detail.city} &middot; {detail.guideSubmissionCount} soumissions &middot; {detail.guideApprovalRate}% approuve
                  {detail.guideTourCount > 0 && <> &middot; {detail.guideTourCount} parcours</>}
                </p>
                {detail.guideBio && (
                  <p className="text-xs text-ink-40 mt-1">{detail.guideBio}</p>
                )}
                {detail.guideLanguages.length > 0 && (
                  <p className="text-xs text-ink-40 mt-0.5">Langues: {detail.guideLanguages.join(', ')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Legacy admin comments */}
          {globalComments.length > 0 && (
            <div className="bg-ocre-soft border border-ocre rounded-md px-4 py-3">
              <p className="text-sm font-semibold text-ocre mb-2">Commentaires admin existants</p>
              {globalComments.map((c) => (
                <div key={c.id} className="text-sm text-ocre mb-1">
                  <span className="font-medium">{c.reviewerName}</span> — {c.comment}
                  <span className="text-xs text-ocre ml-2">{new Date(c.date).toLocaleDateString('fr-FR')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Comment thread */}
          <TourCommentThread tourId={detail.tourId} role="admin" authorName="Admin" sessionId={detail.sessionId} />

          {/* When examining a translated language: side-by-side comparison view */}
          {activePreviewLang !== detail.languePrincipale ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-grenadine-soft border border-grenadine rounded-lg px-4 py-2">
                <span className="text-lg">{LANG_FLAGS[activePreviewLang] ?? ''}</span>
                <span className="text-sm font-medium text-grenadine">
                  Comparaison {detail.languePrincipale.toUpperCase()} / {activePreviewLang.toUpperCase()}
                </span>
              </div>

              {/* Description: FR vs translated */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-card rounded-md border border-line p-4">
                  <h3 className="text-sm font-semibold text-ink-40 mb-2">Description ({detail.languePrincipale.toUpperCase()})</h3>
                  <p className="text-sm text-ink-60">{detail.descriptionLongue || detail.description}</p>
                </div>
                <div className="bg-card rounded-md border border-grenadine p-4">
                  <h3 className="text-sm font-semibold text-grenadine mb-2">Description ({activePreviewLang.toUpperCase()})</h3>
                  <p className="text-sm text-ink">
                    {translatedDescriptions[activePreviewLang] || <span className="italic text-ocre">Non traduite</span>}
                  </p>
                </div>
              </div>

              {/* Scenes: FR left / translated right — stacked per scene */}
              <h3 className="text-lg font-semibold text-ink">Scènes ({detail.scenes.length})</h3>
              {loadingSegments ? (
                <p className="text-sm text-ink-40 animate-pulse">Chargement...</p>
              ) : (
              <div className="space-y-4">
                {detail.scenes.map((scene) => {
                  const langSegs = (segmentsByScene[scene.id] ?? []).filter((s) => s.language === activePreviewLang);
                  const seg = langSegs[0];
                  const presentation = getModerationScenePresentation(scene, seg, true);
                  const displayTitle = presentation.title;
                  const displayText = presentation.text;
                  const displayAudio = presentation.audioKey;

                  return (
                    <div key={scene.id} className="grid grid-cols-1 lg:grid-cols-2 gap-3 border border-line rounded-md overflow-hidden" data-testid={`tourist-scene-${scene.id}`}>
                      {/* FR source (left) */}
                      <div className="p-4 bg-paper-soft">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 bg-paper-deep text-white rounded-full flex items-center justify-center text-xs font-bold">{scene.order}</span>
                          <p className="font-medium text-ink-60 text-sm">{scene.title}</p>
                          <span className="text-[10px] text-ink-40 ml-auto">{detail.languePrincipale.toUpperCase()}</span>
                        </div>
                        {scene.audioRef && (
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              onClick={() => handlePlayAudio(`${scene.id}-fr`, scene.audioRef)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${playingSceneId === `${scene.id}-fr` ? 'bg-grenadine text-white' : 'bg-paper-deep text-white hover:bg-paper-deep'}`}
                            >
                              {playingSceneId === `${scene.id}-fr` ? '\u23F8' : '\u25B6'}
                            </button>
                            <span className="text-[10px] text-ink-40">{detail.languePrincipale.toUpperCase()}</span>
                          </div>
                        )}
                        <p className="text-xs text-ink-60 leading-relaxed whitespace-pre-wrap">{scene.transcriptText ?? 'Aucun texte'}</p>
                      </div>
                      {/* Translated (right) */}
                      <div className="p-4 bg-card">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 bg-grenadine text-white rounded-full flex items-center justify-center text-xs font-bold">{scene.order}</span>
                          <p className="font-medium text-ink text-sm">{displayTitle}</p>
                          <span className={`text-[10px] ml-auto px-1.5 py-0.5 rounded ${seg ? 'bg-olive-soft text-olive' : 'bg-ocre-soft text-ocre'}`}>
                            {seg ? `${activePreviewLang.toUpperCase()} OK` : `${activePreviewLang.toUpperCase()} manquant`}
                          </span>
                        </div>
                        {displayAudio && (
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              onClick={() => handlePlayAudio(scene.id, displayAudio)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${playingSceneId === scene.id ? 'bg-grenadine text-white' : 'bg-grenadine text-white hover:bg-grenadine'}`}
                              data-testid={`play-audio-${scene.id}`}
                            >
                              {playingSceneId === scene.id ? '\u23F8' : '\u25B6'}
                            </button>
                            <span className="text-[10px] text-grenadine">{activePreviewLang.toUpperCase()}</span>
                          </div>
                        )}
                        {displayText ? (
                          <p className="text-xs text-ink leading-relaxed">{displayText}</p>
                        ) : (
                          <p className="text-xs text-ocre italic">Traduction non disponible</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              )}

              {/* Photos with lightbox zoom */}
              {detail.scenes.some((s) => s.photosRefs.length > 0) && (
                <PhotoGallery scenes={detail.scenes} />
              )}

              {/* Audio player bar */}
              <div className="sticky bottom-0" data-testid="tourist-audio-player">
                <AudioPlayerBar label="Lecture audio" />
              </div>
            </div>
          ) : (
          <>
          {/* Standard tabs for FR review (no ?lang= param) */}
          <div className="flex gap-1 bg-paper-deep rounded-lg p-1 w-fit flex-wrap">
            {(['tourist', 'overview', 'scenes', 'pois'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveContentTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeContentTab === tab
                    ? 'bg-card text-danger shadow-sm'
                    : 'text-ink-60 hover:text-ink-80'
                }`}
              >
                {tab === 'tourist' ? '👁 Aperçu touriste' : tab === 'overview' ? 'Général' : tab === 'scenes' ? `Scènes (${detail.scenes.length})` : `POIs (${detail.scenes.filter((s) => hasValidCoordinates(s.latitude, s.longitude)).length}/${detail.scenes.length})`}
              </button>
            ))}
          </div>
          </>
          )}

          {/* Tourist preview tab — mirrors catalogue experience */}
          {activeContentTab === 'tourist' && (
            <div className="space-y-6">
              {/* Hero + Cover Photo + Title — like catalogue tour detail */}
              <div className="bg-grenadine rounded-md overflow-hidden text-white">
                {(detail.coverPhotoKey || detail.heroImageUrl) && (
                  <div className="relative h-48 w-full">
                    <S3Image s3Key={detail.coverPhotoKey || detail.heroImageUrl || ''} alt={`Couverture: ${detail.tourTitle}`} className="w-full h-full object-cover" fallback="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${detail.purchaseType === 'free' ? 'bg-olive text-olive' : 'bg-ocre-soft text-ocre'}`}>
                      {detail.purchaseType === 'free'
                        ? 'GRATUIT'
                        : detail.purchaseType === 'paid'
                          ? 'PAYANT'
                          : detail.purchaseType === 'subscription_only'
                            ? 'ABONNEMENT'
                            : 'ACCÈS NON RENSEIGNÉ'}
                    </span>
                    <span className="bg-card/30 text-white text-xs font-bold px-2 py-0.5 rounded">
                      {LANG_FLAGS[activePreviewLang] ?? ''} {activePreviewLang.toUpperCase()}
                    </span>
                    {detail.themes.map((t) => (
                      <span key={t} className="bg-card/20 text-white text-xs px-2 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                  <h2 className="text-2xl font-bold mb-1">
                    {activePreviewLang === detail.languePrincipale
                      ? detail.tourTitle
                      : translatedTitles[activePreviewLang] || 'Titre non traduit'}
                  </h2>
                  <p className="text-grenadine-soft text-sm">
                    {detail.city} &middot; {detail.duration} min &middot; {detail.distance} km &middot; {detail.poiCount} points d&apos;interet
                    &middot; Difficulte : {detail.difficulty}
                  </p>
                  <p className="text-white text-sm mt-1 font-semibold" data-testid="moderation-monetization">
                    Accès : {detail.purchaseType === 'free'
                      ? 'Gratuite'
                      : detail.purchaseType === 'paid'
                        ? `Payante — ${typeof detail.priceCents === 'number' ? `${(detail.priceCents / 100).toFixed(2).replace('.', ',')} €` : 'prix non défini'}`
                        : detail.purchaseType === 'subscription_only'
                          ? 'Abonnés uniquement'
                          : 'non renseigné'}
                  </p>
                  <p className="text-white text-sm mt-1" data-testid="moderation-provenance">
                    Provenance : {detail.contentProvenance ?? 'non renseignée'}
                    {(detail.contentProvenance === 'ai' || detail.contentProvenance === 'mixed') && (
                      <span className="ml-2 font-semibold">Developed with AI</span>
                    )}
                  </p>
                </div>
              </div>

              {/* Guide card — like catalogue */}
              <div className="bg-card rounded-md border border-line p-4 flex items-center gap-4">
                <div className="w-14 h-14 bg-grenadine-soft rounded-full flex items-center justify-center text-grenadine font-bold text-xl flex-shrink-0">
                  {detail.guideName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-ink">{detail.guideName}</p>
                  <p className="text-sm text-ink-60">Guide local &middot; {detail.city}</p>
                  {detail.guideBio && <p className="text-xs text-ink-40 mt-1 line-clamp-2">{detail.guideBio}</p>}
                  {detail.guideLanguages.length > 0 && (
                    <p className="text-xs text-ink-40 mt-0.5">Langues : {detail.guideLanguages.join(', ')}</p>
                  )}
                </div>
              </div>

              {/* Description — shows translated version when available */}
              {(detail.descriptionLongue || detail.description || activePreviewLang !== detail.languePrincipale) && (
                <div className="bg-card rounded-md border border-line p-5">
                  <h3 className="text-lg font-semibold text-ink mb-2">
                    À propos de cette visite ({activePreviewLang.toUpperCase()})
                  </h3>
                  {activePreviewLang !== detail.languePrincipale && translatedDescriptions[activePreviewLang] ? (
                    <>
                      <p className="text-ink-80 leading-relaxed">{translatedDescriptions[activePreviewLang]}</p>
                      <details className="mt-2">
                        <summary className="text-xs text-ink-40 cursor-pointer">Voir original (FR)</summary>
                        <p className="text-sm text-ink-40 mt-1 italic">{detail.descriptionLongue || detail.description}</p>
                      </details>
                    </>
                  ) : activePreviewLang === detail.languePrincipale ? (
                    <>
                      <p className="text-ink-80 leading-relaxed">{detail.descriptionLongue || detail.description}</p>
                    </>
                  ) : (
                    <div className="rounded-lg border border-ocre bg-ocre-soft p-3 text-sm text-ocre">
                      Description non traduite en {activePreviewLang.toUpperCase()}. Aucun texte source n’est utilisé comme traduction.
                    </div>
                  )}
                </div>
              )}

              {/* Interactive map — like catalogue TourMap */}
              {detail.scenes.some((s) => hasValidCoordinates(s.latitude, s.longitude)) && (
                <div className="bg-card rounded-md border border-line overflow-hidden">
                  <h3 className="text-lg font-semibold text-ink p-4 pb-0">
                    Itinéraire
                    {guideRoutePath ? (
                      <span className="ml-2 text-xs font-normal text-success">· Tracé du guide</span>
                    ) : (
                      <span className="ml-2 text-xs font-normal text-ocre">· Tracé auto (le guide n&apos;a pas persisté son tracé)</span>
                    )}
                  </h3>
                  <div className="h-80">
                    <TourMap
                      pois={detail.scenes
                        .filter((s) => hasValidCoordinates(s.latitude, s.longitude))
                        .map((s) => ({
                          id: s.id,
                          order: s.order,
                          title: s.title,
                          latitude: s.latitude!,
                          longitude: s.longitude!,
                        }))}
                      selectedPoiId={null}
                      onPoiSelect={() => {}}
                      customPath={guideRoutePath}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              )}

              {/* Unified scene review — one card per scene with text + audio + photos */}
              <div className="bg-card rounded-md border border-line p-5">
                <h3 className="text-lg font-semibold text-ink mb-4">
                  Scenes ({detail.scenes.length}) — {activePreviewLang.toUpperCase()}
                </h3>
                {/* Diagnostic — shows segment state per scene */}
                <details className="text-[10px] text-ink-40 mb-2 border border-dashed border-line rounded p-2">
                  <summary>Diagnostic segments ({activePreviewLang.toUpperCase()})</summary>
                  <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(
                    detail.scenes.map((sc) => {
                      const segs = (segmentsByScene[sc.id] ?? []);
                      const langSeg = segs.find((s) => s.language === activePreviewLang);
                      return {
                        scene: sc.order,
                        sceneId: sc.id,
                        totalSegs: segs.length,
                        segsLangs: segs.map((s) => s.language),
                        hasLangSeg: !!langSeg,
                        segLang: langSeg?.language,
                        hasText: !!langSeg?.transcriptText,
                        hasAudio: !!langSeg?.audioKey,
                        audioKey: langSeg?.audioKey?.substring(0, 40),
                      };
                    }),
                    null, 1,
                  )}</pre>
                </details>
                {loadingSegments ? (
                  <p className="text-sm text-ink-40 animate-pulse">Chargement des segments...</p>
                ) : (
                <div className="space-y-4">
                  {detail.scenes.map((scene) => {
                    const isSourceLang = activePreviewLang === detail.languePrincipale;
                    const allSegsForScene = segmentsByScene[scene.id] ?? [];
                    const langSegs = allSegsForScene.filter((s) => s.language === activePreviewLang);
                    const seg = langSegs[0];

                    // Resolve content for active language
                    const presentation = getModerationScenePresentation(scene, seg, !isSourceLang);
                    const displayTitle = presentation.title;
                    const displayText = presentation.text;
                    const displayAudio = presentation.audioKey;
                    const hasTranslation = !isSourceLang && seg != null;

                    return (
                      <div
                        key={scene.id}
                        className={`border rounded-md p-4 ${!isSourceLang && !hasTranslation ? 'border-ocre bg-ocre-soft' : 'border-line'}`}
                        data-testid={`tourist-scene-${scene.id}`}
                      >
                        {/* Header: number + title + language badge */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-8 h-8 bg-grenadine text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {scene.order}
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-ink">{displayTitle}</p>
                            {!isSourceLang && scene.title !== displayTitle && (
                              <p className="text-xs text-ink-40 italic">FR: {scene.title}</p>
                            )}
                          </div>
                          {!isSourceLang && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${hasTranslation ? 'bg-olive-soft text-olive' : 'bg-ocre-soft text-ocre'}`}>
                              {hasTranslation ? `${activePreviewLang.toUpperCase()} OK` : `${activePreviewLang.toUpperCase()} manquant`}
                            </span>
                          )}
                        </div>

                        {/* Audio + Narration side by side on desktop */}
                        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-3 mb-3">
                          {/* Audio player */}
                          <div className="flex items-start gap-2">
                            {displayAudio ? (
                              <button
                                onClick={() => handlePlayAudio(scene.id, displayAudio)}
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors flex-shrink-0 ${
                                  playingSceneId === scene.id
                                    ? 'bg-grenadine text-white hover:bg-grenadine'
                                    : 'bg-grenadine text-white hover:bg-grenadine'
                                }`}
                                data-testid={`play-audio-${scene.id}`}
                              >
                                {playingSceneId === scene.id ? '\u23F8' : '\u25B6'}
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-paper-deep flex items-center justify-center text-ink-40 text-xs flex-shrink-0">
                                —
                              </div>
                            )}
                            {displayAudio && (
                              <p className="text-[10px] text-ink-40 mt-2.5">
                                {activePreviewLang.toUpperCase()}
                                {formatDuration(scene.durationSeconds) ? ` ${formatDuration(scene.durationSeconds)}` : ''}
                              </p>
                            )}
                          </div>

                          {/* Narration text */}
                          <div className="bg-paper-soft rounded-lg p-3 min-h-[60px]">
                            {displayText ? (
                              <p className="text-sm text-ink-80 whitespace-pre-wrap">{displayText}</p>
                            ) : !isSourceLang ? (
                              <p className="text-sm text-ocre italic">Traduction non disponible</p>
                            ) : (
                              <p className="text-sm text-ink-40 italic">Aucun texte</p>
                            )}
                          </div>
                        </div>

                        {/* Photos row */}
                        {scene.photosRefs.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto">
                            {scene.photosRefs.map((ref, i) => (
                              <S3Image key={i} s3Key={ref} alt={`${scene.title} photo ${i + 1}`} className="w-24 h-20 rounded-lg flex-shrink-0" />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                )}
              </div>

              {/* Global audio player bar */}
              <div className="sticky bottom-0" data-testid="tourist-audio-player">
                <AudioPlayerBar label="Lecture audio" />
              </div>

              {/* Sidebar preview — like catalogue CTA card */}
              <div className="bg-grenadine-soft border border-grenadine rounded-md p-5">
                <h3 className="text-lg font-bold text-grenadine mb-3">Vivez cette visite</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-grenadine">{detail.duration}</p>
                    <p className="text-xs text-grenadine">minutes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-grenadine">{detail.distance}</p>
                    <p className="text-xs text-grenadine">km</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-grenadine">{detail.poiCount}</p>
                    <p className="text-xs text-grenadine">points d&apos;intérêt</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-grenadine">{detail.difficulty}</p>
                    <p className="text-xs text-grenadine">difficulté</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="flex-1 bg-paper-deep text-white text-center py-2.5 rounded-lg text-sm font-medium opacity-50">
                    Android (preview)
                  </div>
                  <div className="flex-1 bg-paper-deep text-white text-center py-2.5 rounded-lg text-sm font-medium opacity-50">
                    iOS (preview)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overview tab */}
          {activeContentTab === 'overview' && (
            <div className="bg-card rounded-md border border-line p-4 space-y-4">
              {detail.descriptionLongue ? (
                <>
                  <h2 className="text-lg font-semibold text-ink">Description ({activePreviewLang.toUpperCase()})</h2>
                  <p className="text-ink-80">
                    {(activePreviewLang !== detail.languePrincipale && translatedDescriptions[activePreviewLang])
                      ? translatedDescriptions[activePreviewLang]
                      : detail.descriptionLongue}
                  </p>
                  {activePreviewLang !== detail.languePrincipale && !translatedDescriptions[activePreviewLang] && (
                    <p className="text-xs text-ocre mt-1">Non traduite en {activePreviewLang.toUpperCase()}</p>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-ink">Description</h2>
                  <p className="text-ink-80">{detail.description}</p>
                </>
              )}
              <div className="flex gap-4 text-sm text-ink-60">
                <span>{detail.poiCount} POIs</span>
                <span>&middot;</span>
                <span>{detail.duration} min</span>
                <span>&middot;</span>
                <span>{detail.distance} km</span>
                <span>&middot;</span>
                <span>Difficulté: {detail.difficulty}</span>
                <span>&middot;</span>
                <span>Langue: {LANG_FLAGS[detail.languePrincipale] ?? detail.languePrincipale}</span>
              </div>

              {/* Themes/Tags */}
              {detail.themes.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {detail.themes.map((theme) => (
                    <span key={theme} className="text-xs font-medium bg-grenadine-soft text-grenadine px-2.5 py-1 rounded-full border border-grenadine">
                      {theme}
                    </span>
                  ))}
                </div>
              )}

              {/* Map */}
              {detail.scenes.some((s) => hasValidCoordinates(s.latitude, s.longitude)) && (
                <div className="rounded-lg overflow-hidden border border-line">
                  <PreviewMap
                    scenes={detail.scenes.map((s) => ({
                      id: s.id,
                      latitude: s.latitude,
                      longitude: s.longitude,
                      title: s.title,
                      sceneIndex: s.order - 1,
                    } as import('@/types/studio').StudioScene))}
                    customPath={guideRoutePath}
                  />
                </div>
              )}
            </div>
          )}

          {/* Scenes tab */}
          {activeContentTab === 'scenes' && (
            <div className="space-y-4">
              {sortedScenes.length === 0 ? (
                <div className="text-center py-8 text-ink-40 bg-card rounded-md border border-line">
                  <p>Aucune scene disponible</p>
                </div>
              ) : (
                sortedScenes.map((scene) => {
                  const sceneComments = getSceneComments(scene.id);
                  // Resolve content for active language
                  const isSourceLang = activePreviewLang === detail.languePrincipale;
                  const sceneLangSegs = (segmentsByScene[scene.id] ?? []).filter((s) => s.language === activePreviewLang);
                  const sceneSeg = sceneLangSegs[0];
                  const presentation = getModerationScenePresentation(scene, sceneSeg, !isSourceLang);
                  const sceneDisplayTitle = presentation.title;
                  const sceneDisplayAudio = presentation.audioKey;
                  return (
                    <div key={scene.id} className="bg-card border border-line rounded-md p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 bg-grenadine-soft text-danger rounded-full flex items-center justify-center text-sm font-bold">
                          {scene.order}
                        </span>
                        <div>
                          <h3 className="font-semibold text-ink">{sceneDisplayTitle}</h3>
                          <p className="text-xs text-ink-60">
                            {sceneDisplayAudio ? (formatDuration(scene.durationSeconds) || 'Audio') : 'Pas d\'audio'}
                            {' \u00b7 '}
                            {scene.photosRefs.length} photo{scene.photosRefs.length !== 1 ? 's' : ''}
                            {!isSourceLang && <span className="ml-1 text-grenadine">({activePreviewLang.toUpperCase()})</span>}
                          </p>
                        </div>
                      </div>

                      {/* Audio player — uses translated audio when available */}
                      <div className="bg-paper-soft rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              if (playingSceneId === scene.id) {
                                audioPlayerService.pause();
                                setPlayingSceneId(null);
                              } else if (sceneDisplayAudio) {
                                handlePlayAudio(scene.id, sceneDisplayAudio);
                              }
                            }}
                            disabled={!sceneDisplayAudio}
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${sceneDisplayAudio ? 'bg-grenadine text-white hover:bg-grenadine' : 'bg-paper-deep text-ink-60 cursor-not-allowed'}`}
                          >
                            {playingSceneId === scene.id ? '⏸' : '▶'}
                          </button>
                          <div className="flex-1 bg-paper-deep rounded-full h-2">
                            <div className="bg-grenadine h-2 rounded-full" style={{ width: playingSceneId === scene.id ? '45%' : '0%' }} />
                          </div>
                          {formatDuration(scene.durationSeconds) && <span className="text-xs text-ink-60">{formatDuration(scene.durationSeconds)}</span>}
                        </div>
                      </div>

                      {/* Photos */}
                      {scene.photosRefs.length > 0 && (
                        <div className="flex gap-2 mb-3 overflow-x-auto">
                          {scene.photosRefs.map((ref, i) => (
                            <S3Image key={i} s3Key={ref} alt={`Photo ${i + 1}`} className="w-20 h-20 rounded-lg flex-shrink-0" fallback={`img ${i + 1}`} />
                          ))}
                        </div>
                      )}

                      {/* Scene admin comments */}
                      {sceneComments.length > 0 && (
                        <div className="bg-ocre-soft border border-ocre rounded-lg p-3 mt-2">
                          <p className="text-xs font-semibold text-ocre mb-1">Commentaires</p>
                          {sceneComments.map((c) => (
                            <p key={c.id} className="text-sm text-ocre">
                              <span className="font-medium">{c.reviewerName}:</span> {c.comment}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* POIs tab */}
          {activeContentTab === 'pois' && (
            <div className="bg-card rounded-md border border-line p-4">
              <h2 className="text-lg font-semibold text-ink mb-4">Points d&apos;intérêt</h2>

              {/* Map */}
              {detail.scenes.some((s) => hasValidCoordinates(s.latitude, s.longitude)) && (
                <div className="rounded-lg overflow-hidden border border-line mb-4">
                  <PreviewMap
                    scenes={detail.scenes.map((s) => ({
                      id: s.id,
                      latitude: s.latitude,
                      longitude: s.longitude,
                      title: s.title,
                      sceneIndex: s.order - 1,
                    } as import("@/types/studio").StudioScene))}
                    // Trace le parcours RÉEL du guide (polyline) au lieu de relier
                    // les POIs en lignes droites (cohérent avec l'aperçu plus haut).
                    customPath={guideRoutePath}
                  />
                </div>
              )}

              <div className="space-y-4">
                {detail.scenes.map((scene) => (
                  <div key={scene.id} className="border-b border-line pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 bg-grenadine-soft text-danger rounded-full flex items-center justify-center text-xs font-bold">
                        {scene.order}
                      </span>
                      <h3 className="font-medium text-ink">{scene.title}</h3>
                      {hasValidCoordinates(scene.latitude, scene.longitude) && (
                        <span className="text-xs text-ink-40 ml-auto">
                          📍 {scene.latitude!.toFixed(4)}, {scene.longitude!.toFixed(4)}
                        </span>
                      )}
                      {!hasValidCoordinates(scene.latitude, scene.longitude) && (
                        <span className="text-xs text-ocre ml-auto">⚠ Pas de GPS</span>
                      )}
                    </div>
                    {scene.poiDescription && (
                      <p className="text-sm text-ink-60 mb-2">{scene.poiDescription}</p>
                    )}
                    {scene.transcriptText && (
                      <div className="bg-paper-soft rounded p-2 mb-2">
                        <p className="text-xs font-medium text-ink-40 mb-1">Texte transcrit</p>
                        <p className="text-sm text-ink-80 line-clamp-3">{scene.transcriptText}</p>
                      </div>
                    )}
                    {scene.photosRefs.length > 0 && (
                      <div className="flex gap-2">
                        {scene.photosRefs.map((ref, i) => (
                          <S3Image key={i} s3Key={ref} alt={`Photo ${i + 1}`} className="w-16 h-16 rounded" fallback={`📷 ${i + 1}`} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Checklist + Actions */}
        <div className="lg:col-span-1">
          {/* On large screens this panel scrolls independently (its own
              scrollbar, capped to the viewport height) so the moderator can
              reach the checklist + Valider/Rejeter actions without scrolling
              the long left column of translations and audio players. */}
          <div className="sticky top-24 space-y-4 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
            <div className="bg-card rounded-md border border-line p-4" data-testid="admin-validation-report">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Contrôles automatiques</h2>
                  <p className="text-xs text-ink-60">Contrôle d’interface — l’autorité serveur sera ajoutée séparément.</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${validationReport?.ready ? 'bg-olive-soft text-olive' : 'bg-grenadine-soft text-danger'}`}>
                  {validationReport?.ready ? 'Conforme' : `${validationReport?.blockingCount ?? 1} blocage(s)`}
                </span>
              </div>
              <div className="space-y-2">
                {validationReport?.checks.map((item) => (
                  <div key={item.id} className={`rounded-lg border p-2 ${item.passed ? 'border-olive bg-olive-soft' : 'border-grenadine bg-grenadine-soft'}`}>
                    <p className={`text-sm font-medium ${item.passed ? 'text-olive' : 'text-danger'}`}>
                      {item.passed ? '✓' : '✕'} {item.label}
                    </p>
                    <p className="text-xs text-ink-60 mt-0.5">{item.evidence}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quality Checklist */}
            <div className="bg-card rounded-md border border-line p-4">
              <h2 className="text-lg font-semibold text-ink mb-4">Checklist qualite</h2>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div key={item.id}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="mt-1 h-4 w-4 rounded border-line text-danger focus:ring-grenadine-soft"
                      />
                      <div>
                        <p className="text-sm font-medium text-ink">{item.label}</p>
                        <p className="text-xs text-ink-60">{item.description}</p>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => updateChecklistNote(item.id, e.target.value)}
                      placeholder="Note (optionnel)"
                      className="mt-1 w-full text-xs border border-line rounded px-2 py-1 text-ink-60"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-ink-80 mb-1">Notes generales</label>
                <textarea
                  value={overallNotes}
                  onChange={(e) => setOverallNotes(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-line rounded-lg px-3 py-2 text-ink-80"
                  placeholder="Observations supplementaires..."
                />
              </div>
            </div>

            {/* Error display */}
            {errorMessage && (
              <div className="bg-grenadine-soft text-danger rounded-lg p-3 text-sm" role="alert">
                {errorMessage}
              </div>
            )}

            {/* 4 Actions */}
            <div className="bg-card rounded-md border border-line p-4 space-y-3">
              {/* Validate */}
              <button
                onClick={handleApprove}
                disabled={!canApprove || submitting}
                data-testid="approve-btn"
                className="w-full bg-olive text-white font-bold py-3 rounded-md hover:bg-olive disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'En cours...' : 'Valider et publier'}
              </button>
              {!validationReport?.ready && (
                <p className="text-xs text-danger text-center">
                  Corrigez tous les blocages automatiques avant de valider
                </p>
              )}
              {validationReport?.ready && !allChecked && (
                <p className="text-xs text-ink-40 text-center">
                  Cochez tous les items de la checklist pour valider
                </p>
              )}

              {/* Comment */}
              <button
                onClick={() => { setShowCommentForm(!showCommentForm); setShowRevisionForm(false); setShowRejectForm(false); }}
                disabled={submitting}
                className="w-full border border-grenadine text-grenadine font-bold py-3 rounded-md hover:bg-grenadine-soft disabled:opacity-50"
              >
                Commenter
              </button>

              {/* Send back for revision */}
              <button
                onClick={() => { setShowRevisionForm(!showRevisionForm); setShowCommentForm(false); setShowRejectForm(false); }}
                disabled={submitting}
                data-testid="revision-btn"
                className="w-full border border-ocre text-ocre font-bold py-3 rounded-md hover:bg-ocre-soft disabled:opacity-50"
              >
                Renvoyer au guide
              </button>

              {/* Reject */}
              <button
                onClick={() => { setShowRejectForm(!showRejectForm); setShowCommentForm(false); setShowRevisionForm(false); }}
                disabled={submitting}
                className="w-full border border-grenadine text-danger font-bold py-3 rounded-md hover:bg-grenadine-soft disabled:opacity-50"
              >
                Refuser
              </button>
            </div>

            {/* Comment Form */}
            {showCommentForm && (
              <div className="bg-card rounded-md border border-grenadine p-4">
                <h3 className="text-sm font-semibold text-grenadine mb-3">Ajouter un commentaire</h3>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-ink-80 mb-1">Scene (optionnel)</label>
                  <select
                    value={commentSceneId}
                    onChange={(e) => setCommentSceneId(e.target.value)}
                    className="w-full text-sm border border-line rounded-lg px-3 py-2 text-ink-80"
                  >
                    <option value="">Commentaire global</option>
                    {sortedScenes.map((s) => (
                      <option key={s.id} value={s.id}>{s.order}. {s.title}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    className="w-full text-sm border border-line rounded-lg px-3 py-2 text-ink-80"
                    placeholder="Votre commentaire..."
                  />
                </div>
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || submitting}
                  className="w-full bg-grenadine text-white font-bold py-2 rounded-md hover:bg-grenadine disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Envoi...' : 'Envoyer le commentaire'}
                </button>
              </div>
            )}

            {/* Revision Form */}
            {showRevisionForm && (
              <div className="bg-card rounded-md border border-ocre p-4">
                <h3 className="text-sm font-semibold text-ocre mb-3">Renvoyer au guide pour corrections</h3>
                <div className="mb-3">
                  <textarea
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                    rows={4}
                    data-testid="feedback-input"
                    className="w-full text-sm border border-line rounded-lg px-3 py-2 text-ink-80"
                    placeholder="Preciser les corrections attendues (min. 10 caracteres)..."
                  />
                  <p className="text-xs text-ink-40 mt-1">
                    {revisionFeedback.length}/10 caracteres minimum
                  </p>
                </div>
                <button
                  onClick={handleSendRevision}
                  disabled={revisionFeedback.length < 10 || submitting}
                  className="w-full bg-ocre text-white font-bold py-2 rounded-md hover:bg-ocre disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Envoi...' : 'Renvoyer au guide'}
                </button>
              </div>
            )}

            {/* Reject Form */}
            {showRejectForm && (
              <div className="bg-card rounded-md border border-grenadine p-4">
                <h3 className="text-sm font-semibold text-danger mb-3">Refuser le parcours</h3>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-ink-80 mb-1">Categorie</label>
                  <select
                    value={rejectCategory}
                    onChange={(e) => setRejectCategory(e.target.value as RejectionCategory)}
                    className="w-full text-sm border border-line rounded-lg px-3 py-2 text-ink-80"
                  >
                    {REJECTION_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-ink-80 mb-1">
                    Feedback (min. 20 caracteres)
                  </label>
                  <textarea
                    value={rejectFeedback}
                    onChange={(e) => setRejectFeedback(e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-line rounded-lg px-3 py-2 text-ink-80"
                    placeholder="Soyez precis pour aider le guide a ameliorer..."
                  />
                  <p className="text-xs text-ink-40 mt-1">
                    {rejectFeedback.length}/20 caracteres minimum
                  </p>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-ink-80 mb-1">
                    POIs concernes (optionnel)
                  </label>
                  <div className="space-y-1">
                    {detail.pois.map((poi) => (
                      <label key={poi.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rejectPoiIds.includes(poi.id)}
                          onChange={() => toggleRejectPoi(poi.id)}
                          className="h-3 w-3 rounded border-line text-danger"
                        />
                        <span className="text-ink-80">{poi.order}. {poi.title}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleReject}
                  disabled={rejectFeedback.length < 20 || submitting}
                  className="w-full bg-grenadine text-white font-bold py-2 rounded-md hover:bg-grenadine disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {submitting ? 'Envoi...' : 'Refuser definitivement'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
