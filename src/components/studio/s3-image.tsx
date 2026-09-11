'use client';

import { useState, useEffect } from 'react';
import { shouldUseStubs } from '@/config/api-mode';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';

interface S3ImageProps {
  s3Key: string;
  alt: string;
  className?: string;
  fallback?: string;
  /** Dimensions intrinsèques : réservent la place avant le chargement (pas de saut). */
  width?: number;
  height?: number;
  /** Indice de largeur affichée pour le navigateur (ex. `(min-width: 1024px) 33vw, 100vw`). */
  sizes?: string;
  /** Image au-dessus de la ligne de flottaison : chargée tout de suite, pas en différé. */
  priority?: boolean;
}

/**
 * Displays an image from S3 by resolving its signed URL.
 * In stub mode or for blob:/local URLs, renders directly.
 *
 * Les URL signées sont résolues au montage : `next/image` ne peut pas les
 * optimiser (hôte et signature changeants), on reste sur `<img>`, mais avec
 * `loading="lazy"` et `decoding="async"` par défaut, et des dimensions quand
 * l'appelant les connaît.
 */
export function S3Image({
  s3Key,
  alt,
  className = '',
  fallback = '📷',
  width,
  height,
  sizes,
  priority = false,
}: S3ImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!s3Key) return;
    let cancelled = false;
    // blob: or http URLs can be used directly
    if (s3Key.startsWith('blob:') || s3Key.startsWith('http')) {
      Promise.resolve().then(() => { if (!cancelled) setUrl(s3Key); });
      return () => { cancelled = true; };
    }
    // Stub mode: can't resolve S3 URLs
    if (shouldUseStubs()) {
      Promise.resolve().then(() => { if (!cancelled) setUrl(null); });
      return () => { cancelled = true; };
    }
    // Real mode: resolve signed URL
    getPlayableUrl(s3Key)
      .then((resolved) => { if (!cancelled) setUrl(resolved); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [s3Key]);

  // La place est réservée dès le squelette, avec le même ratio que l'image.
  const reserved =
    width && height ? { aspectRatio: `${width} / ${height}` } : undefined;

  if (error || (!url && shouldUseStubs())) {
    return (
      <div
        className={`bg-paper-deep flex items-center justify-center text-ink-40 text-xs ${className}`}
        style={reserved}
      >
        <span aria-hidden="true">{fallback}</span>
      </div>
    );
  }

  if (!url) {
    return (
      <div className={`bg-paper-soft animate-pulse ${className}`} style={reserved} />
    );
  }

  return (
    // S3 URLs are resolved dynamically and are not compatible with static Next image optimization.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      className={`object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
}
