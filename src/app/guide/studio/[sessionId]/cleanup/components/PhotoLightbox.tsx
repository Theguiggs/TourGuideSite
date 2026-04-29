'use client';

import { useEffect, useState } from 'react';
import { shouldUseStubs } from '@/config/api-mode';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'PhotoLightbox';

interface PhotoLightboxProps {
  photoRef: string;
  onClose: () => void;
}

function isDirectUrl(ref: string): boolean {
  return shouldUseStubs() || ref.startsWith('/') || ref.startsWith('blob:') || ref.startsWith('http');
}

function filenameFromRef(ref: string): string {
  const withoutQuery = ref.split('?')[0];
  const segments = withoutQuery.split('/');
  const last = segments[segments.length - 1] || 'photo';
  return last.includes('.') ? last : `${last}.jpg`;
}

export function PhotoLightbox({ photoRef, onClose }: PhotoLightboxProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (isDirectUrl(photoRef)) {
      setUrl(photoRef);
      return () => { cancelled = true; };
    }
    getPlayableUrl(photoRef)
      .then((resolved) => { if (!cancelled) setUrl(resolved); })
      .catch((err) => {
        if (!cancelled) {
          setError(true);
          logger.error(SERVICE_NAME, 'Failed to resolve photo URL', { photoRef, error: String(err) });
        }
      });
    return () => { cancelled = true; };
  }, [photoRef]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDownload = async () => {
    if (!url) return;
    setDownloading(true);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filenameFromRef(photoRef);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      logger.info(SERVICE_NAME, 'Photo downloaded', { photoRef });
    } catch (err) {
      logger.error(SERVICE_NAME, 'Download failed', { photoRef, error: String(err) });
      window.open(url, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="photo-lightbox"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!url || downloading}
            data-testid="photo-lightbox-download"
            className="bg-white/90 hover:bg-white rounded-full px-3 py-1.5 text-sm font-medium text-ink shadow disabled:opacity-50"
          >
            {downloading ? 'Téléchargement…' : 'Télécharger'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            data-testid="photo-lightbox-close"
            className="bg-white/90 hover:bg-white rounded-full w-8 h-8 text-lg text-ink shadow"
          >
            ×
          </button>
        </div>
        {error ? (
          <div className="bg-white rounded-lg p-8 text-center text-sm text-ink-80">
            Impossible de charger la photo.
          </div>
        ) : !url ? (
          <div className="bg-white/10 rounded-lg w-64 h-64 animate-pulse" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
            data-testid="photo-lightbox-image"
          />
        )}
      </div>
    </div>
  );
}
