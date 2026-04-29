'use client';

import { useCallback, useState } from 'react';
import type { StudioScene } from '@/types/studio';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { S3Image } from '@/components/studio/s3-image';
import { AudioTrimmer } from './AudioTrimmer';
import { PhotoLightbox } from './PhotoLightbox';

const SERVICE_NAME = 'POICleanupPanel';

interface POICleanupPanelProps {
  scene: StudioScene;
  audioUrl: string | null;
  onChange: (sceneId: string, updates: Partial<StudioScene>) => void;
}

/**
 * Per-POI cleanup editor:
 * - name (title), description (poiDescription), notes (moderationFeedback)
 * - photo grid with hero radio + delete
 * - single audio trim (studioAudioKey or originalAudioKey)
 *
 * Emits local updates via onChange; parent is responsible for debounced AppSync save.
 */
export function POICleanupPanel({ scene, audioUrl, onChange }: POICleanupPanelProps) {
  const photos = scene.photosRefs;
  const heroPhoto = scene.heroPhotoRef ?? (photos.length > 0 ? photos[0] : null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const handleName = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(scene.id, { title: e.target.value });
  }, [scene.id, onChange]);

  const handleDescription = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(scene.id, { poiDescription: e.target.value });
  }, [scene.id, onChange]);

  const handleNotes = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(scene.id, { moderationFeedback: e.target.value });
  }, [scene.id, onChange]);

  const handleHeroSelect = useCallback((ref: string) => {
    onChange(scene.id, { heroPhotoRef: ref });
    logger.info(SERVICE_NAME, 'Hero photo selected', { sceneId: scene.id });
  }, [scene.id, onChange]);

  const handleDeletePhoto = useCallback((ref: string) => {
    const next = photos.filter((p) => p !== ref);
    const patch: Partial<StudioScene> = { photosRefs: next };
    if (scene.heroPhotoRef === ref) {
      patch.heroPhotoRef = next[0] ?? null;
    }
    onChange(scene.id, patch);
    logger.info(SERVICE_NAME, 'Photo deleted', { sceneId: scene.id });
  }, [scene.id, photos, scene.heroPhotoRef, onChange]);

  const handleTrim = useCallback((trimStart: number, trimEnd: number) => {
    onChange(scene.id, { trimStart, trimEnd });
  }, [scene.id, onChange]);

  const isStubPhoto = (ref: string) => shouldUseStubs() || ref.startsWith('/') || ref.startsWith('blob:') || ref.startsWith('http');

  return (
    <div className="space-y-4" data-testid="poi-cleanup-panel">
      <div>
        <label className="block text-xs font-medium text-ink-60 mb-1" htmlFor={`poi-name-${scene.id}`}>
          Nom du POI
        </label>
        <input
          id={`poi-name-${scene.id}`}
          type="text"
          value={scene.title ?? ''}
          onChange={handleName}
          data-testid="poi-name-input"
          placeholder="Nom du point d'intérêt"
          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-grenadine focus:ring-1 focus:ring-grenadine"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-60 mb-1" htmlFor={`poi-desc-${scene.id}`}>
          Description
        </label>
        <textarea
          id={`poi-desc-${scene.id}`}
          value={scene.poiDescription ?? ''}
          onChange={handleDescription}
          data-testid="poi-description-input"
          rows={3}
          placeholder="Description courte du POI (optionnel)"
          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-grenadine focus:ring-1 focus:ring-grenadine"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-ink-60">Photos ({photos.length})</span>
          <span className="text-[11px] text-ink-40">Hero = photo de couverture</span>
        </div>
        {photos.length === 0 ? (
          <div className="bg-paper-soft rounded-lg p-4 text-center text-sm text-ink-40" data-testid="poi-photos-empty">
            Aucune photo
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2" data-testid="poi-photos-grid">
            {photos.map((ref) => {
              const isHero = heroPhoto === ref;
              return (
                <div
                  key={ref}
                  className={`relative rounded-lg overflow-hidden border-2 bg-paper-soft ${isHero ? 'border-grenadine' : 'border-line'}`}
                  data-testid={`poi-photo-${isHero ? 'hero' : 'item'}`}
                >
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(ref)}
                    aria-label="Agrandir la photo"
                    data-testid="poi-photo-open"
                    className="block w-full aspect-square focus:outline-none focus:ring-2 focus:ring-grenadine"
                  >
                    {isStubPhoto(ref) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={ref} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <S3Image s3Key={ref} alt="" className="w-full h-full !object-contain" />
                    )}
                  </button>
                  <label
                    className="absolute top-1 left-1 bg-white/90 rounded-full px-1.5 py-0.5 text-[11px] font-medium cursor-pointer flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="radio"
                      name={`hero-${scene.id}`}
                      checked={isHero}
                      onChange={() => handleHeroSelect(ref)}
                      data-testid="poi-photo-hero-radio"
                      className="accent-grenadine"
                    />
                    Hero
                  </label>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(ref); }}
                    aria-label="Supprimer la photo"
                    data-testid="poi-photo-delete"
                    className="absolute top-1 right-1 bg-white/90 hover:bg-grenadine-soft rounded-full w-6 h-6 text-xs text-danger"
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-60 mb-1">
          Audio terrain
        </label>
        <AudioTrimmer
          audioUrl={audioUrl}
          trimStart={scene.trimStart ?? null}
          trimEnd={scene.trimEnd ?? null}
          onTrimChange={handleTrim}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-ink-60 mb-1" htmlFor={`poi-notes-${scene.id}`}>
          Notes
        </label>
        <textarea
          id={`poi-notes-${scene.id}`}
          value={scene.moderationFeedback ?? ''}
          onChange={handleNotes}
          data-testid="poi-notes-input"
          rows={2}
          placeholder="Notes personnelles"
          className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:border-grenadine focus:ring-1 focus:ring-grenadine"
        />
      </div>

      {lightboxPhoto && (
        <PhotoLightbox photoRef={lightboxPhoto} onClose={() => setLightboxPhoto(null)} />
      )}
    </div>
  );
}
