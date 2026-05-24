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
  loading: () => <div className="bg-paper-deep rounded-lg h-64 animate-pulse" />,
});

const LANG_FLAGS: Record<string, string> = {
  fr: 'FR', en: 'EN', es: 'ES', it: 'IT', de: 'DE',
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'bg-paper-deep text-ink-80' },
  synced: { label: 'Transf\u00e9r\u00e9', className: 'bg-mer-soft text-mer' },
  editing: { label: 'En cours d\u2019\u00e9dition', className: 'bg-mer-soft text-mer' },
  recording: { label: 'Enregistrement', className: 'bg-mer-soft text-mer' },
  ready: { label: 'Pr\u00eat', className: 'bg-olive-soft text-olive' },
  submitted: { label: 'Soumis', className: 'bg-ocre-soft text-ocre' },
  review: { label: 'En revue', className: 'bg-ocre-soft text-ocre' },
  pending_moderation: { label: 'En mod\u00e9ration', className: 'bg-ocre-soft text-ocre' },
  published: { label: 'Publi\u00e9', className: 'bg-olive-soft text-olive' },
  revision_requested: { label: 'R\u00e9vision demand\u00e9e', className: 'bg-ocre-soft text-ocre' },
  rejected: { label: 'Rejet\u00e9', className: 'bg-grenadine-soft text-danger' },
  archived: { label: 'Archiv\u00e9', className: 'bg-paper-deep text-ink-60' },
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
          <div className="bg-paper-deep rounded-md h-40 animate-pulse" />
          <div className="bg-paper-deep rounded-md h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="p-6">
        <Link href="/admin/tours" className="text-sm text-danger hover:underline mb-4 inline-block">&larr; Retour aux parcours</Link>
        <div className="bg-grenadine-soft border border-grenadine rounded-lg p-4 text-danger">Parcours introuvable.</div>
      </div>
    );
  }

  const badge = STATUS_BADGES[tour.status] ?? STATUS_BADGES.draft;
  const geoScenes = scenes.filter((s) => s.latitude && s.longitude);

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/admin/tours" className="text-sm text-danger hover:underline mb-4 inline-block">&larr; Retour aux parcours</Link>

      {/* Status + admin info bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-xs font-medium px-3 py-1 rounded-full ${badge.className}`}>{badge.label}</span>
        <span className="text-xs text-ink-40">ID: {tour.id.slice(0, 8)}...</span>
      </div>

      {/* ===== TOURIST PREVIEW ===== */}

      {/* Hero */}
      <div className="bg-grenadine rounded-md p-6 text-white mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-olive text-olive text-xs font-bold px-2 py-0.5 rounded">GRATUIT</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">{tour.title}</h1>
        <p className="text-grenadine-soft text-sm">
          {tour.city} &middot; {tour.duration} min &middot; {tour.distance} km &middot; {scenes.length} points d&apos;intérêt
        </p>
      </div>

      {/* Guide card */}
      {guide && (
        <div className="bg-card rounded-md border border-line p-4 flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-grenadine-soft rounded-full flex items-center justify-center text-grenadine font-bold text-xl flex-shrink-0">
            {guide.displayName.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-ink">{guide.displayName}</p>
            <p className="text-sm text-ink-60">Guide local &middot; {guide.city}</p>
            {guide.bio && <p className="text-xs text-ink-40 mt-1 line-clamp-2">{guide.bio}</p>}
            {guide.languages.length > 0 && (
              <p className="text-xs text-ink-40 mt-0.5">Langues : {guide.languages.join(', ')}</p>
            )}
          </div>
        </div>
      )}

      {/* Description */}
      {tour.description && (
        <div className="bg-card rounded-md border border-line p-5 mb-6">
          <h2 className="text-lg font-semibold text-ink mb-2">À propos de cette visite</h2>
          <p className="text-ink-80 leading-relaxed">{tour.description}</p>
        </div>
      )}

      {/* Map */}
      {geoScenes.length > 0 && (
        <div className="bg-card rounded-md border border-line overflow-hidden mb-6">
          <h2 className="text-lg font-semibold text-ink p-4 pb-0">Itinéraire</h2>
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
        <div className="bg-card rounded-md border border-line p-5 mb-6">
          <h2 className="text-lg font-semibold text-ink mb-4">Points d&apos;intérêt ({scenes.length})</h2>
          <div className="space-y-4">
            {scenes.map((scene) => (
              <div key={scene.id} className="flex gap-4 pb-4 border-b border-line last:border-0 last:pb-0">
                <div className="w-8 h-8 bg-grenadine text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">
                  {scene.order}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-ink">{scene.title}</p>
                  {scene.poiDescription && <p className="text-sm text-ink-60 mt-0.5">{scene.poiDescription}</p>}
                  {scene.latitude && scene.longitude && (
                    <p className="text-xs text-ink-40 mt-0.5">📍 {scene.latitude.toFixed(4)}, {scene.longitude.toFixed(4)}</p>
                  )}
                  {scene.transcriptText && (
                    <p className="text-sm text-ink-60 mt-1 italic line-clamp-3">&ldquo;{scene.transcriptText}&rdquo;</p>
                  )}
                  {scene.photosRefs.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {scene.photosRefs.map((ref, i) => (
                        <S3Image key={i} s3Key={ref} alt={`${scene.title} photo ${i + 1}`} className="w-24 h-20 rounded-lg" fallback={`📷 ${i + 1}`} />
                      ))}
                    </div>
                  )}
                  {scene.audioRef && <p className="text-xs text-grenadine mt-1">🎵 Audio disponible</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scenes.length === 0 && (
        <div className="bg-paper-soft rounded-md border border-line p-8 text-center text-ink-60 mb-6">
          Aucune scène associée à ce parcours.
        </div>
      )}

      {/* Stats card */}
      <div className="bg-grenadine-soft border border-grenadine rounded-md p-5">
        <h2 className="text-lg font-bold text-grenadine mb-3">Vivez cette visite</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-2xl font-bold text-grenadine">{tour.duration}</p>
            <p className="text-xs text-grenadine">minutes</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-grenadine">{tour.distance}</p>
            <p className="text-xs text-grenadine">km</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-grenadine">{scenes.length}</p>
            <p className="text-xs text-grenadine">points d&apos;intérêt</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-grenadine">Gratuit</p>
            <p className="text-xs text-grenadine">prix</p>
          </div>
        </div>
      </div>
    </div>
  );
}
