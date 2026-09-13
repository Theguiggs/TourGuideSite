import { preferredLocale, suggestedLocale } from '../preferred-locale';
import { SITE_LOCALES } from '../locales';

describe('preferredLocale', () => {
  it('lit la langue réclamée, sous-étiquette de pays comprise', () => {
    expect(preferredLocale('de')).toBe('de');
    expect(preferredLocale('de-AT')).toBe('de');
    expect(preferredLocale('nl-BE,nl;q=0.9')).toBe('nl');
    for (const locale of SITE_LOCALES) expect(preferredLocale(locale)).toBe(locale);
  });

  it('respecte les facteurs de qualité, puis l’ordre d’écriture', () => {
    expect(preferredLocale('fr;q=0.2,de;q=0.9,en;q=0.8')).toBe('de');
    // À qualité égale, le premier écrit gagne.
    expect(preferredLocale('it,es')).toBe('it');
    // Le vrai en-tête d'un Chrome allemand.
    expect(preferredLocale('de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7')).toBe('de');
  });

  it('ignore ce que nous ne parlons pas, et ce qui est refusé', () => {
    expect(preferredLocale('pt-BR,ja;q=0.8')).toBeNull();
    expect(preferredLocale('*')).toBeNull();
    expect(preferredLocale('de;q=0')).toBeNull();
    // Une langue inconnue ne masque pas celle qui suit.
    expect(preferredLocale('pt-BR,de;q=0.5')).toBe('de');
  });

  it('ne suppose rien d’un en-tête absent ou vide', () => {
    expect(preferredLocale(null)).toBeNull();
    expect(preferredLocale(undefined)).toBeNull();
    expect(preferredLocale('')).toBeNull();
  });
});

describe('suggestedLocale', () => {
  const published = SITE_LOCALES;

  it('propose la langue du navigateur quand la page est dans une autre', () => {
    expect(suggestedLocale({ acceptLanguage: 'de-DE,de;q=0.9', current: 'fr', published })).toBe('de');
  });

  it('se tait quand le visiteur est déjà dans sa langue', () => {
    expect(suggestedLocale({ acceptLanguage: 'de-DE,de;q=0.9', current: 'de', published })).toBeNull();
  });

  it('se tait quand le visiteur a déjà choisi une langue', () => {
    expect(suggestedLocale({ acceptLanguage: 'de', current: 'fr', published, chosenLocale: 'fr' })).toBeNull();
    expect(suggestedLocale({ acceptLanguage: 'de', current: 'fr', published, chosenLocale: 'de' })).toBeNull();
    // Un cookie illisible ne vaut pas un choix.
    expect(suggestedLocale({ acceptLanguage: 'de', current: 'fr', published, chosenLocale: 'klingon' })).toBe('de');
  });

  it('ne propose jamais une variante non publiée pour cette page', () => {
    expect(suggestedLocale({ acceptLanguage: 'nl', current: 'fr', published: ['fr', 'en'] })).toBeNull();
    expect(suggestedLocale({ acceptLanguage: 'en', current: 'fr', published: ['fr', 'en'] })).toBe('en');
  });

  it('ne dit rien au robot qui ne réclame aucune langue', () => {
    expect(suggestedLocale({ acceptLanguage: null, current: 'fr', published })).toBeNull();
    expect(suggestedLocale({ acceptLanguage: '*', current: 'fr', published })).toBeNull();
  });
});
