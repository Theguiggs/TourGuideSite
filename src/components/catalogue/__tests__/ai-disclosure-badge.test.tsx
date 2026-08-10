import { render, screen } from '@testing-library/react';
import { AiDisclosureBadge } from '../ai-disclosure-badge';

describe('<AiDisclosureBadge />', () => {
  it('labels seed-100 tours in French', () => {
    render(<AiDisclosureBadge tourId="seed-100-paris-montmartre-des-peintres" />);
    expect(screen.getByText('Développée avec l’IA')).toBeInTheDocument();
  });

  it('renders the full English disclosure on detail pages', () => {
    render(<AiDisclosureBadge tourId="seed-100-paris-montmartre-des-peintres" locale="en" detailed />);
    expect(screen.getByText('Developed with AI')).toBeInTheDocument();
    expect(screen.getByText(/reviewed and approved by Murmure/)).toBeInTheDocument();
  });

  it('does not label unrelated tours', () => {
    const { container } = render(<AiDisclosureBadge tourId="guide-tour-existing" />);
    expect(container).toBeEmptyDOMElement();
  });
});
