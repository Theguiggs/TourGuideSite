import { render, screen } from '@testing-library/react';

jest.mock('@/components/i18n/language-suggestion', () => ({ LanguageSuggestion: () => null }));

const getCityBySlug = jest.fn();
const getCityTourSummaries = jest.fn();
jest.mock('@/lib/api/tours-server', () => ({
  getCityBySlug: (...args: unknown[]) => getCityBySlug(...args),
  getCityTourSummaries: (...args: unknown[]) => getCityTourSummaries(...args),
}));

import { EditorialArticle } from '../editorial-article';
import { TipsIndex } from '../editorial-index';
import { CityArticles } from '../city-articles';
import { TourEditorialNotes } from '../tour-editorial-notes';
import { findArticle } from '@/lib/editorial/articles';

const eze = findArticle('visiter-eze-a-pied')!;
const tour = { id: 't1', slug: 'eze-le-vertige-du-nid-d-aigle', title: 'Èze', city: 'Èze', citySlug: 'eze' };

const jsonLdTypes = (container: HTMLElement) =>
  [...container.querySelectorAll('script[type="application/ld+json"]')].map((node) => (JSON.parse(node.textContent ?? '{}') as { '@type': string })['@type']);

beforeEach(() => {
  getCityBySlug.mockReset();
  getCityTourSummaries.mockReset();
});

describe('EditorialArticle', () => {
  it('sert le texte entier, les schémas et les liens de maillage quand la visite est publiée', async () => {
    getCityBySlug.mockResolvedValue({ slug: 'eze', name: 'Èze' });
    getCityTourSummaries.mockResolvedValue([tour]);
    const { container } = render(await EditorialArticle({ article: eze, locale: 'fr' }));

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(eze.copy.fr!.title);
    for (const section of eze.copy.fr!.sections) expect(screen.getByRole('heading', { name: section.title })).toBeInTheDocument();
    expect(jsonLdTypes(container)).toEqual(['Article', 'BreadcrumbList']);
    expect(screen.getByRole('link', { name: eze.copy.fr!.tour.cta })).toHaveAttribute('href', '/catalogue/eze/eze-le-vertige-du-nid-d-aigle#itineraire');
    expect(screen.getByRole('link', { name: 'Voir les visites audio à Èze' })).toHaveAttribute('href', '/catalogue/eze');
    expect(screen.getByRole('link', { name: 'Conseils de visite' })).toHaveAttribute('href', '/conseils');
    // Maillage vers les autres articles publiés en français.
    expect(screen.getByRole('link', { name: 'Visiter Menton à pied' })).toHaveAttribute('href', '/conseils/visiter-menton-a-pied');
  });

  it('ne mène vers aucune fiche ni ville introuvable', async () => {
    getCityBySlug.mockResolvedValue(null);
    getCityTourSummaries.mockResolvedValue([]);
    render(await EditorialArticle({ article: eze, locale: 'en' }));
    expect(screen.queryByRole('link', { name: eze.copy.en!.tour.cta })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'See audio tours in Èze' })).toHaveAttribute('href', '/en/catalogue');
  });

  it('survit à une panne de lecture', async () => {
    getCityBySlug.mockRejectedValue(new Error('AppSync down'));
    getCityTourSummaries.mockRejectedValue(new Error('AppSync down'));
    render(await EditorialArticle({ article: eze, locale: 'fr' }));
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('sur une langue non publiée, sert l’original et le dit', async () => {
    getCityBySlug.mockResolvedValue(null);
    getCityTourSummaries.mockResolvedValue([]);
    render(await EditorialArticle({ article: eze, locale: 'de' }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(eze.copy.en!.title);
    expect(screen.getByText(/noch nicht in Ihre Sprache übersetzt/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reisetipps' })).toHaveAttribute('href', '/de/tips');
  });
});

describe('TipsIndex', () => {
  it('liste les articles publiés dans la langue, avec leurs liens localisés', () => {
    render(<TipsIndex locale="en" />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Tips for exploring cities on foot');
    expect(screen.getByRole('link', { name: eze.copy.en!.title })).toHaveAttribute('href', '/en/tips/visiter-eze-a-pied');
    expect(screen.getAllByRole('link', { name: 'Read the article' }).length).toBeGreaterThanOrEqual(9);
  });

  it('en néerlandais, ne liste que l’article relu en néerlandais', () => {
    render(<TipsIndex locale="nl" />);
    expect(screen.getAllByRole('link', { name: 'Lees het artikel' })).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Lees het artikel' })).toHaveAttribute('href', '/nl/tips/visiter-grasse-a-pied');
  });
});

describe('CityArticles', () => {
  it('relie la page ville à ses conseils, dans sa langue seulement', () => {
    const { container, rerender } = render(<CityArticles citySlug="eze" cityName="Èze" locale="fr" />);
    expect(screen.getByRole('heading', { name: 'Préparer votre visite de Èze' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lire l’article' })).toHaveAttribute('href', '/conseils/visiter-eze-a-pied');
    rerender(<CityArticles citySlug="eze" cityName="Èze" locale="es" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CityArticles citySlug="paris" cityName="Paris" locale="fr" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('TourEditorialNotes', () => {
  it('pose sur la fiche le texte écrit pour la visite et le lien vers l’article', () => {
    render(<TourEditorialNotes citySlug="eze" tourSlug="eze-le-vertige-du-nid-d-aigle" locale="fr" />);
    expect(screen.getByRole('heading', { name: 'À propos de cette visite' })).toBeInTheDocument();
    expect(screen.getByText(/Cette visite raconte Èze/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Visiter Èze à pied' })).toHaveAttribute('href', '/conseils/visiter-eze-a-pied');
  });

  it('se tait pour une visite sans article, ou dans une langue non relue', () => {
    const { container, rerender } = render(<TourEditorialNotes citySlug="nice" tourSlug="vieux-nice" locale="fr" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<TourEditorialNotes citySlug="eze" tourSlug="eze-le-vertige-du-nid-d-aigle" locale="it" />);
    expect(container).toBeEmptyDOMElement();
  });
});
