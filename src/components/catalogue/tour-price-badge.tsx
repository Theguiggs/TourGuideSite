'use client';

import { useOwnedTourIds } from '@/hooks/use-owned-tour-ids';
import { formatPrice, isTourFree } from '@/lib/catalogue/tour-pricing';
import type { Tour } from '@/types/tour';

interface TourPriceBadgeProps {
  tour: Pick<Tour, 'id' | 'purchaseType' | 'priceCents'>;
  locale?: 'fr' | 'en';
}

/**
 * Single catalogue badge with priority Acheté > Gratuit > Prix.
 * "Gratuit" is derived from `purchaseType` (absent ⇒ free, same rule as the
 * app), NOT from `Tour.isFree`, which the server mappers hard-code to false.
 * Self-contained: resolves per-user ownership via useOwnedTourIds (one shared
 * request per page), so it drops into any tour list — client OR server-rendered
 * (as a client island). Renders nothing for a paid tour with no price set.
 */
export function TourPriceBadge({ tour, locale = 'fr' }: TourPriceBadgeProps) {
  const ownedTourIds = useOwnedTourIds();

  if (ownedTourIds.has(tour.id)) {
    return (
      <span
        data-testid={`badge-owned-${tour.id}`}
        className="inline-flex items-center gap-1 bg-mer-soft text-mer text-xs font-bold px-2 py-0.5 rounded-full"
      >
        ✓ {locale === 'en' ? 'Purchased' : 'Acheté'}
      </span>
    );
  }
  if (isTourFree(tour)) {
    return (
      <span
        data-testid={`badge-free-${tour.id}`}
        className="bg-olive-soft text-olive text-xs font-bold px-2 py-0.5 rounded-full"
      >
        {locale === 'en' ? 'FREE' : 'GRATUIT'}
      </span>
    );
  }
  if (tour.priceCents) {
    return (
      <span
        data-testid={`badge-price-${tour.id}`}
        className="bg-grenadine-soft text-grenadine text-xs font-bold px-2 py-0.5 rounded-full"
      >
        {formatPrice(tour.priceCents)}
      </span>
    );
  }
  return null;
}
