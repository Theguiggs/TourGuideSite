import type { MetadataRoute } from 'next';
import { SITE_LOCALES } from '@/lib/i18n/locales';
import { publicPath } from '@/lib/seo/urls';
import { SITE_URL } from '@/lib/site';

/**
 * Espaces privés interdits à l'exploration.
 *
 * `/en/my-purchases` était écrit à la main : les quatre autres langues de la
 * même page restaient explorables. La liste se déduit désormais du chemin
 * source, comme tous les autres liens du site.
 */
const PRIVATE_SOURCE_PATHS = ['/mes-achats'];

export const PRIVATE_PATHS: string[] = [
  '/api/',
  '/guide/',
  '/admin/',
  '/test-ds',
  '/mes-visites',
  ...PRIVATE_SOURCE_PATHS.flatMap((source) => SITE_LOCALES.map((locale) => publicPath(source, locale))),
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: PRIVATE_PATHS,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
