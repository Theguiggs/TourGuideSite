'use client';

interface LoadingSkeletonProps {
  /** Number of rows when shape='rows'. */
  count?: number;
  /** Shape of the skeleton :
   *  - 'rows'  : N rectangular rows (default 3) of `rowHeight`
   *  - 'card'  : single rounded-lg block of `height`
   *  - 'inline': inline-block 1em height (text placeholder)
   */
  shape?: 'rows' | 'card' | 'inline';
  /** Height for shape='card' (e.g. "h-48", "h-96"). */
  height?: string;
  /** Height for each row (shape='rows'). */
  rowHeight?: string;
  /** Optional aria-label for screen readers (default "Chargement…"). */
  label?: string;
}

/**
 * <LoadingSkeleton> — placeholder animé Murmure unifié.
 * Brief §7 Phase 5 (« skeletons cohérents, pas de spinner par défaut »).
 *
 * @example
 *   <LoadingSkeleton count={3} rowHeight="h-16" />
 *   <LoadingSkeleton shape="card" height="h-64" />
 */
export function LoadingSkeleton({
  count = 3,
  shape = 'rows',
  height = 'h-48',
  rowHeight = 'h-16',
  label = 'Chargement…',
}: LoadingSkeletonProps) {
  if (shape === 'inline') {
    return (
      <span
        aria-busy="true"
        aria-label={label}
        data-testid="loading-skeleton"
        className="inline-block w-24 h-4 bg-paper-deep rounded-sm animate-pulse"
      />
    );
  }

  if (shape === 'card') {
    return (
      <div
        aria-busy="true"
        aria-label={label}
        data-testid="loading-skeleton"
        className={`bg-card border border-line rounded-lg ${height} animate-pulse`}
      />
    );
  }

  return (
    <div aria-busy="true" aria-label={label} data-testid="loading-skeleton">
      <span className="sr-only">{label}</span>
      <div className="space-y-2.5">
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={`bg-card border border-line rounded-md animate-pulse ${rowHeight}`}
          />
        ))}
      </div>
    </div>
  );
}
