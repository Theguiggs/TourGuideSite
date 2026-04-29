'use client';

import type {
  TourSortBy,
  TourStatusFilter,
} from '@/lib/studio/tours-list-helpers';

interface TourFiltersProps {
  query: string;
  onQueryChange: (q: string) => void;
  statusFilter: TourStatusFilter;
  onStatusFilterChange: (f: TourStatusFilter) => void;
  sortBy: TourSortBy;
  onSortByChange: (s: TourSortBy) => void;
  /** Counts displayed in each tab (provided by `bucketCounts(sessions)`). */
  counts: Record<TourStatusFilter, number>;
}

const TABS: ReadonlyArray<{ key: TourStatusFilter; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'live', label: 'En ligne' },
  { key: 'draft', label: 'Brouillons' },
  { key: 'review', label: 'En relecture' },
];

const SORT_OPTIONS: ReadonlyArray<{ key: TourSortBy; label: string }> = [
  { key: 'most_played', label: 'Plus écoutés' },
  { key: 'recently_modified', label: 'Récemment modifiés' },
  { key: 'alphabetical', label: 'Alphabétique' },
];

/**
 * <TourFilters> — barre de filtres pour la page Mes tours.
 * Search input pill + tabs status + tri select.
 * Port de docs/design/ds/studio-tours.jsx:46-72.
 */
export function TourFilters({
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  counts,
}: TourFiltersProps) {
  return (
    <div className="flex gap-2.5 items-center flex-wrap" data-testid="tour-filters">
      {/* Search */}
      <div className="relative flex-1 max-w-sm min-w-[220px]">
        <input
          type="search"
          placeholder="Chercher un tour…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label="Chercher un tour"
          data-testid="tour-filters-search"
          className="w-full pl-10 pr-4 py-2.5 text-caption border border-line rounded-pill bg-paper text-ink outline-none focus:border-grenadine transition placeholder:text-ink-40"
        />
        <span
          aria-hidden="true"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-40 text-caption"
        >
          ⌕
        </span>
      </div>

      {/* Status tabs */}
      {TABS.map((t) => {
        const isActive = t.key === statusFilter;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onStatusFilterChange(t.key)}
            data-testid={`tour-filters-tab-${t.key}`}
            aria-pressed={isActive}
            className={[
              'px-3.5 py-2 rounded-pill text-caption font-semibold transition border',
              isActive
                ? 'bg-ink text-paper border-ink'
                : 'bg-paper text-ink-80 border-line hover:bg-paper-soft',
            ].join(' ')}
          >
            {t.label} <span className="opacity-60">·</span> {counts[t.key]}
          </button>
        );
      })}

      {/* Sort */}
      <div className="ml-auto flex gap-2 items-center text-meta text-ink-60">
        <label htmlFor="tour-sort">Tri&nbsp;:</label>
        <select
          id="tour-sort"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as TourSortBy)}
          data-testid="tour-filters-sort"
          className="px-2.5 py-2 rounded-md border border-line bg-paper text-meta text-ink outline-none focus:border-grenadine"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
