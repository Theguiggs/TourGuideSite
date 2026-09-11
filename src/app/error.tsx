'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logger } from '@/lib/logger';
import { localeFromPath } from '@/lib/site';

const COPY = {
  fr: {
    eyebrow: 'Oups…',
    title: 'Une erreur est survenue',
    text: "Quelque chose s'est mal passé. Réessayez ou revenez à l'accueil.",
    retry: 'Réessayer',
    home: 'Accueil',
    homePath: '/',
  },
  en: {
    eyebrow: 'Oops…',
    title: 'Something went wrong',
    text: 'Please try again, or go back to the home page.',
    retry: 'Try again',
    home: 'Home',
    homePath: '/en',
  },
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const copy = COPY[localeFromPath(usePathname())];

  useEffect(() => {
    logger.error('ErrorBoundary', 'Page error caught', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="font-editorial italic text-body-lg text-ink-60 mb-2">{copy.eyebrow}</p>
        <h2 className="font-display text-h3 text-ink mb-4 leading-none">{copy.title}</h2>
        <p className="text-body text-ink-60 mb-8">{copy.text}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="bg-grenadine text-paper font-bold py-3 px-6 rounded-pill hover:opacity-90 transition text-caption"
          >
            {copy.retry}
          </button>
          <Link
            href={copy.homePath}
            className="border border-line text-ink font-semibold py-3 px-6 rounded-pill hover:bg-paper transition text-caption"
          >
            {copy.home}
          </Link>
        </div>
      </div>
    </div>
  );
}
