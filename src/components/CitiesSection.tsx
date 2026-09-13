'use client';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCityAccent, type CityAccent } from '@/lib/cities/accent-map';
import type { City } from '@/types/tour';
import { getCities } from '@/lib/api/tours';
import { publicPath } from '@/lib/seo/urls';

// Fond doux de la carte ville, par accent (classes écrites en entier : Tailwind
// ne génère pas les noms construits). Le dégradé teal n'était pas à nous.
const ACCENT_BG: Record<CityAccent, string> = {
  grenadine: 'bg-grenadine-soft',
  ocre: 'bg-ocre-soft',
  mer: 'bg-mer-soft',
  olive: 'bg-olive-soft',
};

export default function CitiesSection({ locale = 'fr' }: { locale?: InterfaceLocale }) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCities()
      .then(setCities)
      .catch(() => setCities([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-20 bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-h4 font-bold text-ink mb-10">
            {translate(locale, 'Explorez nos villes', 'Explore our cities')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-line animate-pulse">
                <div className="h-48 bg-paper-deep" />
                <div className="p-4">
                  <div className="h-4 bg-paper-deep rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (cities.length === 0) return null;

  return (
    <section className="py-20 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-h4 font-bold text-ink mb-10">
          {translate(locale, 'Explorez nos villes', 'Explore our cities')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.map((city) => (
            <Link
              key={city.id}
              href={publicPath(`/catalogue/${city.slug}`, locale)}
              className="group block rounded-2xl overflow-hidden border border-line hover:shadow-lg transition-shadow"
            >
              <div className={`h-48 flex items-end p-6 ${ACCENT_BG[getCityAccent(city.slug)]}`}>
                <div>
                  <h3 className="font-display text-h4 text-ink">{city.name}</h3>
                  <p className="text-ink-60 text-body mt-1">
                    {city.tourCount}{' '}
                    {translate(locale, `visite${city.tourCount > 1 ? 's' : ''}`, `tour${city.tourCount > 1 ? 's' : ''}`)}
                  </p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-ink-60 text-body">{city.description}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href={translate(locale, '/catalogue', '/en/catalogue')}
            className="inline-flex items-center text-grenadine font-semibold hover:text-grenadine"
          >
            {translate(locale, 'Voir tout le catalogue', 'View the full catalogue')}
            <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
