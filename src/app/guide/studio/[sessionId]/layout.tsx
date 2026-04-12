'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useStudioSessionStore, selectActiveSession, selectSetActiveSession } from '@/lib/stores/studio-session-store';
import { getStudioSession, getSessionStatusConfig } from '@/lib/api/studio';

const TABS = [
  { key: '', label: 'Accueil', testId: 'accueil-link' },
  { key: 'general', label: 'Général', testId: 'general-link' },
  { key: 'itinerary', label: 'Itinéraire', testId: 'itinerary-link' },
  { key: 'scenes', label: 'Scènes', testId: 'scenes-link' },
  { key: 'preview', label: 'Preview', testId: 'preview-link-top' },
  { key: 'submission', label: 'Publication', testId: 'submission-link' },
] as const;

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ sessionId: string }>();
  const pathname = usePathname();
  const sessionId = params.sessionId;

  const session = useStudioSessionStore(selectActiveSession);
  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const [fetchDone, setFetchDone] = useState(false);
  const fetchStartedRef = useRef(false);

  // Header loading is derived: no session yet AND fetch hasn't completed
  const headerLoading = !session && !fetchDone;

  // Load session from API if not already in store
  useEffect(() => {
    if (session || fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    let cancelled = false;
    getStudioSession(sessionId).then((sess) => {
      if (cancelled) return;
      if (sess) setActiveSession(sess);
      setFetchDone(true);
    });
    return () => { cancelled = true; };
  }, [sessionId, session, setActiveSession]);

  // Determine active tab from pathname
  const pathSuffix = pathname.replace(`/guide/studio/${sessionId}`, '').replace(/^\//, '');
  const activeTab = TABS.find((t) => t.key === pathSuffix)?.key
    ?? TABS.find((t) => t.key && pathSuffix.startsWith(t.key))?.key
    ?? '';

  const statusConfig = session ? getSessionStatusConfig(session.status) : null;

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header with tour title + tabs */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-6 pt-4 pb-0">
        {/* Back link + title */}
        <div className="flex items-center gap-3 mb-2">
          <Link href="/guide/studio" className="text-teal-600 hover:text-teal-700 text-sm shrink-0">
            &larr; Sessions
          </Link>
          <span className="text-gray-300">|</span>
          {headerLoading ? (
            <div className="h-6 w-48 bg-gray-100 rounded animate-pulse" />
          ) : (
            <>
              <h1 className="text-lg font-bold text-gray-900 truncate">
                {session?.title || 'Session sans titre'}
              </h1>
              {(session?.version ?? 1) > 1 && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 shrink-0">
                  V{session?.version}
                </span>
              )}
              {statusConfig && (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              )}
              {session?.language && (
                <span className="text-xs text-gray-400 shrink-0">{session.language.toUpperCase()}</span>
              )}
            </>
          )}
        </div>

        {/* Tab navigation */}
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Onglets studio">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const href = tab.key
              ? `/guide/studio/${sessionId}/${tab.key}`
              : `/guide/studio/${sessionId}`;
            return (
              <Link
                key={tab.key}
                href={href}
                data-testid={tab.testId}
                className={`whitespace-nowrap px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
