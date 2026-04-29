'use client';

interface ReviewItemProps {
  /** Display name of the reviewer. */
  author: string;
  /** Relative time label, e.g. "il y a 2h". */
  when: string;
  /** Tour title where this review was left. */
  tourTitle: string;
  /** Quote / message body. */
  quote: string;
  /** Star rating 1..5, or null if no rating. */
  rating: number | null;
}

/**
 * <ReviewItem> — card avis récent affichée sur le Dashboard.
 * Citation en font-editorial italic.
 * Port de docs/design/ds/studio-dashboard.jsx:127-141.
 */
export function ReviewItem({ author, when, tourTitle, quote, rating }: ReviewItemProps) {
  const initial = author.trim().charAt(0).toUpperCase() || '?';
  const stars = rating !== null ? Math.max(0, Math.min(5, Math.round(rating))) : null;

  return (
    <article
      className="bg-card border border-line rounded-lg p-4"
      data-testid="review-item"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-7 h-7 rounded-full bg-paper-deep text-ink-60 flex items-center justify-center text-meta font-bold shrink-0">
            {initial}
          </span>
          <div className="min-w-0">
            <div className="text-meta font-semibold text-ink truncate">{author}</div>
            <div className="text-meta text-ink-40 truncate">
              {when} · {tourTitle}
            </div>
          </div>
        </div>
        {stars !== null && (
          <div className="text-meta text-ocre font-bold shrink-0" aria-label={`${stars} étoiles sur 5`}>
            <span aria-hidden="true">{'★'.repeat(stars)}</span>
            <span aria-hidden="true" className="text-ink-20">
              {'★'.repeat(5 - stars)}
            </span>
          </div>
        )}
      </div>
      <p className="font-editorial italic text-caption text-ink-80 mt-2.5 leading-relaxed">
        {quote}
      </p>
    </article>
  );
}
