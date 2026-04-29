'use client';

import { PinNegatif } from '@tourguide/design-system/web';

interface MurmureLogoProps {
  /** Taille du logo en pixels (défaut 26 — header). */
  size?: number;
  /** Affiche le tag « STUDIO » à droite du wordmark. */
  withStudioTag?: boolean;
}

/**
 * <MurmureLogo> — wordmark Murmure + icône PinNegatif + tag éditorial « STUDIO ».
 * Utilisé dans le <StudioHeader>. Port de docs/design/ds/studio-shared.jsx:9-19.
 */
export function MurmureLogo({ size = 26, withStudioTag = true }: MurmureLogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <PinNegatif size={size} bg="grenadine" fg="paper" />
      <div
        className="font-display text-ink leading-none"
        style={{ fontSize: size * 0.85, letterSpacing: '-0.01em' }}
      >
        Murmure
      </div>
      {withStudioTag && (
        <div className="tg-eyebrow text-grenadine ml-1">Studio</div>
      )}
    </div>
  );
}
