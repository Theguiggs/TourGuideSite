'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { City } from '@/types/tour';
import { getCities } from '@/lib/api/tours';

export default function CitiesSection() {
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
          <h2 className="text-3xl font-bold text-ink mb-10">Explorez nos villes</h2>
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
        <h2 className="text-3xl font-bold text-ink mb-10">Explorez nos villes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cities.map((city) => (
            <Link
              key={city.id}
              href={`/catalogue/${city.slug}`}
              className="group block rounded-2xl overflow-hidden border border-line hover:shadow-lg transition-shadow"
            >
              <div className="h-48 bg-gradient-to-br from-teal-600 to-teal-800 flex items-end p-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">{city.name}</h3>
                  <p className="text-teal-100 text-sm mt-1">
                    {city.tourCount} visite{city.tourCount > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="p-4">
                <p className="text-ink-60 text-sm">{city.description}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/catalogue"
            className="inline-flex items-center text-grenadine font-semibold hover:text-grenadine"
          >
            Voir tout le catalogue
            <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
