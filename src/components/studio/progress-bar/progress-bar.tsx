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
  submission: 'preview', // submission is on the preview page
};

const ROUTE_TO_STEP: Record<string, StudioWorkflowStep> = {
  general: 'general',
  itinerary: 'itinerary',
  scenes: 'scenes',
  edit: 'scenes',       // legacy route → scenes
  record: 'scenes',     // legacy route → scenes
  photos: 'scenes',     // legacy route → scenes
  preview: 'preview',
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
    <nav aria-label="Progression du studio" className="py-3 px-4 bg-gray-50 border-b border-gray-200">
      <ol className="flex items-center gap-1 overflow-x-auto">
        {STUDIO_WORKFLOW_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.key);
          const isCurrent = step.key === activeStep;
          const href = sessionId ? `/guide/studio/${sessionId}/${STEP_ROUTES[step.key]}` : '#';

          const className = `flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
            isCurrent
              ? 'bg-teal-100 text-teal-700 ring-2 ring-teal-400'
              : isCompleted
                ? 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          }`;

          return (
            <li key={step.key} className="flex items-center">
              {index > 0 && (
                <div
                  className={`w-6 h-0.5 mx-1 ${isCompleted ? 'bg-teal-400' : 'bg-gray-300'}`}
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
