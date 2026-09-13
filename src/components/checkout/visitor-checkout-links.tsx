'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { visitorAuthUrl } from '@/lib/auth/visitor-routes';

/** Le produit reste dans la destination ; aucun paiement ne démarre au retour. */
export function VisitorCheckoutLinks({ locale }: { locale: 'fr' | 'en' }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = new URLSearchParams(params?.toString());
  query.delete('payment_intent_client_secret');
  const returnTo = `${pathname || (locale === 'en' ? '/en/catalogue' : '/catalogue')}${query.size ? `?${query}` : ''}#acheter`;
  return <div className="flex flex-wrap gap-x-4 text-body">
    <a className="inline-flex min-h-11 items-center font-bold text-grenadine underline" href={visitorAuthUrl(locale, 'login', returnTo)}>{locale === 'en' ? 'Sign in to continue' : 'Se connecter pour continuer'}</a>
    <a className="inline-flex min-h-11 items-center text-grenadine underline" href={visitorAuthUrl(locale, 'signup', returnTo)}>{locale === 'en' ? 'Create an account' : 'Créer un compte'}</a>
    <a className="inline-flex min-h-11 items-center text-grenadine underline" href={visitorAuthUrl(locale, 'reset', returnTo)}>{locale === 'en' ? 'Forgot password?' : 'Mot de passe oublié ?'}</a>
  </div>;
}
