'use client';

/**
 * « Créer mon parcours » sur la page d'aide.
 *
 * Menait `/guide/studio/nouveau` à tout le monde : un anonyme était rejeté
 * vers la connexion, puis déposé sur le Studio, jamais sur l'écran de
 * création. Un guide connecté y va directement ; les autres passent par
 * l'inscription.
 */

import { Button } from '@murmure/design-system/web';
import { useOptionalAuth } from '@/lib/auth/auth-context';

const COPY = {
  fr: { label: 'Créer mon parcours', a11y: 'Créer mon parcours dans l’atelier' },
  en: { label: 'Create my tour', a11y: 'Create a tour in the studio' },
};

export default function CreateTourCta({ locale = 'fr' }: { locale?: 'fr' | 'en' }) {
  const auth = useOptionalAuth();
  const canCreate = Boolean(auth?.isAuthenticated && (auth.isGuide || auth.isAdmin));
  const href = canCreate ? '/guide/studio/nouveau' : '/guide/signup';
  return (
    <Button href={href} variant="accent" size="lg" accessibilityLabel={COPY[locale].a11y}>
      {COPY[locale].label}
    </Button>
  );
}
