export type AiDisclosureLocale = 'fr' | 'en';

const AI_DEVELOPED_TOUR_PREFIXES = ['seed-100-'] as const;

export function isAiDevelopedTour(tourId: string): boolean {
  return AI_DEVELOPED_TOUR_PREFIXES.some((prefix) => tourId.startsWith(prefix));
}

export const AI_DISCLOSURE_COPY = {
  fr: {
    badge: "Développée avec l’IA",
    detail:
      "Textes, traductions et voix de synthèse développés avec l’intelligence artificielle, puis contrôlés et validés par Murmure.",
  },
  en: {
    badge: 'Developed with AI',
    detail:
      'Text, translations and synthetic narration developed with artificial intelligence, then reviewed and approved by Murmure.',
  },
} as const satisfies Record<AiDisclosureLocale, { badge: string; detail: string }>;
