'use client';

import { PinNegatif } from '@murmure/design-system/web';

interface MurmureLogoProps {
  size?: number;
  contextLabel?: string;
}

export function MurmureLogo({ size = 26, contextLabel }: MurmureLogoProps) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <PinNegatif size={size} bg="grenadine" fg="paper" />
      <span
        className="font-display leading-none text-ink"
        style={{ fontSize: size * 0.85, letterSpacing: '0' }}
      >
        Murmure
      </span>
      {contextLabel && (
        <span className="hidden border-l border-line pl-3 text-meta font-bold uppercase text-grenadine sm:inline">
          {contextLabel}
        </span>
      )}
    </span>
  );
}
