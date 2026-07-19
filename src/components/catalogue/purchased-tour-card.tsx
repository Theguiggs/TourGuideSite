import Link from 'next/link';
import { S3Image } from '@/components/studio/s3-image';
import { TourPriceBadge } from '@/components/catalogue/tour-price-badge';
import { formatPrice, formatPurchaseDate } from '@/lib/catalogue/tour-pricing';
import type { PurchasedTour } from '@/types/purchase';

interface PurchasedTourCardProps {
  purchase: PurchasedTour;
  locale?: 'fr' | 'en';
}

/** One owned tour with its purchase metadata (date + amount paid). */
export function PurchasedTourCard({ purchase, locale = 'fr' }: PurchasedTourCardProps) {
  const { tour, purchasedAt, amountCents } = purchase;
  const date = formatPurchaseDate(purchasedAt, locale);
  const amount = formatPrice(amountCents, locale);
  const meta = [date && `${locale === 'en' ? 'Purchased on' : 'Acheté le'} ${date}`, amount]
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
        <p className="text-sm text-ink-60 mb-2">
          {tour.city} &middot; {tour.duration} min &middot; {tour.distance} km
        </p>
        {meta && <p className="text-xs text-ink-40">{meta}</p>}
        {!published && (
          <p className="text-xs text-ink-40 mt-1 italic">
            {locale === 'en'
              ? 'Currently unavailable in the catalogue - find it in the Murmure app.'
              : "Indisponible au catalogue actuellement — retrouvez-la dans l'app Murmure."}
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
      href={`${locale === 'en' ? '/en' : ''}/catalogue/${tour.citySlug}/${tour.slug}`}
      data-testid={`purchase-card-${tour.id}`}
      className="block rounded-xl border border-line hover:shadow-md transition-shadow overflow-hidden"
    >
      {body}
    </Link>
  );
}
