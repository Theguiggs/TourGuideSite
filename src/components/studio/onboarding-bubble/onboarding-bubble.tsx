'use client';

import { useOnboardingStore, type OnboardingFeature } from '@/lib/stores/onboarding-store';

interface OnboardingBubbleProps {
  feature: OnboardingFeature;
  title: string;
  description: string;
  position?: 'top' | 'bottom';
}

const FEATURE_TIPS: Record<OnboardingFeature, { icon: string }> = {
  general: { icon: '📋' },
  itinerary: { icon: '🗺️' },
  scenes: { icon: '🎬' },
  recording: { icon: '🎙️' },
  preview: { icon: '👁️' },
};

export function OnboardingBubble({ feature, title, description, position = 'bottom' }: OnboardingBubbleProps) {
  const shouldShow = useOnboardingStore((s) => s.shouldShowBubble(feature));
  const dismissFeature = useOnboardingStore((s) => s.dismissFeature);
  const dismissAll = useOnboardingStore((s) => s.dismissAll);

  if (!shouldShow) return null;

  const tip = FEATURE_TIPS[feature];

  return (
    <div
      className={`relative bg-teal-700 text-white rounded-lg p-3 shadow-lg max-w-sm ${
        position === 'top' ? 'mb-2' : 'mt-2'
      }`}
      role="tooltip"
      data-testid={`onboarding-${feature}`}
    >
      {/* Arrow */}
      <div className={`absolute ${position === 'top' ? 'bottom-0 translate-y-full' : 'top-0 -translate-y-full'} left-6 w-0 h-0 border-x-8 border-x-transparent ${position === 'top' ? 'border-t-8 border-t-teal-700' : 'border-b-8 border-b-teal-700'}`} />

      <div className="flex gap-2">
        <span className="text-xl flex-shrink-0" aria-hidden="true">{tip.icon}</span>
        <div className="flex-1">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-teal-100 mt-0.5">{description}</p>
        </div>
      </div>

      <div className="flex gap-2 mt-2 justify-end">
        <button
          onClick={() => dismissFeature(feature)}
          className="text-xs text-teal-200 hover:text-white px-2 py-0.5 rounded"
          data-testid={`dismiss-${feature}`}
        >
          Compris
        </button>
        <button
          onClick={dismissAll}
          className="text-xs text-teal-300 hover:text-white underline"
          data-testid="dismiss-all"
        >
          Ne plus afficher
        </button>
      </div>
    </div>
  );
}
