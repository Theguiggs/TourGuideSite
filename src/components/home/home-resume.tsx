'use client';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { readResume, RESUME_CLEAR_EVENT } from '@/components/catalogue/scene-player/resume-store';
import type { HomeTour } from '@/lib/catalogue/home-selection';

type ResumeTour = Pick<HomeTour, 'id' | 'title' | 'citySlug' | 'slug'>;
const subscribe = (notify: () => void) => {
  const cleared = () => queueMicrotask(notify); // La purge suit immédiatement le signal.
  window.addEventListener('storage', notify);
  window.addEventListener(RESUME_CLEAR_EVENT, cleared);
  return () => { window.removeEventListener('storage', notify); window.removeEventListener(RESUME_CLEAR_EVENT, cleared); };
};
const empty = () => '';

export function latestHomeResume(tours: ResumeTour[]): string {
  let latest = ''; let date = -Infinity;
  for (const tour of tours) {
    const resume = readResume(tour.id);
    if (resume && resume.updatedAt > date) { latest = tour.id; date = resume.updatedAt; }
  }
  return latest;
}

export function HomeResume({ tours, locale }: { tours: ResumeTour[]; locale: InterfaceLocale }) {
  const id = useSyncExternalStore(subscribe, () => latestHomeResume(tours), empty);
  const tour = tours.find(item => item.id === id);
  if (!tour) return null;
  return <p className="mb-6 text-body text-ink-80">
    {translate(locale, 'Sur cet appareil : ', 'On this device: ')}
    <Link href={`${translate(locale, '', '/en')}/catalogue/${tour.citySlug}/${tour.slug}#itineraire`} className="inline-flex min-h-11 items-center font-semibold text-grenadine underline underline-offset-4">
      {translate(locale, 'Retrouver mon écoute', 'Return to my listening')} — {tour.title}
    </Link>
  </p>;
}
