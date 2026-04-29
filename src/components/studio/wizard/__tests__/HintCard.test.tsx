import React from 'react';
import { render, screen } from '@testing-library/react';
import { HintCard } from '../HintCard';

describe('HintCard', () => {
  it('rend les enfants', () => {
    render(<HintCard>Astuce : enregistrez sur le terrain.</HintCard>);
    expect(screen.getByText(/Astuce/)).toBeInTheDocument();
  });

  it("variante mer par défaut (bg-mer-soft)", () => {
    const { container } = render(<HintCard>x</HintCard>);
    expect(container.querySelector('.bg-mer-soft')).not.toBeNull();
  });

  it("variante olive", () => {
    const { container } = render(<HintCard color="olive">x</HintCard>);
    expect(container.querySelector('.bg-olive-soft')).not.toBeNull();
  });

  it("variante ocre", () => {
    const { container } = render(<HintCard color="ocre">x</HintCard>);
    expect(container.querySelector('.bg-ocre-soft')).not.toBeNull();
  });

  it("rend un icône custom", () => {
    render(<HintCard icon="♪">contenu</HintCard>);
    expect(screen.getByText('♪')).toBeInTheDocument();
  });
});
