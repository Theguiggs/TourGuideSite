import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingBubble } from '../onboarding-bubble';
import { useOnboardingStore } from '@/lib/stores/onboarding-store';

describe('OnboardingBubble', () => {
  beforeEach(() => {
    useOnboardingStore.getState().resetOnboarding();
  });

  it('renders bubble for undismissed feature', () => {
    render(<OnboardingBubble feature="general" title="Bienvenue" description="Commencez ici" />);
    expect(screen.getByTestId('onboarding-general')).toBeInTheDocument();
    expect(screen.getByText('Bienvenue')).toBeInTheDocument();
  });

  it('hides after dismissing feature', () => {
    useOnboardingStore.getState().dismissFeature('general');
    const { container } = render(<OnboardingBubble feature="general" title="Test" description="Test" />);
    expect(container.firstChild).toBeNull();
  });

  it('hides after dismissAll', () => {
    useOnboardingStore.getState().dismissAll();
    const { container } = render(<OnboardingBubble feature="scenes" title="Test" description="Test" />);
    expect(container.firstChild).toBeNull();
  });

  it('dismiss button works', () => {
    render(<OnboardingBubble feature="itinerary" title="Carte" description="Glissez les POIs" />);
    fireEvent.click(screen.getByTestId('dismiss-itinerary'));
    expect(useOnboardingStore.getState().shouldShowBubble('itinerary')).toBe(false);
  });

  it('has tooltip role', () => {
    render(<OnboardingBubble feature="general" title="Test" description="Test" />);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });
});
