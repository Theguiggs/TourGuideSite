import { render, screen } from '@testing-library/react';
import { StarRating, clampRating } from '../StarRating';

describe('StarRating', () => {
  it('borne la note : 7 ne lève plus RangeError et rend cinq étoiles', () => {
    render(<StarRating rating={7} />);
    const img = screen.getByRole('img');
    expect(img).toHaveTextContent('★★★★★');
    expect(img).toHaveAttribute('aria-label', '5.0 étoiles sur 5');
  });

  it('une note négative ou NaN rend zéro étoile pleine, sans planter', () => {
    render(<StarRating rating={-1} />);
    expect(screen.getByRole('img')).toHaveTextContent('☆☆☆☆☆');
    expect(clampRating(NaN)).toBe(0);
    expect(clampRating('3.5')).toBe(3.5);
  });

  it('rend une note ordinaire', () => {
    render(<StarRating rating={4.4} locale="en" />);
    const img = screen.getByRole('img');
    expect(img).toHaveTextContent('★★★★☆');
    expect(img).toHaveAttribute('aria-label', '4.4 stars out of 5');
  });
});
