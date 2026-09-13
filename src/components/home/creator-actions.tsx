'use client';

import Link from 'next/link';
import { setStoredStudioLocale } from '@/lib/i18n/studio-locale';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';

/** Transmettre au Studio la langue choisie sur sa page de présentation. */
export function CreatorActions({ locale }: { locale: InterfaceLocale }) {
  return <div className="mt-6 flex flex-wrap items-center gap-4">
    <Link href="/guide/signup" onClick={() => setStoredStudioLocale(locale)} className="inline-flex min-h-11 items-center rounded-pill bg-grenadine px-5 py-3 text-body font-bold text-paper no-underline">{translate(locale, 'Devenir guide', 'Become a guide')}</Link>
    <Link href="/guide/studio" onClick={() => setStoredStudioLocale(locale)} className="inline-flex min-h-11 items-center text-body font-semibold text-grenadine underline underline-offset-4">{translate(locale, 'Accéder à mon Studio', 'Open my Studio')}</Link>
  </div>;
}
