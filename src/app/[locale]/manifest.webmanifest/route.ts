import manifest from '../../../../public/manifest.json';
import { isInterfaceLocale, LOCALE_FORMATS } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';
import { localizePublicPath } from '@/lib/i18n/public-routes';

export function localizedManifest(locale: Parameters<typeof translate>[0]) {
  return { ...manifest, lang: LOCALE_FORMATS[locale], start_url: localizePublicPath('/', locale),
    description: translate(locale, 'Découvrez les villes en visite audio.', 'Discover cities with audio tours.'),
    screenshots: undefined };
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isInterfaceLocale(locale)) return new Response(null, { status: 404 });
  return Response.json(localizedManifest(locale), { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'public, max-age=3600' } });
}
