'use client';

import { useRef, useCallback, useState } from 'react';
import type { StudioScene } from '@/types/studio';
import { MAX_PHOTOS_PER_SCENE } from '@/types/studio';
import { logger } from '@/lib/logger';
import { shouldUseStubs } from '@/config/api-mode';
import * as studioUploadService from '@/lib/studio/studio-upload-service';
import { S3Image } from '@/components/studio/s3-image';

const SERVICE_NAME = 'ScenePhotos';
const MAX_PHOTO_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface ScenePhotosProps {
  scene: StudioScene;
  sessionId?: string;
  onPhotosChange: (sceneId: string, photos: string[]) => void;
  editable?: boolean;
}

export function ScenePhotos({ scene, sessionId, onPhotosChange, editable = true }: ScenePhotosProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const photos = scene.photosRefs;
  const canAddMore = photos.length < MAX_PHOTOS_PER_SCENE && !isUploading;

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setError(null);

    const remaining = MAX_PHOTOS_PER_SCENE - photos.length;
    const filesToAdd = files.slice(0, remaining);

    const valid: File[] = [];
    for (const file of filesToAdd) {
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError(`Format non supporté : ${file.type}. Acceptés : JPEG, PNG, WebP.`);
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE_MB * 1024 * 1024) {
        setError(`Photo trop volumineuse (max ${MAX_PHOTO_SIZE_MB} Mo).`);
        continue;
      }
      valid.push(file);
    }

    if (valid.length === 0) {
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    if (shouldUseStubs() || !sessionId) {
      // Stub mode: use object URLs as placeholder
      const newUrls = valid.map((f) => URL.createObjectURL(f));
      onPhotosChange(scene.id, [...photos, ...newUrls]);
      logger.info(SERVICE_NAME, 'Photos added (stub)', { sceneId: scene.id, count: newUrls.length });
    } else {
      // Real mode: upload each photo to S3
      setIsUploading(true);
      const newKeys: string[] = [];
      for (let i = 0; i < valid.length; i++) {
        const photoIndex = photos.length + i;
        const result = await studioUploadService.uploadPhoto(valid[i], sessionId, scene.sceneIndex, photoIndex);
        if (result.ok) {
          newKeys.push(result.s3Key);
        } else {
          setError(result.error);
        }
      }
      if (newKeys.length > 0) {
        onPhotosChange(scene.id, [...photos, ...newKeys]);
        logger.info(SERVICE_NAME, 'Photos uploaded (S3)', { sceneId: scene.id, count: newKeys.length });
      }
      setIsUploading(false);
    }

    if (inputRef.current) inputRef.current.value = '';
  }, [photos, scene.id, scene.sceneIndex, sessionId, onPhotosChange]);

  const handleRemove = useCallback((index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    onPhotosChange(scene.id, updated);
    logger.info(SERVICE_NAME, 'Photo removed', { sceneId: scene.id, index });
  }, [photos, scene.id, onPhotosChange]);

  return (
    <div data-testid={`scene-photos-${scene.id}`}>
      <div className="flex gap-2 flex-wrap">
        {photos.map((url, index) => (
          <div key={`${url}-${index}`} className="relative w-24 h-24 rounded-lg overflow-hidden border border-line bg-paper-soft">
            <S3Image s3Key={url} alt={`Photo ${index + 1}`} className="w-full h-full" fallback={`📷 ${index + 1}`} />
            {editable && (
              <button
                onClick={() => handleRemove(index)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-danger text-white rounded-full text-xs flex items-center justify-center hover:opacity-90"
                aria-label={`Supprimer photo ${index + 1}`}
                data-testid={`remove-photo-${scene.id}-${index}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {editable && canAddMore && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(',')}
              multiple
              onChange={handleFileSelect}
              className="hidden"
              data-testid={`photo-input-${scene.id}`}
            />
            <button
              onClick={() => inputRef.current?.click()}
              className="w-24 h-24 rounded-lg border-2 border-dashed border-line flex items-center justify-center text-ink-40 hover:border-grenadine hover:text-grenadine transition"
              data-testid={`add-photo-btn-${scene.id}`}
              aria-label={`Ajouter photo (${photos.length}/${MAX_PHOTOS_PER_SCENE})`}
            >
              <span className="text-2xl">+</span>
            </button>
          </>
        )}
      </div>

      {!editable && photos.length === 0 && (
        <p className="text-xs text-ink-40">Aucune photo</p>
      )}

      {error && (
        <p className="mt-1 text-xs text-danger" role="alert">{error}</p>
      )}

      <p className="mt-1 text-xs text-ink-40">
        {photos.length}/{MAX_PHOTOS_PER_SCENE} photos
      </p>
    </div>
  );
}
