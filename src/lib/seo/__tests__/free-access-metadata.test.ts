import { homeMetadata } from '@/lib/home-metadata';
import { SITE_LOCALES } from '@/lib/i18n/locales';

describe('métadonnées de l’offre gratuite', () => {
  beforeAll(() => {
    process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_START_AT = '2026-09-13T14:33:14.123Z';
    process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_END_AT = '2026-10-13T14:33:14.123Z';
  });

  afterAll(() => {
    delete process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_START_AT;
    delete process.env.NEXT_PUBLIC_LAUNCH_FREE_ACCESS_END_AT;
  });

  it.each(SITE_LOCALES)('annonce la gratuité sur l’accueil %s pendant l’offre', locale => {
    const result = homeMetadata(locale, Date.parse('2026-09-20T10:00:00.000Z'));
    expect(JSON.stringify(result.title).toLocaleLowerCase(locale)).toMatch(/gratuit|free|kostenlos|gratis/);
    expect(String(result.description)).toContain('2026');
    expect(result.openGraph).toMatchObject({ title: (result.title as { absolute: string }).absolute, description: result.description });
    expect(result.twitter).toMatchObject({ title: (result.title as { absolute: string }).absolute, description: result.description });
  });

  it('retire automatiquement la promotion expirée', () => {
    const result = homeMetadata('fr', Date.parse('2026-10-14T10:00:00.000Z'));
    expect(result.title).toEqual({ absolute: 'Murmure — Découvrez les villes en visite audio' });
    expect(result.description).not.toContain('gratuit');
  });
});
