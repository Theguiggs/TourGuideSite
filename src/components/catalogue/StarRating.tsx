import { tg } from '@murmure/design-system/tokens';

/**
 * Note en étoiles, bornée à [0, 5].
 *
 * `'★'.repeat(Math.round(rating))` avec une note hors bornes (7, -1) levait
 * un `RangeError` au rendu serveur : toute la fiche répondait 500 pour une
 * donnée d'avis mal formée. `NaN` rendait un vide silencieux.
 */
export function clampRating(rating: unknown): number {
  const n = typeof rating === 'number' ? rating : Number(rating);
  if (!Number.isFinite(n)) return 0;
  return Math.min(5, Math.max(0, n));
}

export function StarRating({ rating, locale = 'fr' }: { rating: number; locale?: 'fr' | 'en' }) {
  const value = clampRating(rating);
  const full = Math.round(value);
  return (
    <span
      role="img"
      style={{ color: tg.colors.ocre }}
      aria-label={locale === 'en' ? `${value.toFixed(1)} stars out of 5` : `${value.toFixed(1)} étoiles sur 5`}
    >
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)}
    </span>
  );
}
