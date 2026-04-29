'use client';

import { cityFamily, FAMILY_META } from '@/components/studio/shell';

interface CityFamilyBadgeProps {
  /** City name — drives the family color resolution. */
  city: string;
}

/**
 * <CityFamilyBadge> — pill couleur famille (Mer/Ocre/Olive/Ardoise) calculé
 * automatiquement depuis la ville. Conçu pour overlay l'input ville (right side).
 */
export function CityFamilyBadge({ city }: CityFamilyBadgeProps) {
  const fam = cityFamily(city);
  const meta = FAMILY_META[fam];
  return (
    <span
      data-testid="city-family-badge"
      data-family={fam}
      className={`absolute top-2 right-2 tg-eyebrow px-2 py-0.5 rounded-pill ${meta.bgSoft} ${meta.text} pointer-events-none`}
    >
      {meta.label}
    </span>
  );
}
