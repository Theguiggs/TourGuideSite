import Link from 'next/link';
import { S3Image } from '@/components/studio/s3-image';
import type { PurchasedTour } from '@/types/purchase';

interface MyPurchasesStripProps {
  purchases: PurchasedTour[];
  locale?: 'fr' | 'en';
}

/**
 * Compact "Mes achats" summary shown atop /catalogue for a logged-in buyer.
 * Renders nothing when there are no purchases. Links through to /mes-visites.
 */
export function MyPurchasesStrip({ purchases, locale = 'fr' }: MyPurchasesStripProps) {
  if (purchases.length === 0) return null;

  return (
    <section className="mb-10" aria-label={locale === 'en' ? 'My purchases' : 'Mes achats'}>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-xl font-semibold text-ink">
          {locale === 'en' ? 'My purchases' : 'Mes achats'} ({purchases.length})
        </h2>
        <Link href="/mes-visites" className="text-sm text-grenadine font-medium hover:underline">
          {locale === 'en' ? 'View all →' : 'Voir tout →'}
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {purchases.slice(0, 6).map(({ tour }) => (
          <Link
            key={tour.id}
            href={`${locale === 'en' ? '/en' : ''}/catalogue/${tour.citySlug}/${tour.slug}`}
            data-testid={`purchase-strip-${tour.id}`}
            className="flex-shrink-0 w-40 rounded-lg border border-line hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="relative h-24 bg-grenadine-soft overflow-hidden">
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
            <p className="p-2 text-xs font-medium text-ink line-clamp-2">{tour.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
