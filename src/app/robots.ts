import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/guide/', '/admin/'],
    },
    sitemap: 'https://tourguide.app/sitemap.xml',
  };
}
