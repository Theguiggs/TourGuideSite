'use client';

import { useState, useEffect } from 'react';
import { shouldUseStubs } from '@/config/api-mode';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';

interface S3ImageProps {
  s3Key: string;
  alt: string;
  className?: string;
  fallback?: string;
}

/**
 * Displays an image from S3 by resolving its signed URL.
 * In stub mode or for blob:/local URLs, renders directly.
 */
export function S3Image({ s3Key, alt, className = '', fallback = '📷' }: S3ImageProps) {
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

  if (error || (!url && shouldUseStubs())) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center text-gray-400 text-xs ${className}`}>
        {fallback}
      </div>
    );
  }

  if (!url) {
    return (
      <div className={`bg-gray-100 animate-pulse ${className}`} />
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
}
