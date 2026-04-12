'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
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
    <div className="flex gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= rating ? 'text-amber-400' : 'text-gray-300'}>
          {i <= rating ? '\u2605' : '\u2606'}
        </span>
      ))}
    </div>
  );
}

export default function TourReviewsPage({ params }: { params: Promise<{ tourId: string }> }) {
  const { tourId } = use(params);
  const { user } = useAuth();
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
        <div className="text-gray-500">Chargement des avis...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/guide/tours" className="text-teal-700 hover:underline text-sm">
          ← Retour aux parcours
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Avis des visiteurs</h1>
      <p className="text-lg text-gray-600 mb-8">{tourTitle}</p>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </div>
            <StarDisplay rating={Math.round(averageRating)} />
            <div className="text-sm text-gray-500 mt-1">
              {reviews.length} avis
            </div>
          </div>
          <div className="flex-1 space-y-1">
            {ratingDistribution.map(({ stars, count }) => {
              const percent = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-2 text-sm">
                  <span className="w-6 text-gray-600">{stars}★</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-gray-500">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Pas encore d&apos;avis sur ce parcours.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl shadow-sm border p-5">
              <div className="flex items-start justify-between mb-3">
                <StarDisplay rating={review.rating} />
                <span className="text-xs text-gray-400">
                  {new Date(review.createdAt).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {review.comment && (
                <p className="text-gray-700 leading-relaxed">{review.comment}</p>
              )}
              {!review.comment && (
                <p className="text-gray-400 italic text-sm">
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
