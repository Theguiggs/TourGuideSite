import { homeSelection } from '../home-selection';
import type { Tour } from '@/types/tour';

const tour = (id: string, citySlug = 'nice', extra: Partial<Tour> = {}): Tour => ({ id, citySlug, city: citySlug, slug: id, title: id, duration: 45, status: 'published', ...extra } as Tour);

it('ne suggère que les publications valides et déduplique IDs et liens', () => {
  const source = [tour('a'), tour('a'), tour('b', 'nice', { slug: 'a' }), tour('draft', 'nice', { status: 'draft' }), tour('archive', 'nice', { status: 'archived' }), tour('bad', 'nice', { slug: '../bad' }), tour('empty', 'nice', { title: '' }), tour('absent', undefined, { citySlug: undefined }), tour('absent2', 'nice', { slug: undefined })];
  expect(homeSelection(source).featured.map(item => item.id)).toEqual(['a']);
});
it('répartit les trois suggestions entre villes et garde toutes les destinations de reprise', () => {
  const selection = homeSelection([tour('n2'), tour('a', 'antibes'), tour('n1'), tour('c', 'cannes')]);
  expect(selection.featured.map(item => item.citySlug)).toEqual(['antibes', 'cannes', 'nice']);
  expect(selection.resumeTours).toHaveLength(4);
  expect(selection.cities).toHaveLength(3);
});
it('complète la sélection quand une seule ville est disponible sans fabriquer de visites', () => {
  expect(homeSelection([tour('a'), tour('b')]).featured).toHaveLength(2);
  expect(homeSelection([])).toEqual({ cities: [], featured: [], resumeTours: [] });
});
it('projette uniquement les champs publics nécessaires', () => {
  const result = homeSelection([tour('a', 'nice', { imageUrl: 'https://example.test/private?signature=secret' })]);
  expect(JSON.stringify(result)).not.toContain('signature');
  expect(result.resumeTours[0]).toEqual({ id: 'a', title: 'a', citySlug: 'nice', slug: 'a' });
});
