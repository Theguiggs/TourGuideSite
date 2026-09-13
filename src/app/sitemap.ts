import type { MetadataRoute } from 'next';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { getCities, getAllTours } from '@/lib/api/tours-server';
import { getAllPublicGuides } from '@/lib/api/guides-public-server';
import { orderLocales, sitemapEntries } from '@/lib/seo/urls';
import { EVERGREEN_LOCALES, citySeoLocales, guideSeoLocales, tourSeoLocales } from '@/lib/seo/availability';

// Force dynamic rendering: server AppSync client reads cookies, incompatible with static generation.
export const dynamic = 'force-dynamic';

/**
 * Dates réelles (lot 3.1) : `lastModified: new Date()` sur toutes les entrées
 * disait « modifié à l'instant » à chaque passage du robot, ce qui vaut ne
 * rien dire. Les visites portent `updatedAt` ; une ville date de sa visite la
 * plus récente ; les pages statiques datent du build (`NEXT_PUBLIC_BUILD_TIME`,
 * gravé par le Dockerfile) et n'annoncent rien en développement.
 *
 * Langues réelles (lot SEO-2) : le sitemap annonçait six variantes de chaque
 * page, traduites ou non. Il ne liste plus qu'une URL par langue où le contenu
 * existe — et une ville, un guide ou une visite sans variante publiée
 * n'apparaît plus du tout.
 */
function buildDate(): Date | undefined {
  const raw = process.env.NEXT_PUBLIC_BUILD_TIME;
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseDate(value: string | undefined | null): Date | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function latest(dates: Array<Date | undefined>): Date | undefined {
  return dates.reduce<Date | undefined>((acc, d) => (d && (!acc || d > acc) ? d : acc), undefined);
}

/**
 * Une entrée par langue publiée, chacune portant le groupe hreflang complet
 * (`x-default` inclus). La variante française garde la priorité pleine : c'est
 * la langue source du catalogue.
 */
function pages(
  sourcePath: string,
  published: readonly InterfaceLocale[],
  base: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>,
  otherPriority?: number,
): MetadataRoute.Sitemap {
  const ordered = orderLocales(published);
  const entries = sitemapEntries(sourcePath, ordered, base);
  return entries.map((entry, index) => ({
    ...entry,
    priority: ordered[index] === 'fr' ? base.priority : otherPriority ?? base.priority,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, tours, guides] = await Promise.all([
    getCities(),
    getAllTours(),
    getAllPublicGuides(),
  ]);

  const built = buildDate();
  const tourDate = (t: { updatedAt?: string; createdAt?: string }) =>
    parseDate(t.updatedAt) ?? parseDate(t.createdAt);
  const catalogueDate = latest(tours.map(tourDate)) ?? built;

  const staticPages: MetadataRoute.Sitemap = [
    ...pages('/', EVERGREEN_LOCALES, { lastModified: built, changeFrequency: 'weekly', priority: 1.0 }, 0.9),
    ...pages('/catalogue', EVERGREEN_LOCALES, { lastModified: catalogueDate, changeFrequency: 'daily', priority: 0.9 }, 0.8),
    ...pages('/aide', EVERGREEN_LOCALES, { lastModified: built, changeFrequency: 'monthly', priority: 0.6 }),
    ...pages('/creer-des-visites', EVERGREEN_LOCALES, { lastModified: built, changeFrequency: 'monthly', priority: 0.6 }),
    ...pages('/cgu', EVERGREEN_LOCALES, { lastModified: built, changeFrequency: 'yearly', priority: 0.3 }),
    ...pages('/confidentialite', EVERGREEN_LOCALES, { lastModified: built, changeFrequency: 'yearly', priority: 0.3 }),
    ...pages('/supprimer-mon-compte', EVERGREEN_LOCALES, { lastModified: built, changeFrequency: 'yearly', priority: 0.3 }),
  ];

  const cityPages: MetadataRoute.Sitemap = cities.flatMap((city) => {
    const cityTours = tours.filter((t) => t.citySlug === city.slug);
    return pages(
      `/catalogue/${city.slug}`,
      citySeoLocales(cityTours),
      {
        lastModified: latest(cityTours.map(tourDate)) ?? built,
        changeFrequency: 'daily',
        priority: 0.8,
      },
      0.7,
    );
  });

  const tourPages: MetadataRoute.Sitemap = tours.flatMap((tour) =>
    pages(
      `/catalogue/${tour.citySlug}/${tour.slug}`,
      tourSeoLocales(tour),
      { lastModified: tourDate(tour) ?? built, changeFrequency: 'weekly', priority: 0.7 },
      0.6,
    ),
  );

  const guidePages: MetadataRoute.Sitemap = guides.flatMap((guide) => {
    const guideTours = tours.filter((t) => t.guideId === guide.id);
    return pages(
      `/guides/${guide.slug}`,
      guideSeoLocales(guideTours),
      {
        lastModified: latest(guideTours.map(tourDate)) ?? built,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      },
      0.5,
    );
  });

  return [...staticPages, ...cityPages, ...tourPages, ...guidePages];
}
