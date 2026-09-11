import { Button } from '@murmure/design-system/web';

/**
 * HeroCta — CTA principal du hero.
 *
 * Story 4.2 — AC 10 : `size="lg"` sur ordinateur, `size="md"` sur mobile
 * (≤ 414 px). Auparavant décidé par `matchMedia` après hydratation : le HTML
 * servi portait toujours `lg`, et le bouton rétrécissait d'un cran sous les
 * yeux du visiteur mobile — un saut de mise en page au-dessus de la ligne de
 * flottaison. Les deux tailles sont rendues, la feuille de style en montre
 * une seule ; plus de composant client, plus de saut.
 *
 * Story 4.2 — Finding 7 (a11y) : `Button.href` rend un `<a>` (pas de
 * `<button>` imbriqué). L'exemplaire masqué est en `display:none`, donc
 * absent de l'arbre d'accessibilité.
 */
type Props = {
  label: string;
  href: string;
};

export default function HeroCta({ label, href }: Props) {
  return (
    <>
      <span className="hidden min-[415px]:inline-flex" data-testid="hero-cta-lg">
        <Button href={href} variant="accent" size="lg" accessibilityLabel={label}>
          {label}
        </Button>
      </span>
      <span className="inline-flex min-[415px]:hidden" data-testid="hero-cta-md">
        <Button href={href} variant="accent" size="md" accessibilityLabel={label}>
          {label}
        </Button>
      </span>
    </>
  );
}
