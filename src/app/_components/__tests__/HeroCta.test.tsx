/**
 * Lot 3.4 — le CTA du hero changeait de taille après hydratation (matchMedia) :
 * saut de mise en page au-dessus de la ligne de flottaison sur mobile.
 */
import { render, screen } from '@testing-library/react';
import HeroCta from '../HeroCta';

describe('HeroCta', () => {
  it('rend les deux tailles côté serveur, la feuille de style en montre une seule', () => {
    render(<HeroCta label="Devenir guide" href="/guide/signup" />);
    expect(screen.getByTestId('hero-cta-lg').className).toContain('hidden min-[415px]:inline-flex');
    expect(screen.getByTestId('hero-cta-md').className).toContain('min-[415px]:hidden');
    const links = screen.getAllByRole('link', { name: 'Devenir guide' });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute('href', '/guide/signup');
  });

  it("n'utilise plus matchMedia", () => {
    expect(String(HeroCta)).not.toContain('matchMedia');
  });
});
