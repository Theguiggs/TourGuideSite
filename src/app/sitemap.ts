import type { MetadataRoute } from 'next';
import { getCities, getAllTours } from '@/lib/api/tours-server';
import { getAllPublicGuides } from '@/lib/api/guides-public-server';

// Force dynamic rendering: server AppSync client reads cookies, incompatible with static generation.
export const dynamic = 'force-dynamic';

const BASE_URL = 'https://murmure-visit.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, tours, guides] = await Promise.all([
    getCities(),
    getAllTours(),
    getAllPublicGuides(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BASE_URL}/catalogue`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/aide`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/en`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE_URL}/en/catalogue`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
    { url: `${BASE_URL}/en/help`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/confidentialite`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/supprimer-mon-compte`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/en/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/en/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/en/delete-account`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
  ];

  const cityPages: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${BASE_URL}/catalogue/${city.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  const englishCityPages: MetadataRoute.Sitemap = cities.map((city) => ({
    url: `${BASE_URL}/en/catalogue/${city.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  const tourPages: MetadataRoute.Sitemap = tours.map((tour) => ({
    url: `${BASE_URL}/catalogue/${tour.citySlug}/${tour.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const englishTourPages: MetadataRoute.Sitemap = tours.map((tour) => ({
    url: `${BASE_URL}/en/catalogue/${tour.citySlug}/${tour.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  const guidePages: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${BASE_URL}/guides/${guide.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [
    ...staticPages,
    ...cityPages,
    ...englishCityPages,
    ...tourPages,
    ...englishTourPages,
    ...guidePages,
  ];
}
