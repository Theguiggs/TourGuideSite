'use client';

import {useAuth} from '@/lib/auth/auth-context';
import {formatDate, type InterfaceLocale} from '@/lib/i18n/locales';
import {useLaunchFreeAccess} from '@/lib/use-launch-free-access';
import {VisitorCheckoutLinks} from './visitor-checkout-links';
import {LAUNCH_CARD_COPY as COPY} from '@/lib/i18n/launch-offer-copy';

export function LaunchOfferCard({locale}: {locale: InterfaceLocale}) {
  const {isAuthenticated} = useAuth();
  const offer = useLaunchFreeAccess();
  if (!offer.active || !offer.endAt) return null;
  const copy = COPY[locale];
  const date = formatDate(Date.parse(offer.endAt), locale, {dateStyle: 'long'});
  return (
    <div className="mt-4 rounded-xl border border-olive bg-olive-soft p-4" data-testid="launch-offer-card">
      <strong className="block text-body text-ink">{copy.title}</strong>
      <p className="mt-1 text-body text-ink-80">{(isAuthenticated ? copy.ready : copy.login).replace('{date}', date)}</p>
      {isAuthenticated ? (
        <a className="mt-3 inline-flex min-h-11 items-center font-bold text-ink underline" href="#itineraire">{copy.listen}</a>
      ) : (
        <VisitorCheckoutLinks locale={locale} />
      )}
    </div>
  );
}
