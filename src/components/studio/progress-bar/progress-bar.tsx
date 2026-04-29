'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { STUDIO_WORKFLOW_STEPS, type StudioWorkflowStep } from '@/types/studio';

interface ProgressBarProps {
  currentStep?: StudioWorkflowStep;
  completedSteps?: StudioWorkflowStep[];
}

const STEP_ROUTES: Record<StudioWorkflowStep, string> = {
  general: 'general',
  itinerary: 'itinerary',
  scenes: 'scenes',
  preview: 'preview',
  submission: 'submission',
};

const ROUTE_TO_STEP: Record<string, StudioWorkflowStep> = {
  general: 'general',
  itinerary: 'itinerary',
  scenes: 'scenes',
  edit: 'scenes',       // legacy route → scenes
  record: 'scenes',     // legacy route → scenes
  photos: 'scenes',     // legacy route → scenes
  preview: 'preview',
  submission: 'submission',
};

export function StudioProgressBar({ currentStep, completedSteps = [] }: ProgressBarProps) {
  const params = useParams<{ sessionId: string }>();
  const pathname = usePathname();
  const sessionId = params?.sessionId;

  // Derive active step from URL path (takes priority over store)
  const lastSegment = pathname?.split('/').filter(Boolean).pop() ?? '';
  const routeStep = ROUTE_TO_STEP[lastSegment];
  const activeStep = routeStep ?? currentStep;

  return (
    <nav aria-label="Progression du studio" className="py-3 px-4 bg-paper-soft border-b border-line">
      <ol className="flex items-center gap-1 overflow-x-auto">
        {STUDIO_WORKFLOW_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.key);
          const isCurrent = step.key === activeStep;
          const href = sessionId ? `/guide/studio/${sessionId}/${STEP_ROUTES[step.key]}` : '#';

          const className = `flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer ${
            isCurrent
              ? 'bg-grenadine-soft text-grenadine ring-2 ring-grenadine'
              : isCompleted
                ? 'bg-grenadine-soft text-grenadine hover:opacity-90'
                : 'bg-paper-soft text-ink-40 hover:bg-paper-deep hover:text-ink-80'
          }`;

          return (
            <li key={step.key} className="flex items-center">
              {index > 0 && (
                <div
                  className={`w-6 h-0.5 mx-1 ${isCompleted ? 'bg-grenadine' : 'bg-paper-deep'}`}
                  aria-hidden="true"
                />
              )}
              {sessionId ? (
                <Link href={href} className={className} aria-current={isCurrent ? 'step' : undefined}>
                  <span aria-hidden="true">{step.icon}</span>
                  <span>{step.label}</span>
                </Link>
              ) : (
                <div className={className} aria-current={isCurrent ? 'step' : undefined}>
                  <span aria-hidden="true">{step.icon}</span>
                  <span>{step.label}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
