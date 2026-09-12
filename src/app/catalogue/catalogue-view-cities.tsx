'use client';

/**
 * Catalogue villes — color-block grid (Story 4.3).
 *
 * Remplace l'ancienne vue tours map+list par une grille typographique de
 * villes (1 bloc = 1 ville), sans photos, conforme brief §6 « imagerie
 * color-block typographique » et §8 « catalogue villes ».
 *
 * - Recherche par nom de ville (lot 6.4 ; l'ancien filtre par couleur d'accent est retiré).
 * - CityBlock : Link Next.js stylé `*Soft`, hover lift + shadow desktop only.
 * - Empty state éditorial avec PullQuote.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { tg } from '@murmure/design-system';
import { Eyebrow, PullQuote } from '@murmure/design-system/web';
import type { City, Tour } from '@/types/tour';
import {
  type CityAccent,
  getCityAccent,
  getCityAverageDuration,
} from '@/lib/cities/accent-map';

interface CatalogueViewCitiesProps {
  cities: City[];
  tours: Tour[];
  locale?: 'fr' | 'en';
}

/** Compare sans accents ni casse : « eze » trouve « Èze ». */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

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
  locale: 'fr' | 'en';
}

function CityBlock({ city, accent, avgDuration, locale }: CityBlockProps) {
  const accentColor = tg.colors[accent];
  const softKey = `${accent}Soft` as const;
  const bgColor = tg.colors[softKey];

  const tourCountLabel =
    city.tourCount === 0
      ? locale === 'en' ? 'Coming soon' : 'Bientôt disponible'
      : `${city.tourCount} tour${city.tourCount > 1 ? 's' : ''} · ${avgDuration} min`;

  const ariaLabel = `${city.name} — ${city.tourCount} tour${city.tourCount > 1 ? 's' : ''}`;

  return (
    <Link
      href={`${locale === 'en' ? '/en' : ''}/catalogue/${city.slug}`}
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

export function CatalogueViewCities({ cities, tours, locale = 'fr' }: CatalogueViewCitiesProps) {
  // Lot 6.4 — l'ancien filtre triait les villes par COULEUR d'accent
  // (« Provence », « Ocre », « Côte », « Nature ») : une propriété graphique
  // attribuée par somme de codes de caractères, que personne ne cherche.
  // Une recherche par nom remplace ces puces.
  const [query, setQuery] = useState('');

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
    const needle = fold(query.trim());
    if (!needle) return citiesWithAccent;
    return citiesWithAccent.filter((entry) => fold(entry.city.name).includes(needle) || fold(entry.city.slug).includes(needle));
  }, [citiesWithAccent, query]);

  const totalCount = filteredCities.length;

  return (
    <div
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
          {locale === 'en' ? 'The city catalogue' : 'Le catalogue des villes'}
        </h1>
        <div style={{ marginTop: tg.space[4], maxWidth: 640 }}>
          <PullQuote size="md">
            {locale === 'en'
              ? 'Every city hides its voices. Choose yours.'
              : 'Chaque ville cache ses voix. Choisissez la vôtre.'}
          </PullQuote>
        </div>
      </header>

      {/* Recherche par nom */}
      <div style={{ marginBottom: tg.space[6], maxWidth: 420 }}>
        <label htmlFor="city-search" className="block text-meta font-semibold text-ink-80 mb-1.5">
          {locale === 'en' ? 'Find a city' : 'Chercher une ville'}
        </label>
        <input
          id="city-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={locale === 'en' ? 'Nice, Barcelona, Grasse…' : 'Nice, Barcelone, Grasse…'}
          autoComplete="off"
          data-testid="city-search"
          className="w-full rounded-md border border-line bg-card px-4 py-3 text-caption text-ink outline-none focus:border-grenadine focus:ring-2 focus:ring-grenadine-soft"
        />
      </div>

      <div style={{ marginBottom: tg.space[5] }}>
        <Eyebrow color={tg.colors.ink60}>
          {totalCount}{' '}
          {locale === 'en'
            ? `cit${totalCount > 1 ? 'ies' : 'y'}`
            : `ville${totalCount > 1 ? 's' : ''}`}
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
            {query.trim()
              ? (locale === 'en' ? `No city matches “${query.trim()}”.` : `Aucune ville ne correspond à « ${query.trim()} ».`)
              : (locale === 'en' ? 'No city yet. Come back soon.' : 'Aucune ville pour le moment. Revenez bientôt.')}
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
              locale={locale}
            />
          ))}
        </div>
      )}
    </div>
  );
}
