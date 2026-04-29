'use client';

import type { StudioSession, TourLanguagePurchase } from '@/types/studio';
import { getSessionStatusConfig } from '@/lib/api/studio';

const LANG_FLAGS: Record<string, string> = {
  fr: '\u{1F1EB}\u{1F1F7}', en: '\u{1F1EC}\u{1F1E7}', es: '\u{1F1EA}\u{1F1F8}', it: '\u{1F1EE}\u{1F1F9}', de: '\u{1F1E9}\u{1F1EA}', pt: '\u{1F1F5}\u{1F1F9}', ja: '\u{1F1EF}\u{1F1F5}', zh: '\u{1F1E8}\u{1F1F3}',
};

const NON_DELETABLE_STATUSES = new Set(['published', 'archived']);

const MOD_STATUS_DOT: Record<string, string> = {
  draft: 'bg-paper-deep',
  submitted: 'bg-ocre',
  approved: 'bg-success',
  rejected: 'bg-danger',
  revision_requested: 'bg-ocre',
};

interface SessionCardProps {
  session: StudioSession;
  scenesCount?: number;
  purchases?: TourLanguagePurchase[];
  hasAdminFeedback?: boolean;
  onClick?: (sessionId: string) => void;
  onDelete?: (session: StudioSession) => void;
  /** When true, renders a compact sub-row inside a tour group */
  compact?: boolean;
}

function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function SessionCard({ session, scenesCount = 0, purchases = [], hasAdminFeedback = false, onClick, onDelete, compact = false }: SessionCardProps) {
  const statusConfig = getSessionStatusConfig(session.status);
  const needsAttention = ['revision_requested', 'rejected'].includes(session.status);
  const version = session.version ?? 1;
  const isDeletable = !NON_DELETABLE_STATUSES.has(session.status);

  if (compact) {
    return (
      <div
        className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition hover:bg-paper-soft group ${
          needsAttention ? 'bg-grenadine-soft' : ''
        }`}
        data-testid={`session-card-${session.id}`}
      >
        {/* Clickable navigation area */}
        <button
          onClick={() => onClick?.(session.id)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          {/* Version badge */}
          <span className="text-xs font-semibold text-ink-60 w-6 shrink-0">V{version}</span>

          {/* Status */}
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${statusConfig.color}`}>
            {statusConfig.label}
          </span>

          {/* Scenes */}
          <span className="text-xs text-ink-60 shrink-0">{scenesCount} sc.</span>

          {/* Language badges */}
          <span className="flex items-center gap-1 shrink-0">
            <span className="text-xs">{LANG_FLAGS[session.language] ?? session.language.toUpperCase()}</span>
            {purchases.map((p) => (
              <span key={p.id} className="flex items-center gap-0.5" title={`${p.language.toUpperCase()} — ${p.moderationStatus}`}>
                <span className="text-xs">{LANG_FLAGS[p.language] ?? p.language.toUpperCase()}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${MOD_STATUS_DOT[p.moderationStatus] ?? 'bg-paper-deep'}`} />
              </span>
            ))}
          </span>

          {/* Spacer */}
          <span className="flex-1" />

          {/* Alerts */}
          {needsAttention && <span className="text-danger text-xs animate-pulse shrink-0">Action requise</span>}
          {hasAdminFeedback && !needsAttention && <span className="text-ocre text-xs shrink-0">Retour admin</span>}

          {/* Date */}
          <span className="text-xs text-ink-40 shrink-0">{formatDateShort(session.createdAt)}</span>

          {/* Arrow */}
          <span className="text-ink-20 group-hover:text-grenadine transition shrink-0">&rsaquo;</span>
        </button>

        {/* Delete button */}
        {isDeletable && onDelete && (
          <button
            onClick={() => onDelete(session)}
            className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 p-1 text-ink-20 hover:text-danger rounded shrink-0"
            title="Supprimer cette session"
            data-testid={`delete-btn-${session.id}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  // Standalone card (used when session is not grouped by tour)
  return (
    <div
      className={`relative bg-white rounded-lg border hover:shadow-sm transition-all group ${
        needsAttention ? 'border-grenadine-soft bg-grenadine-soft' : hasAdminFeedback ? 'border-ocre-soft' : 'border-line hover:border-grenadine-soft'
      }`}
      data-testid={`session-card-${session.id}`}
    >
      {/* Clickable navigation area */}
      <button
        onClick={() => onClick?.(session.id)}
        className="w-full text-left px-4 py-3"
      >
        <div className="flex items-center gap-3">
          {/* Version badge */}
          {version > 1 && (
            <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-ocre-soft text-ocre shrink-0">
              V{version}
            </span>
          )}

          {/* Title */}
          <h3 className="font-semibold text-ink truncate group-hover:text-grenadine transition">
            {session.title || 'Session sans titre'}
          </h3>

          {/* Alerts */}
          {needsAttention && <span className="text-danger animate-pulse shrink-0" title="Action requise">!!</span>}
          {hasAdminFeedback && !needsAttention && <span className="text-ocre shrink-0" title="Retour admin">!</span>}

          {/* Spacer */}
          <span className="flex-1" />

          {/* Inline stats */}
          <span className="hidden sm:flex items-center gap-3 text-xs text-ink-60 shrink-0">
            <span>{scenesCount} sc.</span>
            <span>{LANG_FLAGS[session.language] ?? session.language.toUpperCase()}</span>
            {purchases.map((p) => (
              <span key={p.id} className="flex items-center gap-0.5" title={`${p.language.toUpperCase()} — ${p.moderationStatus}`}>
                <span>{LANG_FLAGS[p.language] ?? p.language.toUpperCase()}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${MOD_STATUS_DOT[p.moderationStatus] ?? 'bg-paper-deep'}`} />
              </span>
            ))}
          </span>

          {/* Status badge */}
          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${statusConfig.color}`}>
            {statusConfig.label}
          </span>

          {/* Date */}
          <span className="text-xs text-ink-40 shrink-0">{formatDateShort(session.createdAt)}</span>

          {/* Arrow */}
          <span className="text-ink-20 group-hover:text-grenadine transition shrink-0">&rsaquo;</span>
        </div>
      </button>

      {/* Delete button */}
      {isDeletable && onDelete && (
        <button
          onClick={() => onDelete(session)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-ink-20 hover:text-danger hover:bg-grenadine-soft rounded"
          title="Supprimer cette session"
          data-testid={`delete-btn-${session.id}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
