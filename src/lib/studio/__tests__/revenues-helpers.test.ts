import {
  formatEuros,
  nextPaymentDate,
  monthLabel,
  computeDelta,
  cityFromTourTitle,
} from '../revenues-helpers';

describe('formatEuros', () => {
  it('formate avec 2 décimales par défaut', () => {
    expect(formatEuros(342)).toMatch(/342,00/);
    expect(formatEuros(1247.5)).toMatch(/1[\s ]247,50/);
  });

  it('peut omettre les décimales', () => {
    expect(formatEuros(342, { withCents: false })).toMatch(/342/);
    expect(formatEuros(342, { withCents: false })).not.toMatch(/,00/);
  });

  it('contient le symbole €', () => {
    expect(formatEuros(0)).toMatch(/€/);
  });
});

describe('nextPaymentDate', () => {
  it('cible le 5 du mois suivant si aujourd’hui > 5', () => {
    const today = new Date(2026, 3, 28); // 28 avril 2026
    const r = nextPaymentDate(today);
    expect(r.date.getDate()).toBe(5);
    expect(r.date.getMonth()).toBe(4); // mai (0-indexed)
    expect(r.date.getFullYear()).toBe(2026);
    expect(r.daysUntil).toBe(7); // 28 → 5 mai = 7 jours
  });

  it('cible le 5 du mois courant si aujourd’hui ≤ 5', () => {
    const today = new Date(2026, 4, 3); // 3 mai 2026
    const r = nextPaymentDate(today);
    expect(r.date.getDate()).toBe(5);
    expect(r.date.getMonth()).toBe(4);
    expect(r.daysUntil).toBe(2);
  });

  it('produit un label FR lisible', () => {
    const r = nextPaymentDate(new Date(2026, 3, 28));
    expect(r.label).toMatch(/5 mai 2026/);
  });

  it("daysUntil n'est jamais négatif", () => {
    const r = nextPaymentDate(new Date(2026, 4, 5));
    expect(r.daysUntil).toBeGreaterThanOrEqual(0);
  });
});

describe('monthLabel', () => {
  it('formate YYYY-MM en label court FR', () => {
    expect(monthLabel('2026-04')).toBe('Avr 26');
    expect(monthLabel('2026-01')).toBe('Jan 26');
    expect(monthLabel('2025-12')).toBe('Déc 25');
  });

  it('retourne l’input tel quel si format invalide', () => {
    expect(monthLabel('foo')).toBe('foo');
    expect(monthLabel('2026-13')).toBe('2026-13');
    expect(monthLabel('2026-00')).toBe('2026-00');
  });
});

describe('computeDelta', () => {
  it('+ pour augmentation', () => {
    expect(computeDelta(100, 80)).toEqual({ pct: 25, sign: '+' });
  });

  it('- pour baisse', () => {
    expect(computeDelta(80, 100)).toEqual({ pct: 20, sign: '-' });
  });

  it('= pour égalité', () => {
    expect(computeDelta(100, 100)).toEqual({ pct: 0, sign: '=' });
  });

  it('100 % et + quand prev = 0 et curr > 0', () => {
    expect(computeDelta(50, 0)).toEqual({ pct: 100, sign: '+' });
  });

  it('= quand prev = 0 et curr = 0', () => {
    expect(computeDelta(0, 0)).toEqual({ pct: 0, sign: '=' });
  });
});

describe('cityFromTourTitle', () => {
  it('extrait avant em-dash', () => {
    expect(cityFromTourTitle('Vence — Chapelle Matisse')).toBe('Vence');
  });

  it('extrait avant tiret', () => {
    expect(cityFromTourTitle('Cannes - Suquet')).toBe('Cannes');
  });

  it('extrait avant virgule', () => {
    expect(cityFromTourTitle('Antibes, Picasso')).toBe('Antibes');
  });

  it('fallback titre entier sans séparateur', () => {
    expect(cityFromTourTitle('Antibes')).toBe('Antibes');
  });

  it('fallback "Tour" si null/empty', () => {
    expect(cityFromTourTitle(null)).toBe('Tour');
    expect(cityFromTourTitle(undefined)).toBe('Tour');
    expect(cityFromTourTitle('')).toBe('Tour');
    expect(cityFromTourTitle('   ')).toBe('Tour');
  });
});
