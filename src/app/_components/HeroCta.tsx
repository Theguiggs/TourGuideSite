'use client';

import * as React from 'react';
import { Button } from '@tourguide/design-system/web';

/**
 * HeroCta — wrapper client component pour le CTA primary du hero landing.
 *
 * Story 4.2 — AC 10 : downgrade `size="lg"` → `size="md"` sur viewport ≤ 414px
 * (mobile). Implémenté via `matchMedia` côté client (Next 14 App Router).
 *
 * Story 4.2 — Finding 7 (a11y) : utilise la nouvelle prop `Button.href` (Story
 * 4.2 fix DS Button) qui rend `<a>` au lieu d'imbriquer `<button>` dans `<a>`.
 */
type Props = {
  label: string;
  href: string;
};

export default function HeroCta({ label, href }: Props) {
  const [size, setSize] = React.useState<'md' | 'lg'>('lg');

  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 414px)');
    const update = () => setSize(mq.matches ? 'md' : 'lg');
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <Button href={href} variant="accent" size={size} accessibilityLabel={label}>
      {label}
    </Button>
  );
}
