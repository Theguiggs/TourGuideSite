import { NextResponse, type NextRequest } from 'next/server';
import outputs from '../amplify_outputs.json';
import { buildCsp, generateNonce } from '@/lib/security/csp';
import { LOCALE_HEADER, localeFromPath } from '@/lib/site';

/**
 * Proxy Next 16 (l'ancien `middleware.ts`) : pose la Content-Security-Policy
 * avec un NONCE frais sur chaque réponse HTML.
 *
 * Le nonce doit voyager dans l'en-tête CSP de la REQUÊTE : c'est là que Next
 * le lit (`getScriptNonceFromHeader`) pour l'inscrire sur ses propres scripts
 * inline. La réponse reçoit la même politique, et c'est elle que le navigateur
 * applique. Les deux sont indissociables : l'une sans l'autre bloque
 * l'hydratation de toutes les pages.
 *
 * Un nonce par requête exige un rendu dynamique : `app/layout.tsx` force
 * `dynamic = 'force-dynamic'` pour que les pages prérendues (accueil, pages
 * légales, connexion…) ne soient pas servies avec un HTML sans nonce sous une
 * politique qui en exige un.
 */
export function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp({
    nonce,
    isDevelopment: process.env.NODE_ENV === 'development',
    outputs: outputs as Parameters<typeof buildCsp>[0]['outputs'],
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('content-security-policy', csp);
  // `<html lang>` est rendu côté serveur à partir du chemin (lot 3.1) : le
  // HTML servi aux robots portait `lang="fr"` sur toutes les pages anglaises,
  // corrigé seulement après hydratation.
  requestHeaders.set(LOCALE_HEADER, localeFromPath(request.nextUrl.pathname));

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('content-security-policy', csp);
  return response;
}

export const config = {
  // Tout sauf les actifs statiques et les images : ni nonce ni politique n'y
  // ont de sens, et les exclure épargne un passage par le proxy à chaque
  // fichier de police ou de script.
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon|apple-touch-icon|manifest\\.json|robots\\.txt|sitemap\\.xml|images/|sounds/|opengraph-image).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
