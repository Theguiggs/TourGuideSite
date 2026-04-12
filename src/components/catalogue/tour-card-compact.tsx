'use client';

import Link from 'next/link';
import { S3Image } from '@/components/studio/s3-image';
import type { Tour } from '@/types/tour';

const LANG_FLAGS: Record<string, string> = {
  fr: '🇫🇷', en: '🇬🇧', es: '🇪🇸', it: '🇮🇹', de: '🇩🇪',
};

interface TourCardCompactProps {
  tour: Tour;
  isHighlighted?: boolean;
  onHover: (tourId: string | null) => void;
}

export function TourCardCompact({ tour, isHighlighted, onHover }: TourCardCompactProps) {
  return (
    <Link
      href={`/catalogue/${tour.citySlug}/${tour.slug}`}
      className={`block rounded-lg border p-3 transition-all hover:shadow-md ${
        isHighlighted ? 'border-teal-400 bg-teal-50 shadow-md' : 'border-gray-200 bg-white'
      }`}
      onMouseEnter={() => onHover(tour.id)}
      onMouseLeave={() => onHover(null)}
      data-testid={`tour-card-${tour.id}`}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-teal-600 to-teal-800 flex-shrink-0">
          {tour.imageUrl && tour.imageUrl.startsWith('guide-') ? (
            <S3Image s3Key={tour.imageUrl} alt={tour.title} className="w-full h-full object-cover" />
          ) : tour.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={tour.imageUrl} alt={tour.title} className="w-full h-full object-cover" />
          ) : null}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{tour.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {tour.city} &middot; {tour.duration} min &middot; {tour.distance} km
          </p>
          {tour.availableLanguages && tour.availableLanguages.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {tour.availableLanguages.map((lang) => (
                <span key={lang} className="text-[10px] bg-gray-100 text-gray-600 px-1 py-0.5 rounded">
                  {LANG_FLAGS[lang] ?? lang}
                  {tour.languageAudioTypes?.[lang] === 'recording' ? '🎤' : tour.languageAudioTypes?.[lang] === 'tts' ? '🤖' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
