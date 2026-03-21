'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ModerationReviewPage() {
  const router = useRouter();
  const params = useParams();
  const moderationId = params.moderationId as string;

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
  const [activeContentTab, setActiveContentTab] = useState<'overview' | 'scenes' | 'pois' | 'tourist'>('overview');

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
            <h1 className="text-xl font-bold text-gray-900">{detail.tourTitle}</h1>
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

          {/* Existing admin comments */}
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

          {/* Content tabs */}
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

          {/* Tourist preview tab — mirrors catalogue experience */}
          {activeContentTab === 'tourist' && (
            <div className="space-y-6">
              {/* Hero + Title — like catalogue tour detail */}
              <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-xl p-6 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-green-400 text-green-900 text-xs font-bold px-2 py-0.5 rounded">GRATUIT</span>
                  {detail.themes.map((t) => (
                    <span key={t} className="bg-white/20 text-white text-xs px-2 py-0.5 rounded">{t}</span>
                  ))}
                </div>
                <h2 className="text-2xl font-bold mb-1">{detail.tourTitle}</h2>
                <p className="text-teal-200 text-sm">
                  {detail.city} &middot; {detail.duration} min &middot; {detail.distance} km &middot; {detail.poiCount} points d&apos;intérêt
                  &middot; Difficulté : {detail.difficulty} &middot; {LANG_FLAGS[detail.languePrincipale] ?? detail.languePrincipale}
                </p>
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

              {/* Description — like catalogue */}
              {(detail.descriptionLongue || detail.description) && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">À propos de cette visite</h3>
                  <p className="text-gray-700 leading-relaxed">{detail.descriptionLongue || detail.description}</p>
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

              {/* POIs list — like catalogue */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Points d&apos;intérêt</h3>
                <div className="space-y-4">
                  {detail.scenes.map((scene) => (
                    <div key={scene.id} className="flex gap-4">
                      <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                        {scene.order}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{scene.title}</p>
                        {scene.poiDescription && (
                          <p className="text-sm text-gray-600 mt-0.5">{scene.poiDescription}</p>
                        )}
                        {scene.transcriptText && (
                          <p className="text-sm text-gray-500 mt-1 italic line-clamp-3">&ldquo;{scene.transcriptText}&rdquo;</p>
                        )}
                        {/* Photos */}
                        {scene.photosRefs.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {scene.photosRefs.map((ref, i) => (
                              <S3Image key={i} s3Key={ref} alt={`${scene.title} photo ${i + 1}`} className="w-24 h-20 rounded-lg" fallback={`📷 ${i + 1}`} />
                            ))}
                          </div>
                        )}
                        {/* Audio indicator */}
                        {scene.audioRef && (
                          <p className="text-xs text-teal-600 mt-1">🎵 Audio disponible</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
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
                  <h2 className="text-lg font-semibold text-gray-900">Description longue</h2>
                  <p className="text-gray-700">{detail.descriptionLongue}</p>
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
                  return (
                    <div key={scene.id} className="bg-white border border-gray-200 rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-bold">
                          {scene.order}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{scene.title}</h3>
                          <p className="text-xs text-gray-500">
                            {formatDuration(scene.durationSeconds)} &middot; {scene.photosRefs.length} photo{scene.photosRefs.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      {/* Audio player */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setPlayingSceneId(playingSceneId === scene.id ? null : scene.id)}
                            className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center text-sm hover:bg-red-700"
                          >
                            {playingSceneId === scene.id ? '⏸' : '▶'}
                          </button>
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div className="bg-red-500 h-2 rounded-full" style={{ width: playingSceneId === scene.id ? '45%' : '0%' }} />
                          </div>
                          <span className="text-xs text-gray-500">{formatDuration(scene.durationSeconds)}</span>
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
