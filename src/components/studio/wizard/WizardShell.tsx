'use client';

import Link from 'next/link';
import { getSessionStatusConfig } from '@/lib/api/studio';
import { WIZARD_TABS, type WizardTabKey } from '@/lib/studio/wizard-helpers';
import type { StudioSession } from '@/types/studio';

interface WizardShellProps {
  session: StudioSession | null;
  /** Currently active tab (highlights its underline). */
  activeTab: WizardTabKey;
  /** When true, the title area shows a skeleton instead of the session title. */
  headerLoading?: boolean;
  children: React.ReactNode;
}

/**
 * Extract the city name from a session title (everything before the first
 * em-dash, hyphen or comma). Falls back to the full title or "Tour".
 */
function cityFromTitle(title: string | null | undefined): string {
  if (!title) return 'Tour';
  return title.split(/[—\-,]/)[0]?.trim() || title.trim() || 'Tour';
}

/** Strip the city portion from the session title to keep just the parcours name. */
function parcoursFromTitle(title: string | null | undefined): string {
  if (!title) return 'Session sans titre';
  const i = title.search(/[—\-,]/);
  if (i < 0) return title.trim();
  return title.slice(i + 1).trim() || title.trim();
}

/**
 * <WizardShell> — sub-header sticky du wizard d'édition d'un tour.
 * Breadcrumb riche (← Sessions › City — Title + status pill + version + lang)
 * et tabs numérotées 01 à 06 avec underline grenadine sur l'actif.
 * Port de docs/design/ds/wizard-shared.jsx:13-65.
 */
export function WizardShell({
  session,
  activeTab,
  headerLoading = false,
  children,
}: WizardShellProps) {
  const sessionId = session?.id ?? '';
  const statusConfig = session ? getSessionStatusConfig(session.status) : null;
  const city = cityFromTitle(session?.title);
  const parcours = parcoursFromTitle(session?.title);

  return (
    <div className="flex flex-col h-full" data-testid="wizard-shell">
      {/* Sticky sub-header */}
      <div className="sticky top-0 z-20 bg-card border-b border-line shadow-sm px-6 pt-4 pb-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-3 flex-wrap text-meta text-ink-60">
          <Link
            href="/guide/studio/tours"
            className="text-ink-60 hover:text-grenadine transition no-underline"
            aria-label="Retour à la liste des tours"
          >
            ← Sessions
          </Link>
          <span className="text-ink-40">›</span>
          {headerLoading ? (
            <div className="h-5 w-48 bg-paper-soft rounded animate-pulse" />
          ) : (
            <>
              <span className="font-display text-body text-ink leading-none">{city}</span>
              <span className="text-ink-40">—</span>
              <span className="font-display text-body text-ink font-semibold leading-none">
                {parcours}
              </span>
              {(session?.version ?? 1) > 1 && (
                <span className="tg-eyebrow bg-paper-deep text-ink-60 px-2 py-0.5 rounded-pill ml-1">
                  V{session?.version}
                </span>
              )}
              {statusConfig && (
                <span
                  className={`tg-eyebrow px-2 py-0.5 rounded-pill ${statusConfig.color}`}
                  data-testid="wizard-status-pill"
                >
                  {statusConfig.label}
                </span>
              )}
              {session?.language && (
                <span className="tg-eyebrow bg-paper-deep text-ink-60 px-2 py-0.5 rounded-pill">
                  {session.language.toUpperCase()}
                </span>
              )}
            </>
          )}
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 -mb-px overflow-x-auto" aria-label="Onglets studio">
          {WIZARD_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            const href = tab.pathSuffix
              ? `/guide/studio/${sessionId}/${tab.pathSuffix}`
              : `/guide/studio/${sessionId}`;
            return (
              <Link
                key={tab.key}
                href={href}
                data-testid={`wizard-tab-${tab.key}`}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'whitespace-nowrap px-3 py-2.5 text-caption font-medium border-b-2 transition flex items-center gap-1.5 no-underline',
                  isActive
                    ? 'border-grenadine text-grenadine font-bold'
                    : 'border-transparent text-ink-60 hover:text-ink-80 hover:border-line',
                ].join(' ')}
              >
                <span
                  className={`font-mono text-meta ${isActive ? 'text-grenadine' : 'text-ink-40'} opacity-70`}
                  aria-hidden="true"
                >
                  {tab.number}
                </span>
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
