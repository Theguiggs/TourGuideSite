'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { S3Image } from '@/components/studio/s3-image';

const PreviewMap = dynamic(() => import('@/components/studio/preview-map').then((m) => ({ default: m.PreviewMap })), {
  ssr: false,
  loading: () => <div className="bg-gray-100 rounded-lg h-48 animate-pulse" />,
});

const TourMap = dynamic(() => import('@/components/map/TourMap'), {
  ssr: false,
  loading: () => <div className="bg-gray-100 rounded-lg h-64 animate-pulse" />,
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
import {
  QUALITY_CHECKLIST_TEMPLATE,
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

function PhotoGallery({ scenes }: { scenes: Array<{ id: string; title: string; photosRefs: string[]; order: number }> }) {
  const [lightbox, setLightbox] = useState<{ s3Key: string; title: string } | null>(null);
  const allPhotos = scenes.flatMap((s) =>
    s.photosRefs.map((ref, i) => ({ s3Key: ref, title: `${s.title} — Photo ${i + 1}`, sceneOrder: s.order })),
  );
  if (allPhotos.length === 0) return null;

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Photos ({allPhotos.length})</h3>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {allPhotos.map((photo, i) => (
            <button
              key={`${photo.s3Key}-${i}`}
              type="button"
              onClick={() => setLightbox(photo)}
              className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 hover:border-teal-400 transition-colors cursor-zoom-in"
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
            className="absolute top-4 right-4 text-white text-3xl hover:text-gray-300 z-10"
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
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 bg-black/40 rounded-full w-12 h-12 flex items-center justify-center"
                    aria-label="Précédente"
                  >
                    ‹
                  </button>
                )}
                {idx < allPhotos.length - 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setLightbox(allPhotos[idx + 1]); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-4xl hover:text-gray-300 bg-black/40 rounded-full w-12 h-12 flex items-center justify-center"
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
  const [languagePurchases, setLanguagePurchases] = useState<TourLanguagePurchase[]>([]);
  const [segmentsByScene, setSegmentsByScene] = useState<Record<string, SceneSegment[]>>({});
  // Fixed to the language from ?lang= param — no toggle, one language at a time
  const activePreviewLang = initialLang || 'fr';
  const [loadingSegments, setLoadingSegments] = useState(false);
  const [translatedDescriptions, setTranslatedDescriptions] = useState<Record<string, string>>({});
  const [translatedTitles, setTranslatedTitles] = useState<Record<string, string>>({});

  useEffect(() => {
    Promise.all([
      getModerationDetail(moderationId),
      getQueueItemIds(),
    ]).then(([d, ids]) => {
      setDetail(d);
      setQueueIds(ids);
      setLocalComments(d?.adminComments ?? []);
      setChecklist(
        QUALITY_CHECKLIST_TEMPLATE.map((item) => ({
          ...item,
          checked: false,
          note: '',
        })),
      );
      setLoading(false);

      // Load translated descriptions from StudioSession + GuideTour (merge both sources)
      if (d?.sessionId) {
        getStudioSession(d.sessionId).then((sess) => {
          let sessDescs = sess?.translatedDescriptions;
          if (typeof sessDescs === 'string') { try { sessDescs = JSON.parse(sessDescs); } catch { sessDescs = null; } }
          if (sessDescs && typeof sessDescs === 'object') {
            setTranslatedDescriptions((prev) => ({ ...prev, ...sessDescs as Record<string, string> }));
          }
          let sessTitles = sess?.translatedTitles;
          if (typeof sessTitles === 'string') { try { sessTitles = JSON.parse(sessTitles); } catch { sessTitles = null; } }
          if (sessTitles && typeof sessTitles === 'object') {
            setTranslatedTitles((prev) => ({ ...prev, ...sessTitles as Record<string, string> }));
          }
        });
      }
      if (d?.tourId) {
        import('@/lib/api/appsync-client').then(({ getGuideTourById }) => {
          getGuideTourById(d.tourId).then((tour) => {
            let descs = (tour as Record<string, unknown>)?.translatedDescriptions;
            if (typeof descs === 'string') { try { descs = JSON.parse(descs); } catch { descs = null; } }
            if (descs && typeof descs === 'object') {
              setTranslatedDescriptions((prev) => ({ ...prev, ...descs as Record<string, string> }));
            }
          });
        });
      }

      // Load language purchases and segments for the tour preview
      if (d?.sessionId) {
        listLanguagePurchases(d.sessionId).then((result) => {
          if (result.ok) {
            setLanguagePurchases(result.value);
          }
        });

        // Load segments for all scenes (for translated content)
        console.log('[ModerationDetail] Loading segments for', d.scenes.length, 'scenes, sessionId:', d.sessionId, 'activePreviewLang:', initialLang);
        if (d.scenes.length > 0) {
          setLoadingSegments(true);
          Promise.all(
            d.scenes.map(async (scene) => {
              try {
                const segments = await listSegmentsByScene(scene.id);
                console.log('[ModerationDetail] Scene', scene.id, '→', segments.length, 'segments', segments.map((s) => s.language));
                return { sceneId: scene.id, segments };
              } catch (err) {
                console.error('[ModerationDetail] Failed to load segments for', scene.id, err);
                return { sceneId: scene.id, segments: [] };
              }
            }),
          ).then((results) => {
            const map: Record<string, SceneSegment[]> = {};
            for (const r of results) {
              map[r.sceneId] = r.segments;
            }
            // Debug: log loaded segments
            const totalSegs = Object.values(map).flat();
            const langs = [...new Set(totalSegs.map((s) => s.language))];
            console.log('[ModerationDetail] Segments loaded:', {
              scenes: Object.keys(map).length,
              totalSegments: totalSegs.length,
              languages: langs,
              sample: totalSegs[0] ? { id: totalSegs[0].id, lang: totalSegs[0].language, hasText: !!totalSegs[0].transcriptText, hasAudio: !!totalSegs[0].audioKey } : 'none',
            });
            setSegmentsByScene(map);
            setLoadingSegments(false);
          });
        }
      }
    });
    trackEvent(AdminAnalyticsEvents.ADMIN_MODERATION_REVIEW_START, { moderation_id: moderationId });
  }, [moderationId]);

  useEffect(() => {
    const interval = setInterval(() => setElapsedMinutes(Math.round((Date.now() - reviewStartTime) / 60000)), 60000);
    return () => clearInterval(interval);
  }, [reviewStartTime]);

  const allChecked = checklist.every((item) => item.checked);
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
    if (!allChecked || !detail) return;
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
        .catch(() => console.warn('[Notification] Failed to notify guide on validate'));
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
        .catch(() => console.warn('[Notification] Failed to notify guide on reject'));
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
        .catch(() => console.warn('[Notification] Failed to notify guide on revision'));
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

  /** Get available translation languages from segments */
  const availableLanguages = (() => {
    const langs = new Set<string>();
    for (const segments of Object.values(segmentsByScene)) {
      for (const seg of segments) {
        if (seg.language) langs.add(seg.language);
      }
    }
    // Also add languages from purchases
    for (const p of languagePurchases) {
      langs.add(p.language);
    }
    return Array.from(langs).sort();
  })();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Item de moderation introuvable.</p>
        <Link href="/admin/moderation" className="text-red-600 hover:underline mt-4 inline-block">
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
          <p className="text-xl font-semibold text-gray-900">{successMessage}</p>
          <p className="text-sm text-gray-500 mt-2">Redirection vers la file d&apos;attente...</p>
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
          <Link href="/admin/moderation" className="text-sm text-gray-500 hover:text-red-600">
            ← Retour a la file d&apos;attente
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-xl font-bold text-gray-900">
              {(activePreviewLang !== detail.languePrincipale && translatedTitles[activePreviewLang]) ? translatedTitles[activePreviewLang] : detail.tourTitle}
            </h1>
            {detail.languePrincipale && (
              <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded">
                {LANG_FLAGS[detail.languePrincipale] ?? detail.languePrincipale}
              </span>
            )}
            {detail.themes.length > 0 && detail.themes.map((t) => (
              <span key={t} className="bg-teal-50 text-teal-700 text-xs px-2 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">En revue depuis {elapsedMinutes} min</span>
          {prevId && (
            <Link href={`/admin/moderation/${prevId}`} className="text-sm text-gray-500 hover:text-red-600">
              ← Precedent
            </Link>
          )}
          {nextId && (
            <Link href={`/admin/moderation/${nextId}`} className="text-sm text-gray-500 hover:text-red-600">
              Suivant →
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guide profile summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-bold text-lg">
                {detail.guideName.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">
                  {detail.guideName}
                  {detail.isFirstSubmission && (
                    <span className="ml-2 bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                      Nouveau guide
                    </span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {detail.city} &middot; {detail.guideSubmissionCount} soumissions &middot; {detail.guideApprovalRate}% approuve
                  {detail.guideTourCount > 0 && <> &middot; {detail.guideTourCount} parcours</>}
                </p>
                {detail.guideBio && (
                  <p className="text-xs text-gray-400 mt-1">{detail.guideBio}</p>
                )}
                {detail.guideLanguages.length > 0 && (
                  <p className="text-xs text-gray-400 mt-0.5">Langues: {detail.guideLanguages.join(', ')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Legacy admin comments */}
          {globalComments.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-orange-800 mb-2">Commentaires admin existants</p>
              {globalComments.map((c) => (
                <div key={c.id} className="text-sm text-orange-700 mb-1">
                  <span className="font-medium">{c.reviewerName}</span> — {c.comment}
                  <span className="text-xs text-orange-500 ml-2">{new Date(c.date).toLocaleDateString('fr-FR')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Comment thread */}
          <TourCommentThread tourId={detail.tourId} role="admin" authorName="Admin" sessionId={detail.sessionId} />

          {/* When examining a translated language: side-by-side comparison view */}
          {activePreviewLang !== detail.languePrincipale ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2">
                <span className="text-lg">{LANG_FLAGS[activePreviewLang] ?? ''}</span>
                <span className="text-sm font-medium text-teal-800">
                  Comparaison {detail.languePrincipale.toUpperCase()} / {activePreviewLang.toUpperCase()}
                </span>
              </div>

              {/* Description: FR vs translated */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-semibold text-gray-400 mb-2">Description ({detail.languePrincipale.toUpperCase()})</h3>
                  <p className="text-sm text-gray-600">{detail.descriptionLongue || detail.description}</p>
                </div>
                <div className="bg-white rounded-xl border border-teal-200 p-4">
                  <h3 className="text-sm font-semibold text-teal-700 mb-2">Description ({activePreviewLang.toUpperCase()})</h3>
                  <p className="text-sm text-gray-800">
                    {translatedDescriptions[activePreviewLang] || <span className="italic text-orange-500">Non traduite</span>}
                  </p>
                </div>
              </div>

              {/* Scenes: FR left / translated right — stacked per scene */}
              <h3 className="text-lg font-semibold text-gray-900">Scènes ({detail.scenes.length})</h3>
              {loadingSegments ? (
                <p className="text-sm text-gray-400 animate-pulse">Chargement...</p>
              ) : (
              <div className="space-y-4">
                {detail.scenes.map((scene) => {
                  const langSegs = (segmentsByScene[scene.id] ?? []).filter((s) => s.language === activePreviewLang);
                  const seg = langSegs[0];
                  const displayTitle = seg?.translatedTitle || scene.title;
                  const displayText = seg?.transcriptText ?? null;
                  const displayAudio = seg?.audioKey || null;

                  return (
                    <div key={scene.id} className="grid grid-cols-1 lg:grid-cols-2 gap-3 border border-gray-200 rounded-xl overflow-hidden" data-testid={`tourist-scene-${scene.id}`}>
                      {/* FR source (left) */}
                      <div className="p-4 bg-gray-50">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-xs font-bold">{scene.order}</span>
                          <p className="font-medium text-gray-600 text-sm">{scene.title}</p>
                          <span className="text-[10px] text-gray-400 ml-auto">{detail.languePrincipale.toUpperCase()}</span>
                        </div>
                        {scene.audioRef && (
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              onClick={() => handlePlayAudio(`${scene.id}-fr`, scene.audioRef)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${playingSceneId === `${scene.id}-fr` ? 'bg-red-600 text-white' : 'bg-gray-400 text-white hover:bg-gray-500'}`}
                            >
                              {playingSceneId === `${scene.id}-fr` ? '\u23F8' : '\u25B6'}
                            </button>
                            <span className="text-[10px] text-gray-400">{detail.languePrincipale.toUpperCase()}</span>
                          </div>
                        )}
                        <p className="text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">{scene.transcriptText ?? 'Aucun texte'}</p>
                      </div>
                      {/* Translated (right) */}
                      <div className="p-4 bg-white">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center text-xs font-bold">{scene.order}</span>
                          <p className="font-medium text-gray-900 text-sm">{displayTitle}</p>
                          <span className={`text-[10px] ml-auto px-1.5 py-0.5 rounded ${seg ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
                            {seg ? `${activePreviewLang.toUpperCase()} OK` : `${activePreviewLang.toUpperCase()} manquant`}
                          </span>
                        </div>
                        {displayAudio && (
                          <div className="flex items-center gap-2 mb-2">
                            <button
                              onClick={() => handlePlayAudio(scene.id, displayAudio)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${playingSceneId === scene.id ? 'bg-red-600 text-white' : 'bg-teal-600 text-white hover:bg-teal-700'}`}
                              data-testid={`play-audio-${scene.id}`}
                            >
                              {playingSceneId === scene.id ? '\u23F8' : '\u25B6'}
                            </button>
                            <span className="text-[10px] text-teal-600">{activePreviewLang.toUpperCase()}</span>
                          </div>
                        )}
                        {displayText ? (
                          <p className="text-xs text-gray-800 leading-relaxed">{displayText}</p>
                        ) : (
                          <p className="text-xs text-orange-500 italic">Traduction non disponible</p>
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
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
            {(['tourist', 'overview', 'scenes', 'pois'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveContentTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeContentTab === tab
                    ? 'bg-white text-red-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'tourist' ? '👁 Aperçu touriste' : tab === 'overview' ? 'Général' : tab === 'scenes' ? `Scènes (${detail.scenes.length})` : `POIs (${detail.scenes.filter((s) => s.latitude).length}/${detail.scenes.length})`}
              </button>
            ))}
          </div>
          </>
          )}

          {/* Tourist preview tab — mirrors catalogue experience */}
          {activeContentTab === 'tourist' && (
            <div className="space-y-6">
              {/* Hero + Cover Photo + Title — like catalogue tour detail */}
              <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-xl overflow-hidden text-white">
                {detail.heroImageUrl && (
                  <div className="relative h-48 w-full">
                    <S3Image s3Key={detail.heroImageUrl} alt={`Couverture: ${detail.tourTitle}`} className="w-full h-full object-cover" fallback="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-teal-900/80 to-transparent" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-green-400 text-green-900 text-xs font-bold px-2 py-0.5 rounded">GRATUIT</span>
                    <span className="bg-white/30 text-white text-xs font-bold px-2 py-0.5 rounded">
                      {LANG_FLAGS[activePreviewLang] ?? ''} {activePreviewLang.toUpperCase()}
                    </span>
                    {detail.themes.map((t) => (
                      <span key={t} className="bg-white/20 text-white text-xs px-2 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                  <h2 className="text-2xl font-bold mb-1">
                    {(activePreviewLang !== detail.languePrincipale && translatedTitles[activePreviewLang]) ? translatedTitles[activePreviewLang] : detail.tourTitle}
                  </h2>
                  <p className="text-teal-200 text-sm">
                    {detail.city} &middot; {detail.duration} min &middot; {detail.distance} km &middot; {detail.poiCount} points d&apos;interet
                    &middot; Difficulte : {detail.difficulty}
                  </p>
                </div>
              </div>

              {/* Guide card — like catalogue */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-14 h-14 bg-teal-200 rounded-full flex items-center justify-center text-teal-800 font-bold text-xl flex-shrink-0">
                  {detail.guideName.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{detail.guideName}</p>
                  <p className="text-sm text-gray-500">Guide local &middot; {detail.city}</p>
                  {detail.guideBio && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{detail.guideBio}</p>}
                  {detail.guideLanguages.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5">Langues : {detail.guideLanguages.join(', ')}</p>
                  )}
                </div>
              </div>

              {/* Description — shows translated version when available */}
              {(detail.descriptionLongue || detail.description) && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    À propos de cette visite ({activePreviewLang.toUpperCase()})
                  </h3>
                  {activePreviewLang !== detail.languePrincipale && translatedDescriptions[activePreviewLang] ? (
                    <>
                      <p className="text-gray-700 leading-relaxed">{translatedDescriptions[activePreviewLang]}</p>
                      <details className="mt-2">
                        <summary className="text-xs text-gray-400 cursor-pointer">Voir original (FR)</summary>
                        <p className="text-sm text-gray-400 mt-1 italic">{detail.descriptionLongue || detail.description}</p>
                      </details>
                    </>
                  ) : (
                    <>
                      <p className="text-gray-700 leading-relaxed">{detail.descriptionLongue || detail.description}</p>
                      {activePreviewLang !== detail.languePrincipale && (
                        <p className="text-xs text-orange-500 mt-2">Description non traduite en {activePreviewLang.toUpperCase()} — affichage de l&apos;original</p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Interactive map — like catalogue TourMap */}
              {detail.scenes.some((s) => s.latitude && s.longitude) && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <h3 className="text-lg font-semibold text-gray-900 p-4 pb-0">Itinéraire</h3>
                  <div className="h-80">
                    <TourMap
                      pois={detail.scenes
                        .filter((s) => s.latitude && s.longitude)
                        .map((s) => ({
                          id: s.id,
                          order: s.order,
                          title: s.title,
                          latitude: s.latitude!,
                          longitude: s.longitude!,
                        }))}
                      selectedPoiId={null}
                      onPoiSelect={() => {}}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              )}

              {/* Unified scene review — one card per scene with text + audio + photos */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Scenes ({detail.scenes.length}) — {activePreviewLang.toUpperCase()}
                </h3>
                {/* Diagnostic — shows segment state per scene */}
                <details className="text-[10px] text-gray-400 mb-2 border border-dashed border-gray-200 rounded p-2">
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
                  <p className="text-sm text-gray-400 animate-pulse">Chargement des segments...</p>
                ) : (
                <div className="space-y-4">
                  {detail.scenes.map((scene) => {
                    const isSourceLang = activePreviewLang === detail.languePrincipale;
                    const allSegsForScene = segmentsByScene[scene.id] ?? [];
                    const langSegs = allSegsForScene.filter((s) => s.language === activePreviewLang);
                    const seg = langSegs[0];

                    // Resolve content for active language
                    const displayTitle = isSourceLang ? scene.title : (seg?.translatedTitle || scene.title);
                    const displayText = isSourceLang ? (scene.transcriptText ?? null) : (seg?.transcriptText ?? null);
                    const displayAudio = isSourceLang ? scene.audioRef : (seg?.audioKey || null);
                    const hasTranslation = !isSourceLang && seg != null;

                    // --- Temporary debug per scene ---
                    if (typeof window !== 'undefined') {
                      console.log(`[Scene ${scene.order}] id=${scene.id}, allSegs=${allSegsForScene.length}, langSegs(${activePreviewLang})=${langSegs.length}, seg?.lang=${seg?.language}, hasText=${!!seg?.transcriptText}, hasAudio=${!!seg?.audioKey}`);
                    }

                    return (
                      <div
                        key={scene.id}
                        className={`border rounded-xl p-4 ${!isSourceLang && !hasTranslation ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}
                        data-testid={`tourist-scene-${scene.id}`}
                      >
                        {/* Header: number + title + language badge */}
                        <div className="flex items-center gap-3 mb-3">
                          <span className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {scene.order}
                          </span>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{displayTitle}</p>
                            {!isSourceLang && scene.title !== displayTitle && (
                              <p className="text-xs text-gray-400 italic">FR: {scene.title}</p>
                            )}
                          </div>
                          {!isSourceLang && (
                            <span className={`text-xs px-2 py-0.5 rounded-full ${hasTranslation ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'}`}>
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
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-teal-600 text-white hover:bg-teal-700'
                                }`}
                                data-testid={`play-audio-${scene.id}`}
                              >
                                {playingSceneId === scene.id ? '\u23F8' : '\u25B6'}
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                                —
                              </div>
                            )}
                            {displayAudio && (
                              <p className="text-[10px] text-gray-400 mt-2.5">
                                {activePreviewLang.toUpperCase()}
                                {formatDuration(scene.durationSeconds) ? ` ${formatDuration(scene.durationSeconds)}` : ''}
                              </p>
                            )}
                          </div>

                          {/* Narration text */}
                          <div className="bg-gray-50 rounded-lg p-3 min-h-[60px]">
                            {displayText ? (
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{displayText}</p>
                            ) : !isSourceLang ? (
                              <p className="text-sm text-orange-500 italic">Traduction non disponible</p>
                            ) : (
                              <p className="text-sm text-gray-400 italic">Aucun texte</p>
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
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
                <h3 className="text-lg font-bold text-teal-900 mb-3">Vivez cette visite</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-teal-700">{detail.duration}</p>
                    <p className="text-xs text-teal-600">minutes</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-teal-700">{detail.distance}</p>
                    <p className="text-xs text-teal-600">km</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-teal-700">{detail.poiCount}</p>
                    <p className="text-xs text-teal-600">points d&apos;intérêt</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-teal-700">{detail.difficulty}</p>
                    <p className="text-xs text-teal-600">difficulté</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <div className="flex-1 bg-gray-900 text-white text-center py-2.5 rounded-lg text-sm font-medium opacity-50">
                    Android (preview)
                  </div>
                  <div className="flex-1 bg-gray-900 text-white text-center py-2.5 rounded-lg text-sm font-medium opacity-50">
                    iOS (preview)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overview tab */}
          {activeContentTab === 'overview' && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
              {detail.descriptionLongue ? (
                <>
                  <h2 className="text-lg font-semibold text-gray-900">Description ({activePreviewLang.toUpperCase()})</h2>
                  <p className="text-gray-700">
                    {(activePreviewLang !== detail.languePrincipale && translatedDescriptions[activePreviewLang])
                      ? translatedDescriptions[activePreviewLang]
                      : detail.descriptionLongue}
                  </p>
                  {activePreviewLang !== detail.languePrincipale && !translatedDescriptions[activePreviewLang] && (
                    <p className="text-xs text-orange-500 mt-1">Non traduite en {activePreviewLang.toUpperCase()}</p>
                  )}
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-900">Description</h2>
                  <p className="text-gray-700">{detail.description}</p>
                </>
              )}
              <div className="flex gap-4 text-sm text-gray-500">
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
                    <span key={theme} className="text-xs font-medium bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full border border-teal-200">
                      {theme}
                    </span>
                  ))}
                </div>
              )}

              {/* Map */}
              {detail.scenes.some((s) => s.latitude && s.longitude) && (
                <div className="rounded-lg overflow-hidden border border-gray-200">
                  <PreviewMap scenes={detail.scenes.map((s) => ({
                    id: s.id,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    title: s.title,
                    sceneIndex: s.order - 1,
                  } as import('@/types/studio').StudioScene))} />
                </div>
              )}
            </div>
          )}

          {/* Scenes tab */}
          {activeContentTab === 'scenes' && (
            <div className="space-y-4">
              {sortedScenes.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-gray-200">
                  <p>Aucune scene disponible</p>
                </div>
              ) : (
                sortedScenes.map((scene) => {
                  const sceneComments = getSceneComments(scene.id);
                  // Resolve content for active language
                  const isSourceLang = activePreviewLang === detail.languePrincipale;
                  const sceneLangSegs = (segmentsByScene[scene.id] ?? []).filter((s) => s.language === activePreviewLang);
                  const sceneSeg = sceneLangSegs[0];
                  const sceneDisplayTitle = isSourceLang ? scene.title : (sceneSeg?.translatedTitle ?? scene.title);
                  const sceneDisplayAudio = isSourceLang ? scene.audioRef : (sceneSeg?.audioKey ?? scene.audioRef);
                  return (
                    <div key={scene.id} className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-bold">
                          {scene.order}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{sceneDisplayTitle}</h3>
                          <p className="text-xs text-gray-500">
                            {sceneDisplayAudio ? (formatDuration(scene.durationSeconds) || 'Audio') : 'Pas d\'audio'}
                            {' \u00b7 '}
                            {scene.photosRefs.length} photo{scene.photosRefs.length !== 1 ? 's' : ''}
                            {!isSourceLang && <span className="ml-1 text-teal-600">({activePreviewLang.toUpperCase()})</span>}
                          </p>
                        </div>
                      </div>

                      {/* Audio player — uses translated audio when available */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
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
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${sceneDisplayAudio ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                          >
                            {playingSceneId === scene.id ? '⏸' : '▶'}
                          </button>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: playingSceneId === scene.id ? '45%' : '0%' }} />
                          </div>
                          {formatDuration(scene.durationSeconds) && <span className="text-xs text-gray-500">{formatDuration(scene.durationSeconds)}</span>}
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
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-2">
                          <p className="text-xs font-semibold text-orange-800 mb-1">Commentaires</p>
                          {sceneComments.map((c) => (
                            <p key={c.id} className="text-sm text-orange-700">
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
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Points d&apos;intérêt</h2>

              {/* Map */}
              {detail.scenes.some((s) => s.latitude && s.longitude) && (
                <div className="rounded-lg overflow-hidden border border-gray-200 mb-4">
                  <PreviewMap scenes={detail.scenes.map((s) => ({
                    id: s.id,
                    latitude: s.latitude,
                    longitude: s.longitude,
                    title: s.title,
                    sceneIndex: s.order - 1,
                    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
                  } as import("@/types/studio").StudioScene))} />
                </div>
              )}

              <div className="space-y-4">
                {detail.scenes.map((scene) => (
                  <div key={scene.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-6 h-6 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-xs font-bold">
                        {scene.order}
                      </span>
                      <h3 className="font-medium text-gray-900">{scene.title}</h3>
                      {scene.latitude && scene.longitude && (
                        <span className="text-xs text-gray-400 ml-auto">
                          📍 {scene.latitude.toFixed(4)}, {scene.longitude.toFixed(4)}
                        </span>
                      )}
                      {!scene.latitude && (
                        <span className="text-xs text-amber-500 ml-auto">⚠ Pas de GPS</span>
                      )}
                    </div>
                    {scene.poiDescription && (
                      <p className="text-sm text-gray-600 mb-2">{scene.poiDescription}</p>
                    )}
                    {scene.transcriptText && (
                      <div className="bg-gray-50 rounded p-2 mb-2">
                        <p className="text-xs font-medium text-gray-400 mb-1">Texte transcrit</p>
                        <p className="text-sm text-gray-700 line-clamp-3">{scene.transcriptText}</p>
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
          <div className="sticky top-24 space-y-4">
            {/* Quality Checklist */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklist qualite</h2>
              <div className="space-y-3">
                {checklist.map((item) => (
                  <div key={item.id}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-500">{item.description}</p>
                      </div>
                    </label>
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => updateChecklistNote(item.id, e.target.value)}
                      placeholder="Note (optionnel)"
                      className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1 text-gray-600"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes generales</label>
                <textarea
                  value={overallNotes}
                  onChange={(e) => setOverallNotes(e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 text-gray-700"
                  placeholder="Observations supplementaires..."
                />
              </div>
            </div>

            {/* Error display */}
            {errorMessage && (
              <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm" role="alert">
                {errorMessage}
              </div>
            )}

            {/* 4 Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              {/* Validate */}
              <button
                onClick={handleApprove}
                disabled={!allChecked || submitting}
                data-testid="approve-btn"
                className="w-full bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'En cours...' : 'Valider et publier'}
              </button>
              {!allChecked && (
                <p className="text-xs text-gray-400 text-center">
                  Cochez tous les items de la checklist pour valider
                </p>
              )}

              {/* Comment */}
              <button
                onClick={() => { setShowCommentForm(!showCommentForm); setShowRevisionForm(false); setShowRejectForm(false); }}
                disabled={submitting}
                className="w-full border border-teal-300 text-teal-700 font-bold py-3 rounded-xl hover:bg-teal-50 disabled:opacity-50"
              >
                Commenter
              </button>

              {/* Send back for revision */}
              <button
                onClick={() => { setShowRevisionForm(!showRevisionForm); setShowCommentForm(false); setShowRejectForm(false); }}
                disabled={submitting}
                data-testid="revision-btn"
                className="w-full border border-orange-300 text-orange-700 font-bold py-3 rounded-xl hover:bg-orange-50 disabled:opacity-50"
              >
                Renvoyer au guide
              </button>

              {/* Reject */}
              <button
                onClick={() => { setShowRejectForm(!showRejectForm); setShowCommentForm(false); setShowRevisionForm(false); }}
                disabled={submitting}
                className="w-full border border-red-300 text-red-600 font-bold py-3 rounded-xl hover:bg-red-50 disabled:opacity-50"
              >
                Refuser
              </button>
            </div>

            {/* Comment Form */}
            {showCommentForm && (
              <div className="bg-white rounded-xl border border-teal-200 p-4">
                <h3 className="text-sm font-semibold text-teal-700 mb-3">Ajouter un commentaire</h3>
                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Scene (optionnel)</label>
                  <select
                    value={commentSceneId}
                    onChange={(e) => setCommentSceneId(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
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
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
                    placeholder="Votre commentaire..."
                  />
                </div>
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim() || submitting}
                  className="w-full bg-teal-700 text-white font-bold py-2 rounded-xl hover:bg-teal-800 disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Envoi...' : 'Envoyer le commentaire'}
                </button>
              </div>
            )}

            {/* Revision Form */}
            {showRevisionForm && (
              <div className="bg-white rounded-xl border border-orange-200 p-4">
                <h3 className="text-sm font-semibold text-orange-700 mb-3">Renvoyer au guide pour corrections</h3>
                <div className="mb-3">
                  <textarea
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                    rows={4}
                    data-testid="feedback-input"
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
                    placeholder="Preciser les corrections attendues (min. 10 caracteres)..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {revisionFeedback.length}/10 caracteres minimum
                  </p>
                </div>
                <button
                  onClick={handleSendRevision}
                  disabled={revisionFeedback.length < 10 || submitting}
                  className="w-full bg-orange-600 text-white font-bold py-2 rounded-xl hover:bg-orange-700 disabled:opacity-50 text-sm"
                >
                  {submitting ? 'Envoi...' : 'Renvoyer au guide'}
                </button>
              </div>
            )}

            {/* Reject Form */}
            {showRejectForm && (
              <div className="bg-white rounded-xl border border-red-200 p-4">
                <h3 className="text-sm font-semibold text-red-700 mb-3">Refuser le parcours</h3>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Categorie</label>
                  <select
                    value={rejectCategory}
                    onChange={(e) => setRejectCategory(e.target.value as RejectionCategory)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
                  >
                    {REJECTION_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Feedback (min. 20 caracteres)
                  </label>
                  <textarea
                    value={rejectFeedback}
                    onChange={(e) => setRejectFeedback(e.target.value)}
                    rows={4}
                    className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 text-gray-700"
                    placeholder="Soyez precis pour aider le guide a ameliorer..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {rejectFeedback.length}/20 caracteres minimum
                  </p>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    POIs concernes (optionnel)
                  </label>
                  <div className="space-y-1">
                    {detail.pois.map((poi) => (
                      <label key={poi.id} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={rejectPoiIds.includes(poi.id)}
                          onChange={() => toggleRejectPoi(poi.id)}
                          className="h-3 w-3 rounded border-gray-300 text-red-600"
                        />
                        <span className="text-gray-700">{poi.order}. {poi.title}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleReject}
                  disabled={rejectFeedback.length < 20 || submitting}
                  className="w-full bg-red-600 text-white font-bold py-2 rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
