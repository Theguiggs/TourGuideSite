'use client';
import { checkoutText } from '@/lib/i18n/checkout-copy';
import { type InterfaceLocale } from '@/lib/i18n/locales';
import { localizePublicPath } from '@/lib/i18n/public-routes';


import { usePathname, useSearchParams } from 'next/navigation';
import { visitorAuthUrl } from '@/lib/auth/visitor-routes';

/** Le produit reste dans la destination ; aucun paiement ne démarre au retour. */
export function VisitorCheckoutLinks({ locale }: { locale: InterfaceLocale }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = new URLSearchParams(params?.toString());
  query.delete('payment_intent_client_secret');
  const returnTo = `${pathname || (localizePublicPath("/catalogue", locale))}${query.size ? `?${query}` : ''}#acheter`;
  return <div className="flex flex-wrap gap-x-4 text-body">
    <a className="inline-flex min-h-11 items-center font-bold text-grenadine underline" href={visitorAuthUrl(locale, 'login', returnTo)}>{checkoutText(locale, "Sign in to continue")}</a>
    <a className="inline-flex min-h-11 items-center text-grenadine underline" href={visitorAuthUrl(locale, 'signup', returnTo)}>{checkoutText(locale, "Create an account")}</a>
    <a className="inline-flex min-h-11 items-center text-grenadine underline" href={visitorAuthUrl(locale, 'reset', returnTo)}>{checkoutText(locale, "Forgot password?")}</a>
  </div>;
}
