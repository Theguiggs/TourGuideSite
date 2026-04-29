'use client';

/**
 * Catalogue villes — color-block grid (Story 4.3).
 *
 * Remplace l'ancienne vue tours map+list par une grille typographique de
 * villes (1 bloc = 1 ville), sans photos, conforme brief §6 « imagerie
 * color-block typographique » et §8 « catalogue villes ».
 *
 * - Filtre Chip 5 couleurs (Toutes + 4 accents) — Story 2.2 active state.
 * - CityBlock : Link Next.js stylé `*Soft`, hover lift + shadow desktop only.
 * - Empty state éditorial avec PullQuote.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { tg } from '@tourguide/design-system';
import { Chip, Eyebrow, PullQuote } from '@tourguide/design-system/web';
import type { City, Tour } from '@/types/tour';
import {
  ACCENT_LABELS,
  type CityAccent,
  getCityAccent,
  getCityAverageDuration,
} from '@/lib/cities/accent-map';

interface CatalogueViewCitiesProps {
  cities: City[];
  tours: Tour[];
}

const ACCENT_FILTERS: ReadonlyArray<CityAccent> = [
  'grenadine',
  'ocre',
  'mer',
  'olive',
] as const;

/**
 * Tronque une description à `max` caractères + ellipsis si dépassement.
 */
function truncate(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

interface CityBlockProps {
  city: City;
  accent: CityAccent;
  avgDuration: number;
}

function CityBlock({ city, accent, avgDuration }: CityBlockProps) {
  const accentColor = tg.colors[accent];
  const softKey = `${accent}Soft` as const;
  const bgColor = tg.colors[softKey];

  const tourCountLabel =
    city.tourCount === 0
      ? 'Bientôt disponible'
      : `${city.tourCount} tour${city.tourCount > 1 ? 's' : ''} · ${avgDuration} min`;

  const ariaLabel = `${city.name} — ${city.tourCount} tour${city.tourCount > 1 ? 's' : ''}`;

  return (
    <Link
      href={`/catalogue/${city.slug}`}
      aria-label={ariaLabel}
      className="block transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        background: bgColor,
        padding: tg.space[6],
        borderRadius: tg.radius.lg,
        textDecoration: 'none',
        outlineColor: accentColor,
      }}
    >
      <Eyebrow color={accentColor}>{tourCountLabel}</Eyebrow>
      <h2
        className="tg-display"
        style={{
          fontFamily: tg.fonts.display,
          fontSize: tg.fontSize.h4,
          lineHeight: 1.15,
          marginTop: tg.space[2],
          marginBottom: 0,
          color: tg.colors.ink,
          letterSpacing: tg.tracking.display,
        }}
      >
        {city.name}
      </h2>
      {city.description ? (
        <p
          style={{
            marginTop: tg.space[3],
            marginBottom: 0,
            fontFamily: tg.fonts.sans,
            fontSize: tg.fontSize.body,
            color: tg.colors.ink60,
            lineHeight: 1.5,
          }}
        >
          {truncate(city.description, 100)}
        </p>
      ) : null}
    </Link>
  );
}

export function CatalogueViewCities({ cities, tours }: CatalogueViewCitiesProps) {
  const [activeAccent, setActiveAccent] = useState<CityAccent | null>(null);

  const citiesWithAccent = useMemo(
    () =>
      cities.map((city) => ({
        city,
        accent: getCityAccent(city.slug),
        avgDuration: getCityAverageDuration(city.slug, tours),
      })),
    [cities, tours],
  );

  const filteredCities = useMemo(() => {
    if (!activeAccent) return citiesWithAccent;
    return citiesWithAccent.filter((entry) => entry.accent === activeAccent);
  }, [citiesWithAccent, activeAccent]);

  const totalCount = filteredCities.length;

  return (
    <main
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      style={{ background: tg.colors.paper }}
    >
      {/* En-tête éditorial */}
      <header style={{ marginBottom: tg.space[10] }}>
        <h1
          className="tg-display"
          style={{
            fontFamily: tg.fonts.display,
            fontSize: tg.fontSize.h2,
            lineHeight: 1.1,
            color: tg.colors.ink,
            letterSpacing: tg.tracking.display,
            margin: 0,
          }}
        >
          Le catalogue des villes
        </h1>
        <div style={{ marginTop: tg.space[4], maxWidth: 640 }}>
          <PullQuote size="md">
            Chaque ville cache ses voix. Choisissez la vôtre.
          </PullQuote>
        </div>
      </header>

      {/* Filtres Chip + compteur */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: tg.space[2],
          marginBottom: tg.space[6],
        }}
      >
        <button
          type="button"
          onClick={() => setActiveAccent(null)}
          aria-pressed={activeAccent === null}
          style={{
            background: 'transparent',
            border: 0,
            padding: 0,
            cursor: 'pointer',
          }}
          className="focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <Chip color="default" active={activeAccent === null}>
            Toutes ({citiesWithAccent.length})
          </Chip>
        </button>
        {ACCENT_FILTERS.map((accent) => {
          const isActive = activeAccent === accent;
          return (
            <button
              key={accent}
              type="button"
              onClick={() => setActiveAccent(isActive ? null : accent)}
              aria-pressed={isActive}
              style={{
                background: 'transparent',
                border: 0,
                padding: 0,
                cursor: 'pointer',
              }}
              className="focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <Chip color={accent} active={isActive}>
                {ACCENT_LABELS[accent]}
              </Chip>
            </button>
          );
        })}
      </div>

      <div style={{ marginBottom: tg.space[5] }}>
        <Eyebrow color={tg.colors.ink60}>
          {totalCount} ville{totalCount > 1 ? 's' : ''}
        </Eyebrow>
      </div>

      {/* Grille ou état vide */}
      {totalCount === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: tg.space[16],
            maxWidth: 560,
            margin: '0 auto',
          }}
        >
          <PullQuote size="md">
            Aucune ville pour ce filtre. Choisissez un autre accent ou Toutes.
          </PullQuote>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {filteredCities.map((entry) => (
            <CityBlock
              key={entry.city.slug}
              city={entry.city}
              accent={entry.accent}
              avgDuration={entry.avgDuration}
            />
          ))}
        </div>
      )}
    </main>
  );
}
