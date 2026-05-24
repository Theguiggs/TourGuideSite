'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { listTourReviews, getGuideTourById } from '@/lib/api/appsync-client';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'GuideTourReviewsPage';

interface Review {
  id: string;
  tourId: string;
  userId: string;
  rating: number;
  comment?: string | null;
  visitedAt?: number | null;
  language?: string | null;
  status?: string | null;
  createdAt: string;
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? 'text-ocre' : 'text-ink-20'}>
          {i <= rating ? '★' : '☆'}
        </span>
      ))}
    </div>
  );
}

export default function TourReviewsPage({ params }: { params: Promise<{ tourId: string }> }) {
  const { tourId } = use(params);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [tourTitle, setTourTitle] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tour, reviewsList] = await Promise.all([
          getGuideTourById(tourId),
          listTourReviews(tourId),
        ]);
        setTourTitle(tour?.title ?? tourId);
        setReviews(reviewsList as Review[]);
      } catch (err) {
        logger.error(SERVICE_NAME, 'Failed to load reviews', { error: String(err) });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tourId]);

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length
      : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-caption text-ink-40">Chargement des avis…</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/guide/tours"
          className="text-caption text-grenadine hover:underline underline-offset-2 no-underline"
        >
          ← Retour aux parcours
        </Link>
      </div>

      <h1 className="font-display text-h4 text-ink mb-2 leading-none">Avis des visiteurs</h1>
      <p className="font-editorial italic text-body-lg text-ink-60 mb-8">{tourTitle}</p>

      {/* Summary */}
      <div className="bg-card rounded-md shadow-sm border border-line p-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="text-center shrink-0">
            <div className="font-display text-h2 text-ink leading-none">
              {averageRating.toFixed(1)}
            </div>
            <div className="mt-2 flex justify-center">
              <StarDisplay rating={Math.round(averageRating)} />
            </div>
            <div className="text-meta text-ink-60 mt-1">
              {reviews.length} avis
            </div>
          </div>
          <div className="flex-1 space-y-1">
            {ratingDistribution.map(({ stars, count }) => {
              const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2 text-caption">
                  <span className="w-6 text-ink-60">{stars}★</span>
                  <div className="flex-1 bg-paper-deep rounded-pill h-2 overflow-hidden">
                    <div
                      className="bg-ocre h-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-ink-60">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-caption text-ink-40 italic">
          <p>Pas encore d&apos;avis sur ce parcours.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-card rounded-md shadow-sm border border-line p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <StarDisplay rating={review.rating} />
                <span className="text-meta text-ink-40">
                  {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {review.comment && (
                <p className="text-caption text-ink-80 leading-relaxed">{review.comment}</p>
              )}
              {!review.comment && (
                <p className="text-meta text-ink-40 italic">
                  Note sans commentaire
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
