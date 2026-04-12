'use client';

import type { StudioSession, TourLanguagePurchase } from '@/types/studio';
import { getSessionStatusConfig } from '@/lib/api/studio';

const LANG_FLAGS: Record<string, string> = {
  fr: '\u{1F1EB}\u{1F1F7}', en: '\u{1F1EC}\u{1F1E7}', es: '\u{1F1EA}\u{1F1F8}', it: '\u{1F1EE}\u{1F1F9}', de: '\u{1F1E9}\u{1F1EA}', pt: '\u{1F1F5}\u{1F1F9}', ja: '\u{1F1EF}\u{1F1F5}', zh: '\u{1F1E8}\u{1F1F3}',
};

const MOD_STATUS_DOT: Record<string, string> = {
  draft: 'bg-gray-300',
  submitted: 'bg-yellow-400',
  approved: 'bg-green-500',
  rejected: 'bg-red-500',
  revision_requested: 'bg-orange-400',
};

interface SessionCardProps {
  session: StudioSession;
  scenesCount?: number;
  purchases?: TourLanguagePurchase[];
  hasAdminFeedback?: boolean;
  onClick?: (sessionId: string) => void;
  /** When true, renders a compact sub-row inside a tour group */
  compact?: boolean;
}

function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function SessionCard({ session, scenesCount = 0, purchases = [], hasAdminFeedback = false, onClick, compact = false }: SessionCardProps) {
  const statusConfig = getSessionStatusConfig(session.status);
  const needsAttention = ['revision_requested', 'rejected'].includes(session.status);
  const version = session.version ?? 1;

  if (compact) {
    return (
      <button
        onClick={() => onClick?.(session.id)}
        className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-gray-50 group ${
          needsAttention ? 'bg-red-50' : ''
        }`}
        data-testid={`session-card-${session.id}`}
      >
        {/* Version badge */}
        <span className="text-xs font-semibold text-gray-500 w-6 shrink-0">V{version}</span>

        {/* Status */}
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${statusConfig.color}`}>
          {statusConfig.label}
        </span>

        {/* Scenes */}
        <span className="text-xs text-gray-500 shrink-0">{scenesCount} sc.</span>

        {/* Language badges */}
        <span className="flex items-center gap-1 shrink-0">
          <span className="text-xs">{LANG_FLAGS[session.language] ?? session.language.toUpperCase()}</span>
          {purchases.map((p) => (
            <span key={p.id} className="flex items-center gap-0.5" title={`${p.language.toUpperCase()} — ${p.moderationStatus}`}>
              <span className="text-xs">{LANG_FLAGS[p.language] ?? p.language.toUpperCase()}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${MOD_STATUS_DOT[p.moderationStatus] ?? 'bg-gray-300'}`} />
            </span>
          ))}
        </span>

        {/* Spacer */}
        <span className="flex-1" />

        {/* Alerts */}
        {needsAttention && <span className="text-red-500 text-xs animate-pulse shrink-0">Action requise</span>}
        {hasAdminFeedback && !needsAttention && <span className="text-amber-500 text-xs shrink-0">Retour admin</span>}

        {/* Date */}
        <span className="text-xs text-gray-400 shrink-0">{formatDateShort(session.createdAt)}</span>

        {/* Arrow */}
        <span className="text-gray-300 group-hover:text-teal-500 transition-colors shrink-0">&rsaquo;</span>
      </button>
    );
  }

  // Standalone card (used when session is not grouped by tour)
  return (
    <button
      onClick={() => onClick?.(session.id)}
      className={`w-full text-left bg-white rounded-lg border hover:shadow-sm transition-all px-4 py-3 group ${
        needsAttention ? 'border-red-300 bg-red-50' : hasAdminFeedback ? 'border-amber-300' : 'border-gray-200 hover:border-teal-300'
      }`}
      data-testid={`session-card-${session.id}`}
    >
      <div className="flex items-center gap-3">
        {/* Version badge */}
        {version > 1 && (
          <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-700 shrink-0">
            V{version}
          </span>
        )}

        {/* Title */}
        <h3 className="font-semibold text-gray-900 truncate group-hover:text-teal-700 transition-colors">
          {session.title || 'Session sans titre'}
        </h3>

        {/* Alerts */}
        {needsAttention && <span className="text-red-500 animate-pulse shrink-0" title="Action requise">!!</span>}
        {hasAdminFeedback && !needsAttention && <span className="text-amber-500 shrink-0" title="Retour admin">!</span>}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Inline stats */}
        <span className="hidden sm:flex items-center gap-3 text-xs text-gray-500 shrink-0">
          <span>{scenesCount} sc.</span>
          <span>{LANG_FLAGS[session.language] ?? session.language.toUpperCase()}</span>
          {purchases.map((p) => (
            <span key={p.id} className="flex items-center gap-0.5" title={`${p.language.toUpperCase()} — ${p.moderationStatus}`}>
              <span>{LANG_FLAGS[p.language] ?? p.language.toUpperCase()}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${MOD_STATUS_DOT[p.moderationStatus] ?? 'bg-gray-300'}`} />
            </span>
          ))}
        </span>

        {/* Status badge */}
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 ${statusConfig.color}`}>
          {statusConfig.label}
        </span>

        {/* Date */}
        <span className="text-xs text-gray-400 shrink-0">{formatDateShort(session.createdAt)}</span>

        {/* Arrow */}
        <span className="text-gray-300 group-hover:text-teal-500 transition-colors shrink-0">&rsaquo;</span>
      </div>
    </button>
  );
}
