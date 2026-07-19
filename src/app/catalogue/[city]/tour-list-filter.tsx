'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { S3Image } from '@/components/studio/s3-image';
import { TourPriceBadge } from '@/components/catalogue/tour-price-badge';
import type { Tour } from '@/types/tour';

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪', pt: '🇵🇹', ja: '🇯🇵', zh: '🇨🇳',
};

const LANG_NAMES: Record<string, string> = {
  fr: 'Français', en: 'English', es: 'Español', it: 'Italiano', de: 'Deutsch',
};

const SUPPORTED_AUDIO_LANGUAGES = ['fr', 'en', 'es', 'de', 'it'] as const;

interface TourListWithFilterProps {
  tours: Tour[];
  citySlug: string;
  locale?: 'fr' | 'en';
}

export function TourListWithFilter({ tours, citySlug, locale = 'fr' }: TourListWithFilterProps) {
  const [filterLang, setFilterLang] = useState<string>('');

  // Collect all available languages across tours
  const allLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const tour of tours) {
      for (const lang of tour.availableLanguages ?? []) {
        langs.add(lang);
      }
    }
    return SUPPORTED_AUDIO_LANGUAGES.filter((lang) => langs.has(lang));
  }, [tours]);

  // Filter tours by language
  const filteredTours = useMemo(() => {
    if (!filterLang) return tours;
    return tours.filter((t) => t.availableLanguages?.includes(filterLang));
  }, [tours, filterLang]);

  if (tours.length === 0) {
    return (
      <p className="text-ink-60">
        {locale === 'en' ? 'No tours are available yet.' : 'Aucune visite disponible pour le moment.'}
      </p>
    );
  }

  return (
    <>
      {/* Language filter */}
      {allLanguages.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-ink-60">
            {locale === 'en' ? 'Filter by audio language:' : 'Filtrer par langue :'}
          </span>
          <button
            onClick={() => setFilterLang('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              !filterLang ? 'bg-grenadine text-white' : 'bg-paper-deep text-ink-60 hover:bg-paper-deep'
            }`}
          >
            {locale === 'en' ? 'All' : 'Toutes'} ({tours.length})
          </button>
          {allLanguages.map((lang) => {
            const count = tours.filter((t) => t.availableLanguages?.includes(lang)).length;
            return (
              <button
                key={lang}
                onClick={() => setFilterLang(filterLang === lang ? '' : lang)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterLang === lang ? 'bg-grenadine text-white' : 'bg-paper-deep text-ink-60 hover:bg-paper-deep'
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
        <p className="text-ink-60">
          {locale === 'en' ? 'No tours are available in this language.' : 'Aucune visite disponible dans cette langue.'}
        </p>
      ) : (
        <div className="space-y-6">
          {filteredTours.map((tour) => (
            <Link
              key={tour.id}
              href={`${locale === 'en' ? '/en' : ''}/catalogue/${citySlug}/${tour.slug}`}
              data-testid={`tour-card-${tour.id}`}
              className="block rounded-xl border border-line hover:shadow-md transition-shadow overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="relative sm:w-64 h-48 sm:h-auto bg-grenadine-soft flex-shrink-0 overflow-hidden">
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
                        <h2 className="text-xl font-semibold text-ink">{tour.title}</h2>
                        <TourPriceBadge tour={tour} locale={locale} />
                        {tour.availableLanguages && tour.availableLanguages.length > 0 && (
                          <div className="inline-flex gap-1 items-center" data-testid={`lang-flags-${tour.id}`}>
                            {tour.availableLanguages.slice(0, 5).map((lang) => {
                              const audioType = tour.languageAudioTypes?.[lang];
                              return (
                                <span
                                  key={lang}
                                  className="inline-flex items-center gap-0.5 bg-paper-deep text-ink-80 text-xs px-1.5 py-0.5 rounded-full"
                                  title={`${LANG_NAMES[lang] ?? lang.toUpperCase()} — ${audioType === 'tts' ? 'Voix de synthèse' : audioType === 'recording' ? 'Voix du guide' : 'Audio'}`}
                                >
                                  {LANG_FLAGS[lang] ?? lang}
                                  <span className="text-[10px] font-medium">{lang.toUpperCase()}</span>
                                  {audioType === 'recording' ? <span className="text-[10px]">🎤</span> : audioType === 'tts' ? <span className="text-[10px]">🤖</span> : null}
                                </span>
                              );
                            })}
                            {tour.availableLanguages.length > 5 && (
                              <span className="text-xs text-ink-40">+{tour.availableLanguages.length - 5}</span>
                            )}
                          </div>
                        )}
                        {tour.languageAudioTypes &&
                          Object.values(tour.languageAudioTypes).some((t) => t === 'tts') && (
                            <span
                              className="inline-flex items-center gap-1 bg-mer-soft text-mer text-xs font-medium px-2 py-0.5 rounded-full"
                              title="Tout ou partie de l'audio de ce parcours est généré par synthèse vocale"
                            >
                              🤖 Voix de synthèse
                            </span>
                          )}
                      </div>
                      <p className="text-sm text-ink-60 mb-2">
                        {locale === 'en' ? 'By' : 'Par'} {tour.guideName} &middot; {tour.duration} min &middot; {tour.distance} km
                        &middot; {tour.poiCount} {locale === 'en' ? 'stops' : 'points'}
                      </p>
                    </div>
                  </div>
                  <p className="text-ink-60 line-clamp-2">{tour.shortDescription}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
