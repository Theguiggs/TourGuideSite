'use client';

import type { StudioSession, TourLanguagePurchase } from '@/types/studio';
import { getSessionStatusConfig } from '@/lib/api/studio';

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪', pt: '🇵🇹', ja: '🇯🇵', zh: '🇨🇳',
};

const MOD_STATUS_BADGES: Record<string, { label: string; color: string }> = {
  draft: { label: 'Brouillon', color: 'bg-gray-100 text-gray-500' },
  submitted: { label: 'Soumis', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'OK', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Refusé', color: 'bg-red-100 text-red-600' },
  revision_requested: { label: 'Révision', color: 'bg-orange-100 text-orange-600' },
};

interface SessionCardProps {
  session: StudioSession;
  scenesCount?: number;
  purchases?: TourLanguagePurchase[];
  hasAdminFeedback?: boolean;
  onClick?: (sessionId: string) => void;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SessionCard({ session, scenesCount = 0, purchases = [], hasAdminFeedback = false, onClick }: SessionCardProps) {
  const statusConfig = getSessionStatusConfig(session.status);
  const needsAttention = ['revision_requested', 'rejected'].includes(session.status);

  return (
    <button
      onClick={() => onClick?.(session.id)}
      className={`w-full text-left bg-white rounded-lg border hover:shadow-md transition-all p-4 group ${
        needsAttention ? 'border-red-300 bg-red-50' : hasAdminFeedback ? 'border-amber-300' : 'border-gray-200 hover:border-teal-300'
      }`}
      data-testid={`session-card-${session.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-teal-700 transition-colors">
              {session.title || 'Session sans titre'}
            </h3>
            {needsAttention && (
              <span className="flex-shrink-0 text-red-500 animate-pulse" title="Action requise">🔔</span>
            )}
            {hasAdminFeedback && !needsAttention && (
              <span className="flex-shrink-0 text-amber-500" title="Retour admin">💬</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(session.createdAt)}
            {session.version > 1 && <span className="ml-2 text-xs text-teal-600 font-medium">V{session.version}</span>}
          </p>
        </div>
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <span aria-hidden="true">🎬</span>
          {scenesCount} {scenesCount > 1 ? 'scenes' : 'scene'}
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">🌍</span>
          {session.language.toUpperCase()}
        </span>
        {session.tourId && (
          <span className="flex items-center gap-1 text-teal-600">
            <span aria-hidden="true">🔗</span>
            Tour li&eacute;
          </span>
        )}
      </div>

      {/* Language status badges */}
      {purchases.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {purchases.map((p) => {
            const badge = MOD_STATUS_BADGES[p.moderationStatus] ?? MOD_STATUS_BADGES.draft;
            return (
              <span
                key={p.id}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.color}`}
                title={`${p.language.toUpperCase()} — ${badge.label}`}
              >
                {LANG_FLAGS[p.language] ?? p.language.toUpperCase()} {badge.label}
              </span>
            );
          })}
        </div>
      )}
    </button>
  );
}
