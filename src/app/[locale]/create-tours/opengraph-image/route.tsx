import { publicImage } from '@/lib/og/public-image';
import { isInterfaceLocale } from '@/lib/i18n/locales';

export const runtime = 'nodejs';
export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isInterfaceLocale(locale)) return new Response(null, { status: 404 });
  return publicImage(locale, true);
}
