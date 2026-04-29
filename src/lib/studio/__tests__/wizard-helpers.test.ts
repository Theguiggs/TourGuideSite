import {
  sceneStatusPill,
  WIZARD_TABS,
  WIZARD_TAB_KEYS,
  adjacentTabs,
} from '../wizard-helpers';
import type { SceneStatus } from '@/types/studio';

describe('sceneStatusPill', () => {
  it('mappe finalized → Finalisé / olive-soft / success', () => {
    const p = sceneStatusPill('finalized');
    expect(p.label).toBe('Finalisé');
    expect(p.bgClass).toBe('bg-olive-soft');
    expect(p.textClass).toBe('text-success');
  });

  it('mappe recorded / edited → Enregistré / ocre', () => {
    expect(sceneStatusPill('recorded').label).toBe('Enregistré');
    expect(sceneStatusPill('edited').label).toBe('Enregistré');
    expect(sceneStatusPill('recorded').textClass).toBe('text-ocre');
  });

  it('mappe transcribed → Transcrit / mer', () => {
    expect(sceneStatusPill('transcribed').label).toBe('Transcrit');
    expect(sceneStatusPill('transcribed').textClass).toBe('text-mer');
  });

  it("retourne un fallback neutre pour empty / has_original", () => {
    expect(sceneStatusPill('empty').label).toBe('Vide');
    expect(sceneStatusPill('has_original').label).toBe('Brut');
  });

  it('ne lance pas pour un statut inconnu (cast)', () => {
    expect(() => sceneStatusPill('unknown' as SceneStatus)).not.toThrow();
    expect(sceneStatusPill('unknown' as SceneStatus).label).toBe('Vide');
  });
});

describe('WIZARD_TABS', () => {
  it('expose 6 tabs dans l’ordre attendu', () => {
    expect(WIZARD_TABS).toHaveLength(6);
    expect(WIZARD_TABS.map((t) => t.key)).toEqual([
      'accueil',
      'general',
      'itinerary',
      'scenes',
      'preview',
      'submission',
    ]);
  });

  it('numérote 01 à 06 dans cet ordre', () => {
    expect(WIZARD_TABS.map((t) => t.number)).toEqual(['01', '02', '03', '04', '05', '06']);
  });

  it('Accueil a un pathSuffix vide (route racine)', () => {
    expect(WIZARD_TABS[0].pathSuffix).toBe('');
  });

  it('WIZARD_TAB_KEYS reste cohérent avec WIZARD_TABS', () => {
    expect(WIZARD_TAB_KEYS).toEqual(WIZARD_TABS.map((t) => t.key));
  });
});

describe('adjacentTabs', () => {
  it("retourne null en prev pour le 1er tab", () => {
    const r = adjacentTabs('accueil');
    expect(r.prev).toBeNull();
    expect(r.next?.key).toBe('general');
  });

  it("retourne null en next pour le dernier tab", () => {
    const r = adjacentTabs('submission');
    expect(r.next).toBeNull();
    expect(r.prev?.key).toBe('preview');
  });

  it('retourne les voisins pour un tab du milieu', () => {
    const r = adjacentTabs('scenes');
    expect(r.prev?.key).toBe('itinerary');
    expect(r.next?.key).toBe('preview');
  });
});
