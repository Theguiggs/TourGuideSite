import { citySeoLocales, guideSeoLocales, isTourIndexable, tourSeoLocales, tourSourceLocale } from '../availability';
import type { SeoTour } from '../availability';

const base: SeoTour = {
  status: 'published',
  sourceLanguage: 'fr',
  availableLanguages: ['fr'],
  translatedTitles: {},
  translatedDescriptions: {},
};

describe('tourSeoLocales', () => {
  it('retient toujours la langue source, seule quand rien n’est traduit', () => {
    expect(tourSeoLocales(base)).toEqual(['fr']);
    expect(tourSeoLocales({ ...base, sourceLanguage: 'nl-NL', availableLanguages: ['nl'] })).toEqual(['nl']);
  });

  it('ajoute une langue dont le titre, la description ET la narration existent', () => {
    expect(tourSeoLocales({
      ...base,
      availableLanguages: ['fr', 'en', 'de'],
      translatedTitles: { en: 'Old Nice', de: 'Altstadt' },
      translatedDescriptions: { en: 'Alleys', de: 'Gassen' },
    })).toEqual(['fr', 'en', 'de']);
  });

  it('écarte une langue dont la traduction est incomplète', () => {
    expect(tourSeoLocales({
      ...base,
      availableLanguages: ['fr', 'en'],
      translatedTitles: { en: 'Old Nice' },
      translatedDescriptions: {},
    })).toEqual(['fr']);
    expect(tourSeoLocales({
      ...base,
      availableLanguages: ['fr', 'en'],
      translatedTitles: { en: '   ' },
      translatedDescriptions: { en: 'Alleys' },
    })).toEqual(['fr']);
  });

  it('écarte une langue traduite mais non narrée', () => {
    expect(tourSeoLocales({
      ...base,
      availableLanguages: ['fr'],
      translatedTitles: { it: 'Nizza vecchia' },
      translatedDescriptions: { it: 'Vicoli' },
    })).toEqual(['fr']);
  });

  it('n’expose aucune variante d’une visite non publiée', () => {
    for (const status of ['draft', 'pending_moderation', 'rejected', 'archived'] as const) {
      expect(tourSeoLocales({ ...base, status })).toEqual([]);
    }
  });

  it('accepte une projection publique sans statut', () => {
    const sansStatut: SeoTour = { ...base };
    delete sansStatut.status;
    expect(tourSeoLocales(sansStatut)).toEqual(['fr']);
  });

  it('normalise les étiquettes de langue et ignore l’inconnu', () => {
    expect(tourSourceLocale({ sourceLanguage: 'DE-de' })).toBe('de');
    expect(tourSourceLocale({ sourceLanguage: 'pt' })).toBe('fr');
    expect(tourSourceLocale({ sourceLanguage: undefined })).toBe('fr');
    expect(isTourIndexable({ ...base, availableLanguages: ['FR', 'en-GB'], translatedTitles: { 'EN-GB': 'T' }, translatedDescriptions: { en: 'D' } }, 'en')).toBe(true);
  });
});

describe('villes et guides', () => {
  const fr: SeoTour = { ...base };
  const bilingue: SeoTour = {
    ...base,
    availableLanguages: ['fr', 'en'],
    translatedTitles: { en: 'T' },
    translatedDescriptions: { en: 'D' },
  };

  it('réunit les langues des visites de la ville', () => {
    expect(citySeoLocales([fr, bilingue])).toEqual(['fr', 'en']);
    expect(guideSeoLocales([bilingue])).toEqual(['fr', 'en']);
  });

  it('n’indexe ni une ville sans visite ni un guide sans visite publiée', () => {
    expect(citySeoLocales([])).toEqual([]);
    expect(citySeoLocales([{ ...base, status: 'draft' }])).toEqual([]);
    expect(guideSeoLocales([])).toEqual([]);
  });
});
