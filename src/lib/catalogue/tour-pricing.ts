/** Catalog price helpers shared across the catalogue badges + checkout. */

import type { Tour } from '@/types/tour';

/**
 * A tour is free to access when its access model is `'free'` or absent (beta
 * back-compat) — the exact mirror of the app's `isFreePurchaseType`. The mapped
 * `Tour.isFree` flag is NOT trustworthy here: the server mappers hard-code it to
 * `false`, which silently killed the GRATUIT badge for genuinely free tours.
 */
export function isTourFree(tour: Pick<Tour, 'purchaseType'>): boolean {
  return tour.purchaseType === undefined || tour.purchaseType === 'free';
}

/** Price in cents → French-formatted euro string, e.g. 499 → "4,99 €". */
export function formatPrice(cents?: number, locale: 'fr' | 'en' = 'fr'): string {
  if (!cents) return '';
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

/** ISO timestamp → French short date, e.g. "12/05/2026". Empty string if unparseable. */
export function formatPurchaseDate(iso?: string, locale: 'fr' | 'en' = 'fr'): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'en' ? 'en-GB' : 'fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
