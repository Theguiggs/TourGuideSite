import { SITE_LOCALES } from '@/lib/i18n/locales';
import {
  ARTICLES,
  articleForTour,
  articleLocales,
  articleSourcePath,
  articlesForCity,
  articlesForLocale,
  findArticle,
  latestArticleDate,
  resolveArticleCopy,
  tipsIndexLocales,
} from '../articles';

/**
 * Le registre est du contenu indexé : sa forme se vérifie comme du code.
 * Un article mal formé (description trop longue, slug incohérent, texte
 * recopié d'un autre) dégrade le site entier aux yeux d'un moteur.
 */
const words = (text: string) => text.trim().split(/\s+/).length;
/** Jest n'accepte pas de message d'échec : on compare une étiquette lisible. */
const ok = (label: string, condition: boolean) => (condition ? 'ok' : label);

describe('registre des articles', () => {
  it('a des slugs uniques, en minuscules, sans accent ni préfixe de langue', () => {
    const slugs = ARTICLES.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    for (const article of ARTICLES) expect(articleSourcePath(article)).toBe(`/conseils/${article.slug}`);
  });

  it('publie chaque article au moins en français, et jamais dans une langue vide', () => {
    for (const article of ARTICLES) {
      expect(article.copy.fr).toBeDefined();
      for (const locale of articleLocales(article)) {
        const copy = article.copy[locale]!;
        expect(copy.title.length).toBeGreaterThan(20);
        expect(copy.sections.length).toBeGreaterThanOrEqual(3);
        expect(copy.sections.flatMap((s) => s.paragraphs).every((p) => p.length > 40)).toBe(true);
      }
    }
  });

  it('tient la meta description entre 100 et 165 caractères, dans chaque langue', () => {
    for (const article of ARTICLES) {
      for (const locale of articleLocales(article)) {
        const { description } = article.copy[locale]!;
        expect(ok(`${article.slug}/${locale}: ${description.length}`, description.length >= 100 && description.length <= 165)).toBe('ok');
      }
    }
  });

  it('écrit un texte propre à chaque ville : aucun paragraphe, titre ou chapeau partagé', () => {
    for (const locale of SITE_LOCALES) {
      const seen = new Map<string, string>();
      for (const article of articlesForLocale(locale)) {
        const copy = article.copy[locale]!;
        const texts = [copy.title, copy.lead, copy.description, ...copy.sections.flatMap((s) => s.paragraphs), ...(copy.note?.paragraphs ?? [])];
        for (const text of texts) {
          expect(ok(`« ${text.slice(0, 50)}… » partagé entre ${seen.get(text)} et ${article.slug}`, !seen.has(text))).toBe('ok');
          seen.set(text, article.slug);
        }
      }
    }
  });

  it('donne à chaque article français au moins 280 mots de corps', () => {
    for (const article of ARTICLES) {
      const copy = article.copy.fr!;
      const body = [copy.lead, ...copy.sections.flatMap((s) => s.paragraphs)].join(' ');
      expect(ok(`${article.slug}: ${words(body)} mots`, words(body) >= 280)).toBe('ok');
    }
  });

  it('date chaque article en ISO 8601, et l’index de la date la plus récente', () => {
    for (const article of ARTICLES) {
      expect(article.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (article.updatedAt) expect(article.updatedAt >= article.publishedAt).toBe(true);
    }
    expect(latestArticleDate()).toBe(ARTICLES.map((a) => a.updatedAt ?? a.publishedAt).sort().at(-1));
  });

  it('respecte le lexique français : « visite », jamais « tour », et les accents', () => {
    for (const article of ARTICLES) {
      const copy = article.copy.fr!;
      const all = JSON.stringify(copy);
      expect(all).not.toMatch(/\b(ce|un|le|votre|mon|du|les|des|chaque)\s+tours?\b/);
      expect(all).not.toMatch(/\b(Etape|Decouvr|Ecout|Telecharg|Apercu)/);
    }
  });
});

describe('recherche dans le registre', () => {
  it('retrouve un article par son slug, et rien pour un slug inconnu', () => {
    expect(findArticle('visiter-eze-a-pied')?.city.slug).toBe('eze');
    expect(findArticle('inconnu')).toBeUndefined();
  });

  it('relie une visite à son article par le slug exact ou par le fragment de secours', () => {
    expect(articleForTour('eze', 'eze-le-vertige-du-nid-d-aigle')?.slug).toBe('visiter-eze-a-pied');
    expect(articleForTour('eze', 'le-vertige-du-nid-d-aigle-2')?.slug).toBe('visiter-eze-a-pied');
    expect(articleForTour('nice', 'vieux-nice')).toBeUndefined();
    expect(articleForTour('grasse', 'grasse-les-routes-du-parfum')?.slug).toBe('visiter-grasse-a-pied');
  });

  it('liste les articles d’une ville et d’une langue', () => {
    expect(articlesForCity('grasse').map((a) => a.slug)).toEqual(['visiter-grasse-a-pied']);
    expect(articlesForLocale('nl').map((a) => a.slug)).toEqual(['visiter-grasse-a-pied']);
    expect(articlesForLocale('fr').length).toBe(ARTICLES.length);
  });
});

describe('langues et repli', () => {
  const eze = findArticle('visiter-eze-a-pied')!;
  const grasse = findArticle('visiter-grasse-a-pied')!;

  it('ne publie que les langues portées par le texte, dans l’ordre du site', () => {
    expect(articleLocales(eze)).toEqual(['fr', 'en']);
    expect(articleLocales(grasse)).toEqual([...SITE_LOCALES]);
    expect(tipsIndexLocales()).toEqual([...SITE_LOCALES]);
  });

  it('sert la langue demandée quand elle existe, sinon l’anglais, en le disant', () => {
    expect(resolveArticleCopy(eze, 'fr')).toMatchObject({ locale: 'fr', fallback: false });
    expect(resolveArticleCopy(eze, 'de')).toMatchObject({ locale: 'en', fallback: true });
    expect(resolveArticleCopy({ copy: { fr: eze.copy.fr } }, 'it')).toMatchObject({ locale: 'fr', fallback: true });
    expect(resolveArticleCopy(grasse, 'nl')).toMatchObject({ locale: 'nl', fallback: false });
  });
});
