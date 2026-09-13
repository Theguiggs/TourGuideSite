import { SITE_LOCALES } from '@/lib/i18n/locales';
import { CITY_INTROS, cityIntro, citiesMissingIntro, citiesWithIntro, introIsComplete } from '../city-intro';
import { cityFacts, cityFactsSentence, formatCityDuration, formatCityGuides, formatCityLanguages } from '../city-facts';

const tour = (over: Partial<Parameters<typeof cityFacts>[0][number]> = {}) => ({
  duration: 45,
  availableLanguages: ['fr'],
  guideName: 'Marie Dupont',
  poiCount: 6,
  ...over,
});

describe('introductions de ville', () => {
  it('donne les six langues à chaque ville couverte', () => {
    for (const [slug, intro] of Object.entries(CITY_INTROS)) {
      expect(introIsComplete(intro)).toBe(true);
      for (const locale of SITE_LOCALES) expect(cityIntro(slug, locale)).toBe(intro[locale]);
    }
  });

  it('n’invente rien pour une ville non couverte', () => {
    expect(cityIntro('ville-inconnue', 'fr')).toBeUndefined();
    expect(citiesMissingIntro(['nice', 'arles', 'arles'])).toEqual(['arles']);
    expect(citiesWithIntro()).toContain('nice');
  });

  it('refuse un gabarit : aucune ville ne partage son texte avec une autre', () => {
    for (const locale of SITE_LOCALES) {
      const textes = Object.values(CITY_INTROS).map((intro) => intro[locale]);
      expect(new Set(textes).size).toBe(textes.length);
    }
  });

  it('écrit le français avec ses accents', () => {
    expect(CITY_INTROS.nice.fr).toContain('Côte d’Azur'.replace('’', "'"));
    expect(CITY_INTROS.vence.fr).toContain('épiscopale');
  });
});

describe('faits du catalogue d’une ville', () => {
  it('compte, borne les durées, réunit langues et guides sans doublon', () => {
    const facts = cityFacts([
      tour({ duration: 45, availableLanguages: ['fr', 'en'], poiCount: 6 }),
      tour({ duration: 70, availableLanguages: ['FR', 'de'], guideName: 'Jean Martin', poiCount: 8 }),
      tour({ duration: 60, availableLanguages: ['fr'], guideName: 'Marie Dupont', poiCount: 5 }),
    ]);
    expect(facts).toMatchObject({
      tourCount: 3,
      durationMin: 45,
      durationMax: 70,
      audioLanguages: ['de', 'en', 'fr'],
      guideNames: ['Jean Martin', 'Marie Dupont'],
      stopCount: 19,
    });
  });

  it('ne borne pas une durée absente', () => {
    const facts = cityFacts([tour({ duration: 0, poiCount: 0, guideName: '' })]);
    expect(facts.durationMin).toBeUndefined();
    expect(formatCityDuration(facts, 'fr')).toBe('');
    expect(formatCityGuides(facts, 'fr')).toBe('');
  });

  it('dit la même vérité dans les six langues, avec le bon accord', () => {
    const une = cityFacts([tour()]);
    const trois = cityFacts([tour(), tour({ duration: 70, guideName: 'Jean Martin' }), tour({ duration: 60 })]);
    for (const locale of SITE_LOCALES) {
      const seule = cityFactsSentence('Arles', une, locale);
      const plusieurs = cityFactsSentence('Arles', trois, locale);
      expect(seule).toContain('Arles');
      expect(seule).toContain('1');
      expect(seule).toContain('45');
      expect(plusieurs).toContain('3');
      expect(plusieurs).toContain('45');
      expect(plusieurs).toContain('70');
      expect(plusieurs).toContain('Jean Martin');
      expect(seule).not.toBe(plusieurs);
    }
    expect(cityFactsSentence('Arles', une, 'fr')).toBe('1 visite audio à Arles, 45 minutes, racontée par Marie Dupont. Écoute en français.');
    expect(cityFactsSentence('Arles', trois, 'fr')).toContain('3 visites audio à Arles, de 45 à 70 minutes, racontées par Jean Martin et Marie Dupont.');
    expect(cityFactsSentence('Arles', trois, 'en')).toContain('3 audio tours in Arles, 45 to 70 minutes, narrated by Jean Martin and Marie Dupont.');
  });

  it('nomme les langues audio dans la langue de la page', () => {
    const facts = cityFacts([tour({ availableLanguages: ['fr', 'en'] })]);
    expect(formatCityLanguages(facts, 'fr')).toBe('Anglais et Français');
    expect(formatCityLanguages(facts, 'en')).toBe('English and French');
    expect(formatCityLanguages(facts, 'de')).toMatch(/Englisch/);
  });

  it('annonce une ville sans visite plutôt que de mentir', () => {
    const vide = cityFacts([]);
    for (const locale of SITE_LOCALES) {
      expect(cityFactsSentence('Arles', vide, locale)).not.toContain('0');
      expect(cityFactsSentence('Arles', vide, locale).length).toBeGreaterThan(10);
    }
  });
});
