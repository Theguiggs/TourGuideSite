import type { MetadataRoute } from 'next';
import { getCities, getAllTours } from '@/lib/api/tours-server';
import { getAllPublicGuides } from '@/lib/api/guides-public-server';
import { SITE_URL } from '@/lib/site';

// Force dynamic rendering: server AppSync client reads cookies, incompatible with static generation.
export const dynamic = 'force-dynamic';

/**
 * Dates réelles (lot 3.1) : `lastModified: new Date()` sur toutes les entrées
 * disait « modifié à l'instant » à chaque passage du robot, ce qui vaut ne
 * rien dire. Les visites portent `updatedAt` ; une ville date de sa visite la
 * plus récente ; les pages statiques datent du build (`NEXT_PUBLIC_BUILD_TIME`,
 * gravé par le Dockerfile) et n'annoncent rien en développement.
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

/** Une entrée par langue, chacune listant les deux versions (hreflang). */
function pair(
  frPath: string,
  enPath: string,
  base: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>,
  enPriority?: number,
): MetadataRoute.Sitemap {
  const alternates = { languages: { fr: `${SITE_URL}${frPath}`, en: `${SITE_URL}${enPath}` } };
  return [
    { url: `${SITE_URL}${frPath}`, ...base, alternates },
    { url: `${SITE_URL}${enPath}`, ...base, priority: enPriority ?? base.priority, alternates },
  ];
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
    ...pair('/', '/en', { lastModified: built, changeFrequency: 'weekly', priority: 1.0 }, 0.9),
    ...pair('/catalogue', '/en/catalogue', { lastModified: catalogueDate, changeFrequency: 'daily', priority: 0.9 }, 0.8),
    ...pair('/aide', '/en/help', { lastModified: built, changeFrequency: 'monthly', priority: 0.6 }),
    ...pair('/cgu', '/en/terms', { lastModified: built, changeFrequency: 'yearly', priority: 0.3 }),
    ...pair('/confidentialite', '/en/privacy', { lastModified: built, changeFrequency: 'yearly', priority: 0.3 }),
    ...pair('/supprimer-mon-compte', '/en/delete-account', { lastModified: built, changeFrequency: 'yearly', priority: 0.3 }),
  ];

  const cityPages: MetadataRoute.Sitemap = cities.flatMap((city) =>
    pair(
      `/catalogue/${city.slug}`,
      `/en/catalogue/${city.slug}`,
      {
        lastModified: latest(tours.filter((t) => t.citySlug === city.slug).map(tourDate)) ?? built,
        changeFrequency: 'daily',
        priority: 0.8,
      },
      0.7,
    ),
  );

  const tourPages: MetadataRoute.Sitemap = tours.flatMap((tour) =>
    pair(
      `/catalogue/${tour.citySlug}/${tour.slug}`,
      `/en/catalogue/${tour.citySlug}/${tour.slug}`,
      { lastModified: tourDate(tour) ?? built, changeFrequency: 'weekly', priority: 0.7 },
      0.6,
    ),
  );

  const guidePages: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${SITE_URL}/guides/${guide.slug}`,
    lastModified: latest(tours.filter((t) => t.guideId === guide.id).map(tourDate)) ?? built,
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticPages, ...cityPages, ...tourPages, ...guidePages];
}
