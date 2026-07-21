'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error('ErrorBoundary', 'Page error caught', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="font-editorial italic text-body-lg text-ink-60 mb-2">Oups…</p>
        <h2 className="font-display text-h3 text-ink mb-4 leading-none">Une erreur est survenue</h2>
        <p className="text-body text-ink-60 mb-8">
          Quelque chose s&apos;est mal passé. Réessayez ou revenez à l&apos;accueil.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-grenadine text-paper font-bold py-3 px-6 rounded-pill hover:opacity-90 transition text-caption"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="border border-line text-ink font-semibold py-3 px-6 rounded-pill hover:bg-paper transition text-caption"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
