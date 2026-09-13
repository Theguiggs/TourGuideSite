import { safeReturnTo } from './return-to';
import { SITE_URL } from '@/lib/site';
import { localizePublicPath, type PublicLocale } from '@/lib/i18n/public-routes';

export type VisitorAuthMode = 'login' | 'signup' | 'reset';
export const VISITOR_AUTH_ROUTES = {
  fr: { login: '/connexion', signup: '/inscription', reset: '/mot-de-passe-oublie' },
  en: { login: '/en/sign-in', signup: '/en/sign-up', reset: '/en/reset-password' },
  es: { login: '/es/sign-in', signup: '/es/sign-up', reset: '/es/reset-password' },
  de: { login: '/de/sign-in', signup: '/de/sign-up', reset: '/de/reset-password' },
  it: { login: '/it/sign-in', signup: '/it/sign-up', reset: '/it/reset-password' },
  nl: { login: '/nl/sign-in', signup: '/nl/sign-up', reset: '/nl/reset-password' },
} as const;

export function visitorDestination(locale: PublicLocale, raw?: string | null): string {
  return safeReturnTo(raw) ?? localizePublicPath('/mes-achats', locale);
}

export function visitorAuthUrl(locale: PublicLocale, mode: VisitorAuthMode = 'login', raw?: string | null): string {
  const path = VISITOR_AUTH_ROUTES[locale][mode];
  const target = safeReturnTo(raw);
  return target ? `${path}?${new URLSearchParams({ returnTo: target })}` : path;
}

/** La traduction porte sur le chemin ; paramètres et ancre restent intacts. */
export function localizeVisitorReturn(raw: string | null, locale: PublicLocale): string | null {
  const target = safeReturnTo(raw);
  if (!target) return null;
  const url = new URL(target, SITE_URL);
  return `${localizePublicPath(url.pathname, locale)}${url.search}${url.hash}`;
}
