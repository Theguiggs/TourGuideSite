/**
 * Lot 3.1 — le sitemap dit des dates vraies et relie chaque page à sa
 * version dans l'autre langue.
 */
jest.mock('server-only', () => ({}), { virtual: true });
jest.mock('@/lib/api/tours-server', () => ({
  getCities: jest.fn(async () => [{ id: 'nice', name: 'Nice', slug: 'nice', description: '', tourCount: 2 }]),
  getAllTours: jest.fn(async () => [
    { id: 't1', guideId: 'g1', citySlug: 'nice', slug: 'vieux-nice', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
    { id: 't2', guideId: 'g1', citySlug: 'nice', slug: 'promenade', createdAt: '2026-02-01T00:00:00Z' },
  ]),
}));
jest.mock('@/lib/api/guides-public-server', () => ({
  getAllPublicGuides: jest.fn(async () => [{ id: 'g1', slug: 'marie' }]),
}));

import sitemap from '../sitemap';
import { SITE_URL } from '@/lib/site';

describe('sitemap', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_BUILD_TIME = '2026-09-11T10:00Z';
  });
  afterAll(() => {
    delete process.env.NEXT_PUBLIC_BUILD_TIME;
  });

  it('date chaque visite de sa dernière modification, la ville de sa visite la plus récente', async () => {
    const entries = await sitemap();
    const byUrl = new Map(entries.map((e) => [e.url, e]));
    expect(byUrl.get(`${SITE_URL}/catalogue/nice/vieux-nice`)?.lastModified).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(byUrl.get(`${SITE_URL}/catalogue/nice/promenade`)?.lastModified).toEqual(new Date('2026-02-01T00:00:00Z'));
    expect(byUrl.get(`${SITE_URL}/catalogue/nice`)?.lastModified).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(byUrl.get(`${SITE_URL}/guides/marie`)?.lastModified).toEqual(new Date('2026-03-01T00:00:00Z'));
    expect(byUrl.get(`${SITE_URL}/cgu`)?.lastModified).toEqual(new Date('2026-09-11T10:00Z'));
  });

  it('relie chaque page FR à sa version EN, et réciproquement', async () => {
    const entries = await sitemap();
    const fr = entries.find((e) => e.url === `${SITE_URL}/catalogue/nice/vieux-nice`);
    const en = entries.find((e) => e.url === `${SITE_URL}/en/catalogue/nice/vieux-nice`);
    const expected = { fr: `${SITE_URL}/catalogue/nice/vieux-nice`, en: `${SITE_URL}/en/catalogue/nice/vieux-nice` };
    expect(fr?.alternates?.languages).toEqual(expected);
    expect(en?.alternates?.languages).toEqual(expected);
    expect(entries.find((e) => e.url === `${SITE_URL}/cgu`)?.alternates?.languages).toEqual({
      fr: `${SITE_URL}/cgu`,
      en: `${SITE_URL}/en/terms`,
    });
  });

  it('n’invente aucune date : sans build ni visite, la page n’en annonce pas', async () => {
    delete process.env.NEXT_PUBLIC_BUILD_TIME;
    const entries = await sitemap();
    expect(entries.find((e) => e.url === `${SITE_URL}/aide`)?.lastModified).toBeUndefined();
    expect(entries.every((e) => !(e.lastModified instanceof Date) || !Number.isNaN(e.lastModified.getTime()))).toBe(true);
  });
});
