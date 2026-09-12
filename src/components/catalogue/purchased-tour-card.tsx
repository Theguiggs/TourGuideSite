import Link from 'next/link';
import { S3Image } from '@/components/studio/s3-image';
import { TourPriceBadge } from '@/components/catalogue/tour-price-badge';
import { formatPrice, formatPurchaseDate } from '@/lib/catalogue/tour-pricing';
import type { PurchasedTour } from '@/types/purchase';
import { tg } from '@murmure/design-system/web';
import { Play } from 'lucide-react';
import { LISTEN_ANCHOR, PURCHASE_LISTEN_COPY } from './scene-player/listen-link';

interface PurchasedTourCardProps {
  purchase: PurchasedTour;
  locale?: 'fr' | 'en';
}

/** One owned tour with its purchase metadata (date + amount paid). */
export function PurchasedTourCard({ purchase, locale = 'fr' }: PurchasedTourCardProps) {
  const { tour, purchasedAt, amountCents } = purchase;
  const copy = PURCHASE_LISTEN_COPY[locale];
  const date = formatPurchaseDate(purchasedAt, locale);
  const amount = formatPrice(amountCents, locale);
  const meta = [date && `${copy.purchasedOn} ${date}`, amount]
    .filter(Boolean)
    .join(' · ');
  // The catalogue page only resolves published tours — linking an owned-but-
  // unpublished tour would 404. Keep the card (the purchase exists) without link.
  const published = tour.status === 'published';

  const body = (
    <>
      <div className="relative h-40 bg-grenadine-soft overflow-hidden">
        {tour.imageUrl && tour.imageUrl.startsWith('guide-') ? (
          <S3Image
            s3Key={tour.imageUrl}
            alt={tour.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : tour.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={tour.imageUrl}
            alt={tour.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : null}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-ink">{tour.title}</h3>
          <TourPriceBadge tour={tour} locale={locale} />
        </div>
        <p className="text-body text-ink-60 mb-2">
          {tour.city} &middot; {tour.duration} min &middot; {tour.distance} km
        </p>
        {meta && <p className="text-meta text-ink-60">{meta}</p>}
        {published && <span style={{ display: 'flex', alignItems: 'center', gap: tg.space[2], marginTop: tg.space[3], color: tg.colors.ink, fontWeight: 600 }}><Play size={16} aria-hidden="true" />{copy.listen}</span>}
        {!published && (
          <p className="text-meta text-ink-60 mt-1 italic">
            {copy.unavailableDetail}
          </p>
        )}
      </div>
    </>
  );

  if (!published) {
    return (
      <div
        data-testid={`purchase-card-${tour.id}`}
        className="block rounded-xl border border-line overflow-hidden"
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={`${locale === 'en' ? '/en' : ''}/catalogue/${tour.citySlug}/${tour.slug}${LISTEN_ANCHOR}`}
      aria-label={copy.label(tour.title)}
      data-testid={`purchase-card-${tour.id}`}
      className="block rounded-xl border border-line hover:shadow-md transition-shadow overflow-hidden"
    >
      {body}
    </Link>
  );
}
