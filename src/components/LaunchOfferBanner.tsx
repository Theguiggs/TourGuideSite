'use client';

import Link from 'next/link';
import {useLaunchFreeAccess} from '@/lib/use-launch-free-access';
import {formatDate, type InterfaceLocale} from '@/lib/i18n/locales';
import {localizePublicPath} from '@/lib/i18n/public-routes';
import {LAUNCH_BANNER_COPY as COPY} from '@/lib/i18n/launch-offer-copy';

export function LaunchOfferBanner({locale}: {locale: InterfaceLocale}) {
  const offer = useLaunchFreeAccess();
  if (!offer.active || !offer.endAt) return null;
  const date = formatDate(Date.parse(offer.endAt), locale, {dateStyle: 'long'});
  return (
    <aside className="bg-olive-soft px-4 py-3 text-center text-body text-ink" data-testid="launch-offer-banner">
      <strong>{COPY[locale].label}.</strong>{' '}
      {COPY[locale].text.replace('{date}', date)}{' '}
      <Link className="font-bold underline" href={localizePublicPath('/connexion', locale)}>{COPY[locale].action}</Link>
    </aside>
  );
}
