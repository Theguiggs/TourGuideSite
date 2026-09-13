'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { InterfaceLocale } from '@/lib/i18n/locales';

/**
 * Le bandeau lui-même. Rendu par le serveur, dans le flux normal du document :
 * il est là dès la première peinture, donc il ne décale rien.
 *
 * Le texte est dans la langue PROPOSÉE, jamais dans celle de la page : un
 * visiteur allemand qui ne lit pas le français doit comprendre l'offre.
 *
 * Le lien est un vrai `<a href>` : il fonctionne sans JavaScript et reste
 * explorable — c'est la même URL que le hreflang annonce déjà. Seul le refus
 * demande du script, et son absence n'empêche rien.
 */

const COPY: Record<InterfaceLocale, { offer: string; accept: string; dismiss: string }> = {
  fr: { offer: 'Cette page existe aussi en français.', accept: 'Voir en français', dismiss: 'Non merci' },
  en: { offer: 'This page is also available in English.', accept: 'View in English', dismiss: 'No thanks' },
  es: { offer: 'Esta página también está disponible en español.', accept: 'Ver en español', dismiss: 'No, gracias' },
  de: { offer: 'Diese Seite gibt es auch auf Deutsch.', accept: 'Auf Deutsch ansehen', dismiss: 'Nein, danke' },
  it: { offer: 'Questa pagina è disponibile anche in italiano.', accept: 'Vedi in italiano', dismiss: 'No, grazie' },
  nl: { offer: 'Deze pagina is ook beschikbaar in het Nederlands.', accept: 'Bekijk in het Nederlands', dismiss: 'Nee, bedankt' },
};

/** Un an : le choix doit survivre au voyage, pas seulement à la session. */
const CHOICE_MAX_AGE = 31_536_000;

/**
 * Le même cookie que le sélecteur du Studio : un seul endroit où le site
 * apprend qu'un visiteur a tranché, et il ne le redemande plus.
 */
function rememberChoice(chosen: InterfaceLocale): void {
  try {
    document.cookie = `murmure-locale=${chosen}; Path=/; Max-Age=${CHOICE_MAX_AGE}; SameSite=Lax`;
  } catch {
    /* Cookies refusés : le bandeau reviendra, ce n'est pas une panne. */
  }
}

export function LanguageSuggestionBanner({
  suggested,
  current,
  href,
}: {
  /** Langue proposée — celle du navigateur du visiteur. */
  suggested: InterfaceLocale;
  /** Langue de la page affichée, mémorisée si le visiteur refuse. */
  current: InterfaceLocale;
  href: string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const copy = COPY[suggested];

  if (dismissed) return null;

  return (
    <aside
      lang={suggested}
      aria-label={copy.offer}
      className="border-b border-line bg-card"
      data-testid="language-suggestion"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-body text-ink">{copy.offer}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={href}
            hrefLang={suggested}
            onClick={() => rememberChoice(suggested)}
            className="inline-flex min-h-11 items-center rounded-pill bg-grenadine px-4 text-body font-semibold text-paper no-underline"
          >
            {copy.accept}
          </Link>
          <button
            type="button"
            onClick={() => {
              // Refuser, c'est choisir de rester : on mémorise la page affichée.
              rememberChoice(current);
              setDismissed(true);
            }}
            className="inline-flex min-h-11 items-center px-2 text-body text-ink-60 underline underline-offset-4"
          >
            {copy.dismiss}
          </button>
        </div>
      </div>
    </aside>
  );
}
