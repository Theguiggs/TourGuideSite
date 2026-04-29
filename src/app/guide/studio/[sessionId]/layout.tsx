'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import {
  useStudioSessionStore,
  selectActiveSession,
  selectSetActiveSession,
} from '@/lib/stores/studio-session-store';
import { getStudioSession } from '@/lib/api/studio';
import { WizardShell } from '@/components/studio/wizard';
import { WIZARD_TABS, type WizardTabKey } from '@/lib/studio/wizard-helpers';

function resolveActiveTab(pathname: string, sessionId: string): WizardTabKey {
  const suffix = pathname.replace(`/guide/studio/${sessionId}`, '').replace(/^\//, '');
  if (suffix === '') return 'accueil';
  for (const tab of WIZARD_TABS) {
    if (tab.pathSuffix && suffix.startsWith(tab.pathSuffix)) {
      return tab.key;
    }
  }
  // Sub-routes spéciales (record, edit, photos, cleanup) → on garde Scènes actif
  return 'scenes';
}

export default function SessionLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ sessionId: string }>();
  const pathname = usePathname();
  const sessionId = params.sessionId;

  const session = useStudioSessionStore(selectActiveSession);
  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  const [fetchDone, setFetchDone] = useState(false);
  const fetchStartedRef = useRef(false);

  const headerLoading = !session && !fetchDone;

  useEffect(() => {
    if (session || fetchStartedRef.current) return;
    fetchStartedRef.current = true;
    let cancelled = false;
    getStudioSession(sessionId).then((sess) => {
      if (cancelled) return;
      if (sess) setActiveSession(sess);
      setFetchDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId, session, setActiveSession]);

  const activeTab = useMemo(
    () => resolveActiveTab(pathname ?? '', sessionId),
    [pathname, sessionId],
  );

  return (
    <WizardShell session={session} activeTab={activeTab} headerLoading={headerLoading}>
      {children}
    </WizardShell>
  );
}
