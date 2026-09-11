/**
 * Liens vers les magasins d'applications.
 *
 * Jusqu'ici sept endroits recopiaient `process.env.NEXT_PUBLIC_APP_STORE_… ||
 * '#'` : sans variable au build (le cas de la production), chaque bouton
 * « Télécharger » menait à `#`, et un visiteur iPhone était envoyé sur Google
 * Play. Une seule source ici : pas d'URL, pas de bouton ; iOS ne voit que
 * l'App Store.
 *
 * `NEXT_PUBLIC_*` est inliné par Next.js au build : les deux lectures doivent
 * rester littérales, dans ce module.
 */

export interface StoreUrls {
  ios: string | null;
  android: string | null;
}

export const APP_STORE_URLS: StoreUrls = {
  ios: process.env.NEXT_PUBLIC_APP_STORE_IOS || null,
  android: process.env.NEXT_PUBLIC_APP_STORE_ANDROID || null,
};

export type StorePlatform = 'ios' | 'android' | 'other';

export function detectPlatform(userAgent: string | null | undefined): StorePlatform {
  if (!userAgent) return 'other';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'other';
}

export function isMobileUserAgent(userAgent: string | null | undefined): boolean {
  return detectPlatform(userAgent) !== 'other';
}

/**
 * Le magasin à proposer à CE visiteur, ou null s'il n'y en a pas.
 * Un iPhone n'est jamais envoyé sur Google Play (ni l'inverse) ; un
 * ordinateur reçoit n'importe lequel des deux.
 */
export function getStoreUrl(userAgent?: string | null, urls: StoreUrls = APP_STORE_URLS): string | null {
  const platform = detectPlatform(userAgent);
  if (platform === 'ios') return urls.ios;
  if (platform === 'android') return urls.android;
  return urls.android ?? urls.ios;
}
