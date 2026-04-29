import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SuggestionCard } from '../SuggestionCard';

describe('SuggestionCard', () => {
  it('rend eyebrow, title, body et CTA', () => {
    render(
      <SuggestionCard
        eyebrow="Suggestion · une action recommandée"
        title="Un titre"
        body="Un texte explicatif."
        ctaLabel="Lancer"
        ctaHref="/somewhere"
      />,
    );
    expect(screen.getByText(/Suggestion/)).toBeInTheDocument();
    expect(screen.getByText('Un titre')).toBeInTheDocument();
    expect(screen.getByText('Un texte explicatif.')).toBeInTheDocument();
    expect(screen.getByTestId('suggestion-cta')).toHaveTextContent('Lancer');
  });

  it("rend un Link quand ctaHref fourni", () => {
    render(
      <SuggestionCard
        eyebrow="x"
        title="t"
        body="b"
        ctaLabel="Aller"
        ctaHref="/somewhere"
      />,
    );
    expect(screen.getByTestId('suggestion-cta')).toHaveAttribute('href', '/somewhere');
  });

  it("rend un button + déclenche ctaOnClick quand pas de href", () => {
    const onClick = jest.fn();
    render(
      <SuggestionCard
        eyebrow="x"
        title="t"
        body="b"
        ctaLabel="Action"
        ctaOnClick={onClick}
      />,
    );
    fireEvent.click(screen.getByTestId('suggestion-cta'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("supporte la variante color olive", () => {
    const { container } = render(
      <SuggestionCard
        eyebrow="x"
        title="t"
        body="b"
        ctaLabel="A"
        ctaHref="/x"
        color="olive"
      />,
    );
    expect(container.querySelector('.bg-olive-soft')).not.toBeNull();
  });
});
