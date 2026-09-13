import type { InterfaceLocale } from '@/lib/i18n/locales';
import { SITE_LOCALES } from '@/lib/i18n/locales';

/**
 * Introductions éditoriales des villes, dans les six langues.
 *
 * `CITY_DESCRIPTIONS` (dans `src/lib/api/tours.ts`) portait une phrase par
 * ville, en français seulement, sans accents, et la page ville ne l'affichait
 * que sous `locale === 'fr'` : cinq langues sur six recevaient une page ville
 * sans une ligne de texte propre à la destination.
 *
 * Ce registre remplace cette table pour l'affichage. Deux règles le gouvernent :
 *
 * 1. **Une ville n'y figure que si son texte a été relu.** Une ville absente
 *    n'obtient pas d'introduction inventée : sa page s'appuie alors sur les
 *    faits vérifiables de son catalogue (voir `city-facts.ts`). Le lot SEO-8
 *    remplit ce registre ville par ville, à mesure que le contenu est produit.
 * 2. **Aucun gabarit à substitution.** Un texte qui ne change que par le nom de
 *    la ville n'apporte rien à un moteur et rien à un visiteur ; le test
 *    `city-intro.test.ts` refuse les doublons.
 *
 * Le français reste la version de référence : les cinq autres sont sa
 * traduction, pas une réécriture.
 */

export type CityIntro = Record<InterfaceLocale, string>;

export const CITY_INTROS: Readonly<Record<string, CityIntro>> = {
  grasse: {
    fr: "Capitale mondiale du parfum, perchée dans les collines de la Côte d'Azur.",
    en: 'The world capital of perfume, perched in the hills above the French Riviera.',
    es: 'Capital mundial del perfume, encaramada en las colinas de la Costa Azul.',
    de: "Welthauptstadt des Parfums, hoch in den Hügeln der Côte d'Azur.",
    it: 'Capitale mondiale del profumo, arroccata sulle colline della Costa Azzurra.',
    nl: "Wereldhoofdstad van het parfum, hoog in de heuvels van de Côte d'Azur.",
  },
  paris: {
    fr: 'La Ville Lumière et ses quartiers historiques.',
    en: 'The City of Light and its historic quarters.',
    es: 'La Ciudad de la Luz y sus barrios históricos.',
    de: 'Die Stadt des Lichts und ihre historischen Viertel.',
    it: 'La Città della Luce e i suoi quartieri storici.',
    nl: 'De Lichtstad en haar historische wijken.',
  },
  lyon: {
    fr: 'Capitale de la gastronomie, entre Rhône et Saône.',
    en: "France's gastronomic capital, between the Rhône and the Saône.",
    es: 'Capital de la gastronomía, entre el Ródano y el Saona.',
    de: 'Hauptstadt der Gastronomie, zwischen Rhône und Saône.',
    it: 'Capitale della gastronomia, tra il Rodano e la Saona.',
    nl: 'Hoofdstad van de gastronomie, tussen Rhône en Saône.',
  },
  nice: {
    fr: "Reine de la Côte d'Azur, entre promenade des Anglais et Vieux-Nice baroque.",
    en: 'Queen of the French Riviera, from the Promenade des Anglais to baroque Old Nice.',
    es: 'Reina de la Costa Azul, entre el Paseo de los Ingleses y la Vieja Niza barroca.',
    de: "Königin der Côte d'Azur, von der Promenade des Anglais bis zur barocken Altstadt.",
    it: 'Regina della Costa Azzurra, dalla Promenade des Anglais alla Nizza vecchia barocca.',
    nl: "Koningin van de Côte d'Azur, van de Promenade des Anglais tot het barokke oude Nice.",
  },
  cannes: {
    fr: 'Glamour et cinéma sur la Croisette, entre palaces et vieille ville du Suquet.',
    en: 'Glamour and cinema on the Croisette, between grand hotels and the old town of Le Suquet.',
    es: 'Glamour y cine en la Croisette, entre grandes hoteles y el casco antiguo del Suquet.',
    de: 'Glamour und Kino an der Croisette, zwischen Luxushotels und der Altstadt Le Suquet.',
    it: 'Glamour e cinema sulla Croisette, tra grandi alberghi e il centro storico del Suquet.',
    nl: 'Glamour en cinema op de Croisette, tussen luxehotels en de oude stad Le Suquet.',
  },
  antibes: {
    fr: "Cité des remparts et de Picasso, entre port antique et cap d'Antibes sauvage.",
    en: "City of ramparts and of Picasso, between its ancient harbour and the wild Cap d'Antibes.",
    es: 'Ciudad de murallas y de Picasso, entre el puerto antiguo y el salvaje cabo de Antibes.',
    de: "Stadt der Wehrmauern und Picassos, zwischen antikem Hafen und wildem Cap d'Antibes.",
    it: "Città delle mura e di Picasso, tra il porto antico e il selvaggio Capo d'Antibes.",
    nl: "Stad van de vestingmuren en van Picasso, tussen de antieke haven en de ruige Cap d'Antibes.",
  },
  menton: {
    fr: "Perle de la France aux portes de l'Italie, jardins exotiques et citrons dorés.",
    en: "France's pearl at the Italian border, with exotic gardens and golden lemons.",
    es: 'La perla de Francia a las puertas de Italia, con jardines exóticos y limones dorados.',
    de: 'Perle Frankreichs an der Grenze zu Italien, mit exotischen Gärten und goldenen Zitronen.',
    it: "La perla di Francia alle porte dell'Italia, giardini esotici e limoni dorati.",
    nl: 'De parel van Frankrijk aan de Italiaanse grens, met exotische tuinen en gouden citroenen.',
  },
  'saint-paul-de-vence': {
    fr: "Village médiéval perché, galeries d'art et panoramas sur la Méditerranée.",
    en: 'A hilltop medieval village of art galleries and Mediterranean views.',
    es: 'Pueblo medieval encaramado, galerías de arte y vistas al Mediterráneo.',
    de: 'Mittelalterliches Bergdorf mit Kunstgalerien und Blick aufs Mittelmeer.',
    it: "Borgo medievale arroccato, gallerie d'arte e panorami sul Mediterraneo.",
    nl: 'Middeleeuws heuveldorp met kunstgalerieën en uitzicht op de Middellandse Zee.',
  },
  mougins: {
    fr: "Village d'art et de gastronomie niché dans les collines au-dessus de Cannes.",
    en: 'A village of art and gastronomy nestled in the hills above Cannes.',
    es: 'Pueblo de arte y gastronomía enclavado en las colinas sobre Cannes.',
    de: 'Dorf der Kunst und der Küche, eingebettet in die Hügel über Cannes.',
    it: "Borgo d'arte e di gastronomia adagiato sulle colline sopra Cannes.",
    nl: 'Dorp van kunst en gastronomie, verscholen in de heuvels boven Cannes.',
  },
  vence: {
    fr: 'Cité épiscopale millénaire, chapelle Matisse et ruelles provençales.',
    en: 'A thousand-year-old episcopal town, the Matisse chapel and Provençal lanes.',
    es: 'Ciudad episcopal milenaria, la capilla de Matisse y callejuelas provenzales.',
    de: 'Tausendjährige Bischofsstadt, Matisse-Kapelle und provenzalische Gassen.',
    it: 'Città vescovile millenaria, la cappella di Matisse e i vicoli provenzali.',
    nl: 'Duizend jaar oude bisschopsstad, de Matisse-kapel en Provençaalse steegjes.',
  },
};

/** L'introduction relue de la ville, ou `undefined` si elle n'existe pas encore. */
export function cityIntro(citySlug: string, locale: InterfaceLocale): string | undefined {
  return CITY_INTROS[citySlug]?.[locale];
}

/** Villes déjà couvertes — utile aux contrôles et au suivi éditorial (SEO-8). */
export function citiesWithIntro(): string[] {
  return Object.keys(CITY_INTROS).sort();
}

/** Villes du catalogue encore sans introduction relue : le reste-à-faire éditorial. */
export function citiesMissingIntro(citySlugs: readonly string[]): string[] {
  return [...new Set(citySlugs)].filter((slug) => !CITY_INTROS[slug]).sort();
}

/** Garde-fou de forme : chaque ville présente doit l'être dans les six langues. */
export function introIsComplete(intro: Partial<CityIntro>): intro is CityIntro {
  return SITE_LOCALES.every((locale) => Boolean(intro[locale]?.trim()));
}
