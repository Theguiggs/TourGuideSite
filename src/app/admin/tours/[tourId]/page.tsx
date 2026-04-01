'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { S3Image } from '@/components/studio/s3-image';
import * as appsync from '@/lib/api/appsync-client';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AdminTourDetail';

const TourMap = dynamic(() => import('@/components/map/TourMap'), {
  ssr: false,
  loading: () => <div className="bg-gray-100 rounded-lg h-64 animate-pulse" />,
});

const LANG_FLAGS: Record<string, string> = {
  fr: 'FR', en: 'EN', es: 'ES', it: 'IT', de: 'DE',
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700' },
  synced: { label: 'Transf\u00e9r\u00e9', className: 'bg-indigo-100 text-indigo-700' },
  editing: { label: 'En cours d\u2019\u00e9dition', className: 'bg-blue-100 text-blue-700' },
  recording: { label: 'Enregistrement', className: 'bg-blue-100 text-blue-700' },
  ready: { label: 'Pr\u00eat', className: 'bg-green-100 text-green-700' },
  submitted: { label: 'Soumis', className: 'bg-yellow-100 text-yellow-700' },
  review: { label: 'En revue', className: 'bg-yellow-100 text-yellow-700' },
  pending_moderation: { label: 'En mod\u00e9ration', className: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Publi\u00e9', className: 'bg-green-200 text-green-800' },
  revision_requested: { label: 'R\u00e9vision demand\u00e9e', className: 'bg-orange-100 text-orange-700' },
  rejected: { label: 'Rejet\u00e9', className: 'bg-red-100 text-red-700' },
  archived: { label: 'Archiv\u00e9', className: 'bg-gray-200 text-gray-500' },
};

interface TourData {
  id: string;
  title: string;
  city: string;
  status: string;
  description: string | null;
  duration: number;
  distance: number;
  poiCount: number;
  guideId: string;
  sessionId: string | null;
}

interface SceneData {
  id: string;
  title: string;
  order: number;
  audioRef: string;
  photosRefs: string[];
  latitude: number | null;
  longitude: number | null;
  poiDescription: string | null;
  transcriptText: string | null;
}

interface GuideData {
  displayName: string;
  bio: string | null;
  city: string;
  languages: string[];
}

export default function AdminTourDetailPage() {
  const params = useParams<{ tourId: string }>();
  const tourId = params.tourId;

  const [tour, setTour] = useState<TourData | null>(null);
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tourId) return;
    let cancelled = false;

    async function load() {
      try {
        const tourData = await appsync.getGuideTourById(tourId);
        if (!tourData || cancelled) { setIsLoading(false); return; }
        const t = tourData as Record<string, unknown>;

        const tourInfo: TourData = {
          id: tourData.id,
          title: tourData.title,
          city: tourData.city,
          status: (tourData.status ?? 'draft') as string,
          description: (tourData.description ?? t.descriptionLongue as string) ?? null,
          duration: tourData.duration ?? 0,
          distance: tourData.distance ?? 0,
          poiCount: tourData.poiCount ?? 0,
          guideId: tourData.guideId,
          sessionId: (t.sessionId as string) ?? null,
        };
        if (cancelled) return;
        setTour(tourInfo);

        // Load guide + scenes in parallel
        const [profileData, scenesResult] = await Promise.all([
          appsync.getGuideProfileById(tourData.guideId, 'userPool'),
          tourInfo.sessionId
            ? appsync.listStudioScenesBySession(tourInfo.sessionId)
            : Promise.resolve({ ok: false as const, data: [], error: 'no session' }),
        ]);

        if (cancelled) return;

        if (profileData) {
          setGuide({
            displayName: profileData.displayName,
            bio: profileData.bio ?? null,
            city: profileData.city,
            languages: (profileData.languages as string[]) ?? [],
          });
        }

        if (scenesResult.ok) {
          setScenes(scenesResult.data.map((s: Record<string, unknown>) => {
            const raw = s as Record<string, unknown>;
            return {
              id: raw.id as string,
              title: (raw.title as string) || `Scène ${((raw.sceneIndex as number) ?? 0) + 1}`,
              order: ((raw.sceneIndex as number) ?? 0) + 1,
              audioRef: (raw.studioAudioKey as string) || (raw.originalAudioKey as string) || '',
              photosRefs: (raw.photosRefs as string[]) ?? [],
              latitude: (raw.latitude as number) ?? null,
              longitude: (raw.longitude as number) ?? null,
              poiDescription: (raw.poiDescription as string) ?? null,
              transcriptText: (raw.transcriptText as string) ?? null,
            };
          }));
        }
      } catch (e) {
        logger.error(SERVICE_NAME, 'Failed to load tour', { tourId, error: String(e) });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tourId]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-xl h-40 animate-pulse" />
          <div className="bg-gray-100 rounded-xl h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="p-6">
        <Link href="/admin/tours" className="text-sm text-red-600 hover:underline mb-4 inline-block">&larr; Retour aux parcours</Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">Parcours introuvable.</div>
      </div>
    );
  }

  const badge = STATUS_BADGES[tour.status] ?? STATUS_BADGES.draft;
  const geoScenes = scenes.filter((s) => s.latitude && s.longitude);

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/admin/tours" className="text-sm text-red-600 hover:underline mb-4 inline-block">&larr; Retour aux parcours</Link>

      {/* Status + admin info bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${badge.className}`}>{badge.label}</span>
        <span className="text-xs text-gray-400">ID: {tour.id.slice(0, 8)}...</span>
      </div>

      {/* ===== TOURIST PREVIEW ===== */}

      {/* Hero */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-900 rounded-xl p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-green-400 text-green-900 text-xs font-bold px-2 py-0.5 rounded">GRATUIT</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">{tour.title}</h1>
        <p className="text-teal-200 text-sm">
          {tour.city} &middot; {tour.duration} min &middot; {tour.distance} km &middot; {scenes.length} points d&apos;intérêt
        </p>
      </div>

      {/* Guide card */}
      {guide && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-teal-200 rounded-full flex items-center justify-center text-teal-800 font-bold text-xl flex-shrink-0">
            {guide.displayName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{guide.displayName}</p>
            <p className="text-sm text-gray-500">Guide local &middot; {guide.city}</p>
            {guide.bio && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{guide.bio}</p>}
            {guide.languages.length > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">Langues : {guide.languages.join(', ')}</p>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {tour.description && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">À propos de cette visite</h2>
          <p className="text-gray-700 leading-relaxed">{tour.description}</p>
        </div>
      )}

      {/* Map */}
      {geoScenes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
          <h2 className="text-lg font-semibold text-gray-900 p-4 pb-0">Itinéraire</h2>
          <div className="h-80">
            <TourMap
              pois={geoScenes.map((s) => ({
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

      {/* POIs / Scenes */}
      {scenes.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Points d&apos;intérêt ({scenes.length})</h2>
          <div className="space-y-4">
            {scenes.map((scene) => (
              <div key={scene.id} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {scene.order}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{scene.title}</p>
                  {scene.poiDescription && <p className="text-sm text-gray-600 mt-0.5">{scene.poiDescription}</p>}
                  {scene.latitude && scene.longitude && (
                    <p className="text-xs text-gray-400 mt-0.5">📍 {scene.latitude.toFixed(4)}, {scene.longitude.toFixed(4)}</p>
                  )}
                  {scene.transcriptText && (
                    <p className="text-sm text-gray-500 mt-1 italic line-clamp-3">&ldquo;{scene.transcriptText}&rdquo;</p>
                  )}
                  {scene.photosRefs.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {scene.photosRefs.map((ref, i) => (
                        <S3Image key={i} s3Key={ref} alt={`${scene.title} photo ${i + 1}`} className="w-24 h-20 rounded-lg" fallback={`📷 ${i + 1}`} />
                      ))}
                    </div>
                  )}
                  {scene.audioRef && <p className="text-xs text-teal-600 mt-1">🎵 Audio disponible</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scenes.length === 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center text-gray-500 mb-6">
          Aucune scène associée à ce parcours.
        </div>
      )}

      {/* Stats card */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
        <h2 className="text-lg font-bold text-teal-900 mb-3">Vivez cette visite</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-teal-700">{tour.duration}</p>
            <p className="text-xs text-teal-600">minutes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-teal-700">{tour.distance}</p>
            <p className="text-xs text-teal-600">km</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-teal-700">{scenes.length}</p>
            <p className="text-xs text-teal-600">points d&apos;intérêt</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-teal-700">Gratuit</p>
            <p className="text-xs text-teal-600">prix</p>
          </div>
        </div>
      </div>
    </div>
  );
}
