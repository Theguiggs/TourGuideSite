'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import {
  useStudioSessionStore,
  selectActiveSession,
  selectSetActiveSession,
} from '@/lib/stores/studio-session-store';
import { getStudioSession } from '@/lib/api/studio';
import { logger } from '@/lib/logger';
import { WizardShell } from '@/components/studio/wizard';
import { WIZARD_TABS, type WizardTabKey } from '@/lib/studio/wizard-helpers';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

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
  const { t } = useStudioLocale();
  // `t` est lu via une ref dans l'effet de chargement : l'ajouter à ses
  // dépendances annulerait une lecture en cours à chaque bascule de langue.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const session = useStudioSessionStore(selectActiveSession);
  const setActiveSession = useStudioSessionStore(selectSetActiveSession);
  /**
   * Issue de la dernière lecture, ESTAMPILLÉE de l'identifiant concerné.
   *
   * L'estampille remplace une remise à zéro synchrone au changement de session :
   * un état daté d'une autre session ne peut ni masquer le squelette, ni
   * afficher l'erreur de la précédente, sans qu'aucun `setState` n'ait à être
   * appelé dans le corps de l'effet.
   */
  const [loadOutcome, setLoadOutcome] = useState<{ sessionId: string; error: string | null } | null>(null);
  /** Identifiant pour lequel une lecture a déjà été lancée. */
  const fetchedForRef = useRef<string | null>(null);

  // La session du store n'est la bonne QUE si son identifiant est celui de la
  // route. La condition portait sur la simple présence d'une session : ouvrir
  // une seconde session sans démontage complet laissait l'en-tête du wizard
  // afficher le titre, le statut et la version de la PRÉCÉDENTE.
  const sessionMatches = session?.id === sessionId;
  const fetchDone = loadOutcome?.sessionId === sessionId;
  const loadError = fetchDone ? loadOutcome!.error : null;
  const headerLoading = !sessionMatches && !fetchDone;

  useEffect(() => {
    if (sessionMatches) return;
    // Le garde de relecture est réarmé à chaque changement d'identifiant ; il ne
    // l'était jamais, si bien qu'aucune seconde lecture n'avait lieu.
    if (fetchedForRef.current === sessionId) return;
    fetchedForRef.current = sessionId;

    let cancelled = false;
    getStudioSession(sessionId)
      .then((sess) => {
        if (cancelled) return;
        if (sess) setActiveSession(sess);
        setLoadOutcome({ sessionId, error: sess ? null : tRef.current('Session introuvable.', 'Session not found.') });
      })
      .catch((e: unknown) => {
        // Le rejet n'était pas traité : la lecture restait « en cours » pour
        // toujours et l'en-tête gardait son squelette, sans jamais dire pourquoi.
        if (cancelled) return;
        logger.error('SessionLayout', 'Session load failed', { sessionId, error: String(e) });
        setLoadOutcome({ sessionId, error: tRef.current('Impossible de charger cette session.', 'Unable to load this session.') });
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, sessionMatches, setActiveSession]);

  const activeTab = useMemo(
    () => resolveActiveTab(pathname ?? '', sessionId),
    [pathname, sessionId],
  );

  return (
    <WizardShell
      session={sessionMatches ? session : null}
      routeSessionId={sessionId}
      activeTab={activeTab}
      headerLoading={headerLoading}
    >
      {loadError && (
        <div className="mx-4 mt-3 rounded-lg border border-danger bg-grenadine-soft p-3 sm:mx-6" role="alert">
          <p className="text-caption text-ink">{loadError}</p>
          <button
            onClick={() => {
              fetchedForRef.current = null;
              setLoadOutcome(null);
            }}
            className="mt-2 rounded-lg border border-ocre bg-ocre-soft px-3 py-1.5 text-caption font-medium text-ink transition hover:opacity-90"
          >
            {t('Réessayer', 'Retry')}
          </button>
        </div>
      )}
      {children}
    </WizardShell>
  );
}
