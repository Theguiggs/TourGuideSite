'use client';

import { useState } from 'react';

interface SessionTerrainCardProps {
  /** Number of scenes captured during the field session. */
  scenesCount: number;
  /** Field session creation date (ISO). */
  capturedAt?: string | null;
  /** Source session status, if available. */
  status?: string | null;
  /** Optional collapsed by default. */
  defaultCollapsed?: boolean;
}

function formatDateFR(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * <SessionTerrainCard> — accordion read-only résumé de la session terrain
 * (capture in-situ qui a donné naissance au tour studio).
 * Header mer-soft, body avec rangées scènes / statut / date.
 * Port de docs/design/ds/wizard-2-general.jsx:115-134.
 */
export function SessionTerrainCard({
  scenesCount,
  capturedAt,
  status,
  defaultCollapsed = false,
}: SessionTerrainCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const dateLabel = formatDateFR(capturedAt);

  return (
    <div
      className="bg-card border border-line rounded-md overflow-hidden"
      data-testid="session-terrain-card"
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        data-testid="session-terrain-toggle"
        className="w-full px-5 py-3.5 flex items-center justify-between gap-3 bg-mer-soft border-b border-line cursor-pointer hover:bg-mer-soft/80 transition text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="w-7 h-7 rounded-sm bg-mer text-paper flex items-center justify-center text-meta shrink-0"
          >
            ◉
          </span>
          <div className="min-w-0">
            <div className="text-caption font-bold text-ink truncate">
              Session terrain · {scenesCount} scène{scenesCount > 1 ? 's' : ''}
              {capturedAt && ` · ${dateLabel}`}
            </div>
            <div className="text-meta text-ink-60">
              Capture audio in-situ — à l&apos;origine du tour
            </div>
          </div>
        </div>
        <span aria-hidden="true" className="text-ink-60 text-caption">
          {collapsed ? '▸' : '▼'}
        </span>
      </button>
      {!collapsed && (
        <div
          className="px-5 py-3.5 grid gap-x-4 gap-y-2.5 text-caption"
          style={{ gridTemplateColumns: '120px 1fr' }}
        >
          <span className="text-ink-60">Scènes</span>
          <span className="text-ink font-semibold">{scenesCount}</span>
          {status && (
            <>
              <span className="text-ink-60">Statut</span>
              <span className="text-ink font-semibold">{status}</span>
            </>
          )}
          <span className="text-ink-60">Créée le</span>
          <span className="text-ink font-semibold">{dateLabel}</span>
        </div>
      )}
    </div>
  );
}
