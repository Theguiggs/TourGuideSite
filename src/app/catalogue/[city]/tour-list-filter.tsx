'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { S3Image } from '@/components/studio/s3-image';
import type { Tour } from '@/types/tour';

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪', pt: '🇵🇹', ja: '🇯🇵', zh: '🇨🇳',
};

const LANG_NAMES: Record<string, string> = {
  fr: 'Français', en: 'English', es: 'Español', it: 'Italiano', de: 'Deutsch',
};

interface TourListWithFilterProps {
  tours: Tour[];
  citySlug: string;
}

export function TourListWithFilter({ tours, citySlug }: TourListWithFilterProps) {
  const [filterLang, setFilterLang] = useState<string>('');

  // Collect all available languages across tours
  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const tour of tours) {
      for (const lang of tour.availableLanguages ?? []) {
        langs.add(lang);
      }
    }
    return Array.from(langs).sort();
  }, [tours]);

  // Filter tours by language
  const filteredTours = useMemo(() => {
    if (!filterLang) return tours;
    return tours.filter((t) => t.availableLanguages?.includes(filterLang));
  }, [tours, filterLang]);

  if (tours.length === 0) {
    return <p className="text-gray-500">Aucune visite disponible pour le moment.</p>;
  }

  return (
    <>
      {/* Language filter */}
      {allLanguages.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-gray-500">Filtrer par langue :</span>
          <button
            onClick={() => setFilterLang('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !filterLang ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Toutes ({tours.length})
          </button>
          {allLanguages.map((lang) => {
            const count = tours.filter((t) => t.availableLanguages?.includes(lang)).length;
            return (
              <button
                key={lang}
                onClick={() => setFilterLang(filterLang === lang ? '' : lang)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterLang === lang ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {LANG_FLAGS[lang] ?? ''} {LANG_NAMES[lang] ?? lang.toUpperCase()} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Tour cards */}
      {filteredTours.length === 0 ? (
        <p className="text-gray-500">Aucune visite disponible dans cette langue.</p>
      ) : (
        <div className="space-y-6">
          {filteredTours.map((tour) => (
            <Link
              key={tour.id}
              href={`/catalogue/${citySlug}/${tour.slug}`}
              data-testid={`tour-card-${tour.id}`}
              className="block rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="relative sm:w-64 h-48 sm:h-auto bg-gradient-to-br from-teal-600 to-teal-800 flex-shrink-0 overflow-hidden">
                  {tour.imageUrl && tour.imageUrl.startsWith('guide-') ? (
                    <S3Image s3Key={tour.imageUrl} alt={tour.title} className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  ) : tour.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={tour.imageUrl}
                      alt={tour.title}
                      className="absolute inset-0 w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                    />
                  ) : null}
                </div>
                <div className="p-6 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h2 className="text-xl font-semibold text-gray-900">{tour.title}</h2>
                        {tour.isFree && (
                          <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            GRATUIT
                          </span>
                        )}
                        {tour.availableLanguages && tour.availableLanguages.length > 0 && (
                          <div className="inline-flex gap-1 items-center" data-testid={`lang-flags-${tour.id}`}>
                            {tour.availableLanguages.slice(0, 5).map((lang) => {
                              const audioType = tour.languageAudioTypes?.[lang];
                              return (
                                <span
                                  key={lang}
                                  className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-700 text-xs px-1.5 py-0.5 rounded-full"
                                  title={`${LANG_NAMES[lang] ?? lang.toUpperCase()} — ${audioType === 'tts' ? 'Voix de synthèse' : audioType === 'recording' ? 'Voix du guide' : 'Audio'}`}
                                >
                                  {LANG_FLAGS[lang] ?? lang}
                                  <span className="text-[10px] font-medium">{lang.toUpperCase()}</span>
                                  {audioType === 'recording' ? <span className="text-[10px]">🎤</span> : audioType === 'tts' ? <span className="text-[10px]">🤖</span> : null}
                                </span>
                              );
                            })}
                            {tour.availableLanguages.length > 5 && (
                              <span className="text-xs text-gray-400">+{tour.availableLanguages.length - 5}</span>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        Par {tour.guideName} &middot; {tour.duration} min &middot; {tour.distance} km
                        &middot; {tour.poiCount} points
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-600 line-clamp-2">{tour.shortDescription}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
