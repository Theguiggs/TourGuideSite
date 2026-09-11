import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/guide/', '/admin/', '/test-ds', '/mes-visites', '/en/my-purchases'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
