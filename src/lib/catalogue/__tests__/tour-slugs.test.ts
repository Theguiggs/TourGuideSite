import { assignUniqueSlugs, findTourBySlugs } from '../tour-slugs';

const t = (id: string, title: string, city = 'Nice', createdAt = '2026-01-01') => ({ id, title, city, createdAt });

describe('assignUniqueSlugs', () => {
  it('dérive le slug du titre et de la ville', () => {
    const slugs = assignUniqueSlugs([t('a', 'La Promenade des Anglais')]);
    expect(slugs.get('a')).toEqual({ slug: 'la-promenade-des-anglais', citySlug: 'nice' });
  });

  it('rend deux visites de même titre dans la même ville toutes deux joignables, dans un ordre stable', () => {
    const older = t('zz', 'Vieux Nice', 'Nice', '2026-01-01');
    const newer = t('aa', 'Vieux Nice', 'Nice', '2026-02-01');
    const slugs = assignUniqueSlugs([newer, older]);
    expect(slugs.get('zz')?.slug).toBe('vieux-nice');
    expect(slugs.get('aa')?.slug).toBe('vieux-nice-2');
    // Même résultat quel que soit l'ordre de lecture.
    expect(assignUniqueSlugs([older, newer]).get('aa')?.slug).toBe('vieux-nice-2');
  });

  it('ne confond pas deux villes', () => {
    const slugs = assignUniqueSlugs([t('a', 'Vieux port', 'Nice'), t('b', 'Vieux port', 'Marseille')]);
    expect(slugs.get('a')?.slug).toBe('vieux-port');
    expect(slugs.get('b')?.slug).toBe('vieux-port');
  });

  it('donne une adresse à un titre sans lettre ni chiffre', () => {
    const slugs = assignUniqueSlugs([t('abcdef1234', '🎧🎧')]);
    expect(slugs.get('abcdef1234')?.slug).toBe('visite-abcdef12');
  });
});

describe('findTourBySlugs', () => {
  it('retrouve la seconde visite homonyme par son suffixe', () => {
    const tours = [t('a', 'Vieux Nice', 'Nice', '2026-01-01'), t('b', 'Vieux Nice', 'Nice', '2026-02-01')];
    expect(findTourBySlugs(tours, 'nice', 'vieux-nice')?.id).toBe('a');
    expect(findTourBySlugs(tours, 'nice', 'vieux-nice-2')?.id).toBe('b');
    expect(findTourBySlugs(tours, 'nice', 'vieux-nice-3')).toBeNull();
  });
});
