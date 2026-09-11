import Link from 'next/link';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { LOCALE_HEADER } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Page introuvable',
};

const COPY = {
  fr: {
    eyebrow: 'Erreur 404',
    title: 'Page introuvable',
    text: "Cette page n'existe pas ou a été déplacée.",
    catalogue: 'Voir les visites',
    home: 'Accueil',
    cataloguePath: '/catalogue',
    homePath: '/',
  },
  en: {
    eyebrow: 'Error 404',
    title: 'Page not found',
    text: 'This page does not exist or has moved.',
    catalogue: 'Browse the tours',
    home: 'Home',
    cataloguePath: '/en/catalogue',
    homePath: '/en',
  },
};

/**
 * 404 dans la langue de la page demandée (lot 3.3) : un `/en/catalogue/xxx`
 * introuvable répondait en français sous la chrome anglaise. La locale vient
 * de l'en-tête posé par le proxy, comme `<html lang>`.
 */
export default async function NotFound() {
  const locale = (await headers()).get(LOCALE_HEADER) === 'en' ? 'en' : 'fr';
  const copy = COPY[locale];
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="font-editorial italic text-body-lg text-ink-60 mb-2">{copy.eyebrow}</p>
        <h1 className="font-display text-h2 text-ink mb-4 leading-none">{copy.title}</h1>
        <p className="text-body text-ink-60 mb-8">{copy.text}</p>
        <div className="flex gap-3 justify-center">
          <Link
            href={copy.cataloguePath}
            className="bg-grenadine text-paper font-bold py-3 px-8 rounded-pill hover:opacity-90 transition text-caption"
          >
            {copy.catalogue}
          </Link>
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
