/**
 * Copie des bulles d'onboarding du Studio, en un seul endroit.
 *
 * Le composant et son store existaient depuis l'origine, complets et testés,
 * mais aucun écran ne les montait et `loadOnboarding()` n'était jamais appelé :
 * aucune bulle ne s'est donc jamais affichée, et l'état `studio_onboarding`
 * persistait dans le navigateur sans que rien ne le relise.
 *
 * Le texte vit ici plutôt que dans chaque page : cinq appels dispersés auraient
 * fait diverger la voix d'une étape à l'autre.
 */

import type { OnboardingFeature } from '@/lib/stores/onboarding-store';

export interface OnboardingTip {
  title: string;
  description: string;
}

const TIPS_FR: Record<OnboardingFeature, OnboardingTip> = {
  general: {
    title: 'Commencez par le titre et la ville',
    description:
      'Ces informations nomment votre visite dans le catalogue. La couverture est enregistrée dès que vous la choisissez.',
  },
  itinerary: {
    title: 'Placez vos points d’intérêt',
    description:
      'Déplacez chaque marqueur jusqu’à l’endroit exact où le visiteur doit s’arrêter. L’ordre des points fait l’ordre du parcours.',
  },
  scenes: {
    title: 'Une scène par point d’intérêt',
    description:
      'Visez 150 à 225 mots par scène, soit une minute à une minute trente d’écoute. Titre et texte sont exigés avant la soumission.',
  },
  recording: {
    title: 'Le prompteur suit votre voix',
    description:
      'Espace met en pause, Échap arrête. Chaque prise est sauvegardée sur votre visite dès que vous la sélectionnez.',
  },
  preview: {
    title: 'Écoutez avant de soumettre',
    description:
      'L’aperçu montre exactement ce que verra le visiteur. Vérifiez l’enchaînement des scènes et la carte avant de publier.',
  },
};

const TIPS_EN: Record<OnboardingFeature, OnboardingTip> = {
  general: {
    title: 'Start with the title and city',
    description:
      'These name your tour in the catalogue. The cover image is saved as soon as you pick it.',
  },
  itinerary: {
    title: 'Place your points of interest',
    description:
      'Drag each marker to the exact spot where the visitor should stop. The order of the points is the order of the walk.',
  },
  scenes: {
    title: 'One scene per point of interest',
    description:
      'Aim for 150 to 225 words per scene, about 60 to 90 seconds of audio. Title and text are required before submission.',
  },
  recording: {
    title: 'The teleprompter follows your voice',
    description:
      'Space pauses, Escape stops. Every take is saved to your tour as soon as you select it.',
  },
  preview: {
    title: 'Listen before you submit',
    description:
      'The preview shows exactly what the visitor will see. Check the scene order and the map before publishing.',
  },
};

export function onboardingTip(feature: OnboardingFeature, locale: 'fr' | 'en'): OnboardingTip {
  return (locale === 'en' ? TIPS_EN : TIPS_FR)[feature];
}
