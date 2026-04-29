import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReviewItem } from '../ReviewItem';

describe('ReviewItem', () => {
  it('affiche author, date relative, tour titre et citation', () => {
    render(
      <ReviewItem
        author="Camille D."
        when="il y a 2h"
        tourTitle="Vieux Cannes secret"
        quote="Magnifique récit"
        rating={5}
      />,
    );
    expect(screen.getByText('Camille D.')).toBeInTheDocument();
    expect(screen.getByText(/il y a 2h/)).toBeInTheDocument();
    expect(screen.getByText(/Vieux Cannes secret/)).toBeInTheDocument();
    expect(screen.getByText('Magnifique récit')).toBeInTheDocument();
  });

  it("affiche les étoiles avec aria-label quand rating fourni", () => {
    render(
      <ReviewItem author="X" when="hier" tourTitle="T" quote="q" rating={4} />,
    );
    expect(screen.getByLabelText('4 étoiles sur 5')).toBeInTheDocument();
  });

  it('masque les étoiles si rating null', () => {
    render(<ReviewItem author="X" when="hier" tourTitle="T" quote="q" rating={null} />);
    expect(screen.queryByLabelText(/étoiles sur 5/)).toBeNull();
  });

  it("affiche l'initiale de l'author", () => {
    render(<ReviewItem author="marco" when="hier" tourTitle="T" quote="q" rating={null} />);
    expect(screen.getByText('M')).toBeInTheDocument();
  });
});
