'use client';

import type { StudioSession } from '@/types/studio';
import { getSessionStatusConfig } from '@/lib/api/studio';

interface SessionCardProps {
  session: StudioSession;
  scenesCount?: number;
  onClick?: (sessionId: string) => void;
}

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function SessionCard({ session, scenesCount = 0, onClick }: SessionCardProps) {
  const statusConfig = getSessionStatusConfig(session.status);

  return (
    <button
      onClick={() => onClick?.(session.id)}
      className="w-full text-left bg-white rounded-lg border border-gray-200 hover:border-teal-300 hover:shadow-md transition-all p-4 group"
      data-testid={`session-card-${session.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-teal-700 transition-colors">
            {session.title || 'Session sans titre'}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {formatDate(session.createdAt)}
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
    </button>
  );
}
