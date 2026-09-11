'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getSessionStatusConfig } from '@/lib/api/studio';
import { sessionStatusLabel } from '@/lib/studio/status-labels';
import { WIZARD_TABS, type WizardTabKey } from '@/lib/studio/wizard-helpers';
import { OnboardingBubble } from '@/components/studio/onboarding-bubble';
import { useOnboardingStore, type OnboardingFeature } from '@/lib/stores/onboarding-store';
import type { StudioSession } from '@/types/studio';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

/**
 * Onglets du wizard porteurs d'une bulle d'aide. `accueil` et `submission` n'en
 * ont pas : le premier est une page de reprise, le second porte déjà sa propre
 * checklist. `recording` existe côté store mais vit hors du wizard (page
 * /record), qui monte sa bulle elle-même.
 */
const TAB_ONBOARDING: Partial<Record<WizardTabKey, OnboardingFeature>> = {
  general: 'general',
  itinerary: 'itinerary',
  scenes: 'scenes',
  preview: 'preview',
};

interface WizardShellProps {
  session: StudioSession | null;
  /** Route identifier available before the session query resolves. */
  routeSessionId?: string;
  /** Currently active tab (highlights its underline). */
  activeTab: WizardTabKey;
  /** When true, the title area shows a skeleton instead of the session title. */
  headerLoading?: boolean;
  children: React.ReactNode;
}

/**
 * <WizardShell> — sub-header sticky du wizard d'édition d'un tour.
 * Fil d'Ariane (← Visites › Titre complet + pastille statut + version + langue)
 * et tabs numérotées 01 à 06 avec underline grenadine sur l'actif.
 * Port de docs/design/ds/wizard-shared.jsx:13-65.
 */
export function WizardShell({
  session,
  routeSessionId,
  activeTab,
  headerLoading = false,
  children,
}: WizardShellProps) {
  const { locale } = useStudioLocale();
  const loadOnboarding = useOnboardingStore((s) => s.loadOnboarding);
  // Relit le choix du guide (« Compris », « Ne plus afficher ») au montage du
  // wizard. Sans cet appel, l'état persisté n'était jamais rechargé et le store
  // repartait de ses valeurs par défaut à chaque ouverture d'onglet.
  useEffect(() => {
    loadOnboarding();
  }, [loadOnboarding]);

  const sessionId = session?.id ?? routeSessionId ?? '';
  const onboardingFeature = TAB_ONBOARDING[activeTab];
  const statusConfig = session ? getSessionStatusConfig(session.status) : null;
  // Le titre est affiché ENTIER : le découpage sur tiret rendait « Saint » pour « Saint-Paul-de-Vence ».
  const title = session?.title?.trim() || (locale === 'en' ? 'Untitled tour' : 'Visite sans titre');
  const tabLabels: Record<WizardTabKey, string> = locale === 'en'
    ? { accueil: 'Overview', general: 'Details', itinerary: 'Itinerary', scenes: 'Scenes', preview: 'Preview', submission: 'Publish' }
    : { accueil: 'Accueil', general: 'Général', itinerary: 'Itinéraire', scenes: 'Scènes', preview: 'Aperçu', submission: 'Publication' };

  return (
    <div className="flex flex-col h-full" data-testid="wizard-shell">
      {/* Sticky sub-header */}
      <div className="sticky top-0 z-20 border-b border-line bg-card px-4 pt-3 shadow-sm sm:px-6 sm:pt-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 mb-3 flex-wrap text-meta text-ink-60">
          <Link
            href="/guide/studio/tours"
            className="text-ink-60 hover:text-grenadine transition no-underline"
            aria-label={locale === 'en' ? 'Back to tours' : 'Retour à la liste des visites'}
          >
            <span className="inline-flex items-center gap-1"><ArrowLeft size={14} aria-hidden="true" />{locale === 'en' ? 'Tours' : 'Visites'}</span>
          </Link>
          <span className="text-ink-40">›</span>
          {headerLoading ? (
            <div className="h-5 w-48 bg-paper-soft rounded animate-pulse" />
          ) : (
            <>
              <span className="font-display text-body text-ink font-semibold leading-none" data-testid="wizard-title">
                {title}
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
                  {session ? sessionStatusLabel(session.status, locale) : statusConfig.label}
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
        <nav className="-mb-px flex gap-1 overflow-x-auto" aria-label={locale === 'en' ? 'Studio tabs' : 'Onglets Studio'}>
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
                {tabLabels[tab.key] ?? tab.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {onboardingFeature && (
          <div className="px-4 pt-3 sm:px-6">
            <OnboardingBubble feature={onboardingFeature} position="bottom" />
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
