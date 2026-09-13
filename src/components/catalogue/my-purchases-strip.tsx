import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { S3Image } from '@/components/studio/s3-image';
import type { PurchasedTour } from '@/types/purchase';
import { localizeTour, METADATA_FALLBACK_COPY } from '@/lib/catalogue/localized-tour';
import { PageTitle, tg } from '@murmure/design-system/web';
import { Play } from 'lucide-react';
import { LISTEN_ANCHOR, PURCHASE_LISTEN_COPY } from './scene-player/listen-link';

interface MyPurchasesStripProps {
  purchases: PurchasedTour[];
  locale?: InterfaceLocale;
}

function PurchaseStripLink({ href, label, testId, children }: { href?: string; label: string; testId: string; children: ReactNode }) {
  const className = 'flex-shrink-0 w-40 rounded-lg border border-line hover:shadow-md transition-shadow overflow-hidden';
  return href
    ? <Link href={href} aria-label={label} data-testid={testId} className={className}>{children}</Link>
    : <div data-testid={testId} className={className}>{children}</div>;
}

/**
 * Compact "Mes achats" summary shown atop /catalogue for a logged-in buyer.
 * Renders nothing when there are no purchases. Links through to /mes-achats (or /en/my-purchases).
 */
export function MyPurchasesStrip({ purchases, locale = 'fr' }: MyPurchasesStripProps) {
  if (purchases.length === 0) return null;
  const copy = PURCHASE_LISTEN_COPY[locale];

  return (
    <section className="mb-10" aria-label={copy.myPurchases}>
      <div className="flex items-baseline justify-between mb-4">
        <PageTitle as="h2" size="h5">
          {copy.myPurchases} ({purchases.length})
        </PageTitle>
        <Link href={translate(locale, '/mes-achats', '/en/my-purchases')} className="text-body text-grenadine font-medium hover:underline">
          {copy.viewAll}
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {purchases.slice(0, 6).map(({ tour: originalTour }) => {
          const tour = localizeTour(originalTour, locale);
          const published = tour.status === 'published';
          return (
          <PurchaseStripLink
            key={tour.id}
            href={published ? `${translate(locale, '', '/en')}/catalogue/${tour.citySlug}/${tour.slug}${LISTEN_ANCHOR}` : undefined}
            label={copy.label(tour.title)}
            testId={`purchase-strip-${tour.id}`}
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
            <p className="p-2 text-meta font-medium text-ink line-clamp-2">{tour.title}</p>
            {tour.metadataFallback && <p className="px-2 text-meta text-ink-60">{METADATA_FALLBACK_COPY[locale]}</p>}
            <span style={{ display: 'flex', alignItems: 'center', gap: tg.space[2], padding: tg.space[2], color: tg.colors.ink, fontSize: tg.fontSize.meta, fontWeight: 600 }}>
              {published && <Play size={14} aria-hidden="true" />}{published ? copy.listen : copy.unavailable}
            </span>
          </PurchaseStripLink>
        );})}
      </div>
    </section>
  );
}
