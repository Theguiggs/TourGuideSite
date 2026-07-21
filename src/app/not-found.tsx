import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Page introuvable',
};

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="font-editorial italic text-body-lg text-ink-60 mb-2">Erreur 404</p>
        <h1 className="font-display text-h2 text-ink mb-4 leading-none">Page introuvable</h1>
        <p className="text-body text-ink-60 mb-8">
          Cette page n&apos;existe pas ou a été déplacée.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/catalogue"
            className="bg-grenadine text-paper font-bold py-3 px-8 rounded-pill hover:opacity-90 transition text-caption"
          >
            Voir les parcours
          </Link>
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
