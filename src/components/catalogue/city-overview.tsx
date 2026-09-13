import type { InterfaceLocale } from '@/lib/i18n/locales';
import type { Tour } from '@/types/tour';
import { cityIntro } from '@/lib/cities/city-intro';
import {
  cityFacts,
  cityFactsCopy,
  cityFactsSentence,
  formatCityDuration,
  formatCityGuides,
  formatCityLanguages,
} from '@/lib/cities/city-facts';

/**
 * Le texte d'une page ville, dans la langue de la page.
 *
 * Rendu côté serveur, sans JavaScript : c'est ce HTML que le robot reçoit, et
 * c'est le même que le visiteur lit. Deux couches, dans cet ordre :
 *
 * 1. l'introduction éditoriale relue, quand la ville en a une ;
 * 2. les faits de son catalogue — nombre réel de visites, durées réelles,
 *    langues audio réellement vendues, guides réellement publiés.
 *
 * La seconde couche existe pour toutes les villes et dans les six langues :
 * une ville sans introduction relue n'est pas une page vide, elle est une page
 * factuelle. Aucune des deux n'invente quoi que ce soit.
 */
export function CityOverview({
  cityName,
  citySlug,
  tours,
  locale,
}: {
  cityName: string;
  citySlug: string;
  tours: readonly Tour[];
  locale: InterfaceLocale;
}) {
  const intro = cityIntro(citySlug, locale);
  const facts = cityFacts(tours);
  const copy = cityFactsCopy(locale);
  const duration = formatCityDuration(facts, locale);
  const languages = formatCityLanguages(facts, locale);
  const guides = formatCityGuides(facts, locale);

  const rows: Array<[string, string]> = [
    [copy.labels.tours, String(facts.tourCount)],
    ...(duration ? [[copy.labels.duration, duration] as [string, string]] : []),
    ...(languages ? [[copy.labels.languages, languages] as [string, string]] : []),
    ...(facts.stopCount > 0 ? [[copy.labels.stops, String(facts.stopCount)] as [string, string]] : []),
    ...(guides ? [[copy.labels.guides, guides] as [string, string]] : []),
  ];

  return (
    <div className="mb-10">
      {intro && <p className="text-body text-ink-80 max-w-3xl">{intro}</p>}
      <p className={`text-body text-ink-60 max-w-3xl${intro ? ' mt-2' : ''}`}>
        {cityFactsSentence(cityName, facts, locale)}
      </p>
      {facts.tourCount > 0 && (
        <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
          {rows.map(([label, value]) => (
            <div key={label} className="flex min-w-0 flex-col border-t border-line pt-2">
              <dt className="text-caption uppercase tracking-wide text-ink-60">{label}</dt>
              <dd className="text-body text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
