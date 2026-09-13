/**
 * Lot 3.1 — le sitemap dit des dates vraies.
 * Lot SEO-2 — il ne liste que les variantes linguistiques réellement publiées.
 */
jest.mock('server-only', () => ({}), { virtual: true });

const TOURS = [
  // FR source, EN traduit et narré : deux variantes indexables.
  { id: 't1', guideId: 'g1', citySlug: 'nice', slug: 'vieux-nice', status: 'published', sourceLanguage: 'fr',
    availableLanguages: ['fr', 'en'], translatedTitles: { en: 'Old Nice' }, translatedDescriptions: { en: 'Alleys' },
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
  // FR seul.
  { id: 't2', guideId: 'g1', citySlug: 'nice', slug: 'promenade', status: 'published', sourceLanguage: 'fr',
    availableLanguages: ['fr'], createdAt: '2026-02-01T00:00:00Z' },
];

jest.mock('@/lib/api/tours-server', () => ({
  getCities: jest.fn(async () => [
    { id: 'nice', name: 'Nice', slug: 'nice', description: '', tourCount: 2 },
    { id: 'vide', name: 'Vide', slug: 'vide', description: '', tourCount: 0 },
  ]),
  getAllTours: jest.fn(async () => TOURS),
}));
jest.mock('@/lib/api/guides-public-server', () => ({
  getAllPublicGuides: jest.fn(async () => [{ id: 'g1', slug: 'marie' }, { id: 'g2', slug: 'sans-visite' }]),
}));

import sitemap from '../sitemap';
import { SITE_URL } from '@/lib/site';
import { SITE_LOCALES } from '@/lib/i18n/locales';
import { publicUrl, hreflangGroup } from '@/lib/seo/urls';

describe('sitemap', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BUILD_TIME = '2026-09-11T10:00Z';
  });
  afterAll(() => {
    delete process.env.NEXT_PUBLIC_BUILD_TIME;
  });

  it('date chaque visite de sa dernière modification, la ville de sa visite la plus récente', async () => {
    const byUrl = new Map((await sitemap()).map((e) => [e.url, e]));
    expect(byUrl.get(`${SITE_URL}/catalogue/nice/vieux-nice`)?.lastModified).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(byUrl.get(`${SITE_URL}/catalogue/nice/promenade`)?.lastModified).toEqual(new Date('2026-02-01T00:00:00Z'));
    expect(byUrl.get(`${SITE_URL}/catalogue/nice`)?.lastModified).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(byUrl.get(`${SITE_URL}/guides/marie`)?.lastModified).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(byUrl.get(`${SITE_URL}/cgu`)?.lastModified).toEqual(new Date('2026-09-11T10:00Z'));
  });

  it('relie chaque page éditoriale à ses six langues, x-default compris', async () => {
    const entries = await sitemap();
    for (const path of ['/', '/catalogue', '/cgu', '/creer-des-visites']) {
      const languages = hreflangGroup(path, SITE_LOCALES);
      for (const locale of SITE_LOCALES) {
        const entry = entries.find((e) => e.url === publicUrl(path, locale));
        expect(entry?.alternates?.languages).toEqual(languages);
      }
      expect(languages['x-default']).toBe(publicUrl(path, 'fr'));
    }
  });

  it('ne liste une visite que dans les langues où son contenu existe', async () => {
    const urls = new Set((await sitemap()).map((e) => e.url));
    expect(urls.has(publicUrl('/catalogue/nice/vieux-nice', 'fr'))).toBe(true);
    expect(urls.has(publicUrl('/catalogue/nice/vieux-nice', 'en'))).toBe(true);
    for (const locale of ['es', 'de', 'it', 'nl'] as const) {
      expect(urls.has(publicUrl('/catalogue/nice/vieux-nice', locale))).toBe(false);
    }
    expect(urls.has(publicUrl('/catalogue/nice/promenade', 'en'))).toBe(false);
  });

  it('donne à la ville et au guide l’union des langues de leurs visites', async () => {
    const entries = await sitemap();
    const group = hreflangGroup('/catalogue/nice', ['fr', 'en']);
    expect(entries.find((e) => e.url === publicUrl('/catalogue/nice', 'fr'))?.alternates?.languages).toEqual(group);
    expect(entries.some((e) => e.url === publicUrl('/catalogue/nice', 'de'))).toBe(false);
    expect(entries.some((e) => e.url === publicUrl('/guides/marie', 'en'))).toBe(true);
    expect(entries.some((e) => e.url === publicUrl('/guides/marie', 'it'))).toBe(false);
  });

  it('n’expose ni ville vide ni guide sans visite publiée', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls.some((u) => u.includes('/catalogue/vide'))).toBe(false);
    expect(urls.some((u) => u.includes('/guides/sans-visite'))).toBe(false);
  });

  it('ne liste que des URL absolues du domaine, sans doublon', async () => {
    const urls = (await sitemap()).map((e) => e.url);
    for (const url of urls) expect(url === SITE_URL || url.startsWith(`${SITE_URL}/`)).toBe(true);
    // La racine est listée sans barre oblique, comme sa canonical.
    expect(urls).toContain(SITE_URL);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('n’invente aucune date : sans build ni visite, la page n’en annonce pas', async () => {
    delete process.env.NEXT_PUBLIC_BUILD_TIME;
    const entries = await sitemap();
    expect(entries.find((e) => e.url === `${SITE_URL}/aide`)?.lastModified).toBeUndefined();
    expect(entries.every((e) => !(e.lastModified instanceof Date) || !Number.isNaN(e.lastModified.getTime()))).toBe(true);
  });
});
