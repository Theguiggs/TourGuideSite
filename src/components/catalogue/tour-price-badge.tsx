'use client';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';

import { useOwnedTourIds } from '@/hooks/use-owned-tour-ids';
import { formatPrice, isTourFree } from '@/lib/catalogue/tour-pricing';
import type { Tour } from '@/types/tour';
import {useLaunchFreeAccess} from '@/lib/use-launch-free-access';

interface TourPriceBadgeProps {
  tour: Pick<Tour, 'id' | 'purchaseType' | 'priceCents'>;
  locale?: InterfaceLocale;
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
  const includedInLaunchOffer = useLaunchFreeAccess().active;

  if (ownedTourIds.has(tour.id)) {
    return (
      <span
        data-testid={`badge-owned-${tour.id}`}
        className="inline-flex items-center gap-1 bg-mer-soft text-mer text-meta font-bold px-2 py-0.5 rounded-pill"
      >
        <span aria-hidden="true">✓</span> {translate(locale, 'Acheté', 'Purchased')}
      </span>
    );
  }
  if (isTourFree(tour) || includedInLaunchOffer) {
    return (
      <span
        data-testid={`badge-free-${tour.id}`}
        className="bg-olive-soft text-ink text-meta font-bold px-2 py-0.5 rounded-pill"
      >
        {translate(locale, 'GRATUIT', 'FREE')}
        {includedInLaunchOffer && tour.priceCents
          ? ` · ${formatPrice(tour.priceCents, locale)}`
          : ''}
      </span>
    );
  }
  if (tour.purchaseType === 'subscription_only') {
    return (
      <span
        data-testid={`badge-subscription-${tour.id}`}
        className="bg-ocre-soft text-ocre-ink text-meta font-bold px-2 py-0.5 rounded-pill"
      >
        {translate(locale, 'INCLUS DANS L’ABONNEMENT', 'INCLUDED WITH SUBSCRIPTION')}
      </span>
    );
  }
  if (tour.priceCents) {
    return (
      <span
        data-testid={`badge-price-${tour.id}`}
        className="bg-grenadine-soft text-grenadine text-meta font-bold px-2 py-0.5 rounded-pill"
      >
        {formatPrice(tour.priceCents, locale)}
      </span>
    );
  }
  return null;
}
