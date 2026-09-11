'use client';

import { useEffect, useState } from 'react';
import { shouldUseStubs } from '@/config/api-mode';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';
import { logger } from '@/lib/logger';
import { Dialog } from '@/components/ui/Dialog';

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
    <Dialog
      open
      onClose={onClose}
      label="Photo du point d’intérêt"
      data-testid="photo-lightbox"
      className="max-w-[95vw] bg-transparent shadow-none backdrop:bg-black/80"
    >
      <div className="relative max-w-[95vw] max-h-[95vh] flex flex-col items-center">
        <div className="absolute top-2 right-2 flex gap-2 z-10">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!url || downloading}
            data-testid="photo-lightbox-download"
            className="bg-card/90 hover:bg-card rounded-pill px-3 py-1.5 text-body font-medium text-ink shadow disabled:opacity-50"
          >
            {downloading ? 'Téléchargement…' : 'Télécharger'}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            data-testid="photo-lightbox-close"
            className="bg-card/90 hover:bg-card rounded-pill w-11 h-11 text-h6 text-ink shadow"
          >
            ×
          </button>
        </div>
        {error ? (
          <div className="bg-card rounded-lg p-8 text-center text-body text-ink-80">
            Impossible de charger la photo.
          </div>
        ) : !url ? (
          <div className="bg-card/10 rounded-lg w-64 h-64 animate-pulse" role="status" aria-label="Chargement de la photo" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="Photo du point d’intérêt"
            className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-2xl"
            data-testid="photo-lightbox-image"
          />
        )}
      </div>
    </Dialog>
  );
}
