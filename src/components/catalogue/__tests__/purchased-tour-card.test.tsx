/**
 * "Mes achats" presentational pieces: PurchasedTourCard (date + amount + link)
 * and MyPurchasesStrip (hidden when empty, links to /mes-achats).
 */

import { render, screen } from '@testing-library/react';
import { PurchasedTourCard } from '@/components/catalogue/purchased-tour-card';
import { MyPurchasesStrip } from '@/components/catalogue/my-purchases-strip';
import { __resetOwnedTourIdsCache } from '@/hooks/use-owned-tour-ids';
import type { PurchasedTour } from '@/types/purchase';
import type { Tour } from '@/types/tour';
import { METADATA_FALLBACK_COPY } from '@/lib/catalogue/localized-tour';

// Badge dependencies — guest by default so the card shows the price badge, not "Acheté".
jest.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: false, user: null }),
}));
jest.mock('@/lib/api/tour-purchase', () => ({
  listOwnedTourIds: jest.fn().mockResolvedValue(new Set()),
}));
jest.mock('@/components/studio/s3-image', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  S3Image: ({ alt }: any) => <div data-testid="s3-image">{alt}</div>,
}));

function tour(over: Partial<Tour> & Pick<Tour, 'id'>): Tour {
  return {
    title: 'Grasse — Les Routes du Parfum', slug: 'les-routes-du-parfum',
    city: 'Grasse', citySlug: 'grasse', guideId: 'g', guideName: 'G',
    description: '', shortDescription: '', duration: 51, distance: 2.2, poiCount: 7,
    isFree: false, status: 'published', ...over,
  };
}

function purchase(over?: Partial<PurchasedTour>): PurchasedTour {
  return {
    tour: tour({ id: 't1', priceCents: 899 }),
    purchasedAt: '2026-05-12T10:00:00.000Z',
    amountCents: 899,
    ...over,
  };
}

beforeEach(() => __resetOwnedTourIdsCache());

it.each(['card', 'strip'])('localizes purchased metadata and accessible names in the %s', variant => {
  const item = purchase({ tour: tour({ id: 'localized', sourceLanguage: 'fr', translatedTitles: { de: 'Die Altstadt' }, translatedDescriptions: { de: 'Eine Geschichte' } }) });
  render(variant === 'card' ? <PurchasedTourCard purchase={item} locale="de" /> : <MyPurchasesStrip purchases={[item]} locale="de" />);
  expect(screen.getByRole('link', { name: /Die Altstadt/ })).toHaveAttribute('href', '/de/catalogue/grasse/les-routes-du-parfum#ecouter');
  expect(screen.queryByText(METADATA_FALLBACK_COPY.de)).not.toBeInTheDocument();
  expect(item.tour.title).toBe('Grasse — Les Routes du Parfum');
});

it.each(['card', 'strip'])('signals missing translation in the purchased %s', variant => {
  const item = purchase();
  render(variant === 'card' ? <PurchasedTourCard purchase={item} locale="nl" /> : <MyPurchasesStrip purchases={[item]} locale="nl" />);
  expect(screen.getByText(METADATA_FALLBACK_COPY.nl)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Grasse/ })).toBeInTheDocument();
});

describe('<PurchasedTourCard>', () => {
  it('shows the purchase date and amount paid, linking to the tour', () => {
    render(<PurchasedTourCard purchase={purchase()} />);
    const card = screen.getByTestId('purchase-card-t1');
    expect(card).toHaveAttribute('href', '/catalogue/grasse/les-routes-du-parfum#ecouter');
    expect(card).toHaveAccessibleName('Écouter « Grasse — Les Routes du Parfum »');
    expect(card).toHaveTextContent('Écouter');
    expect(card).toHaveTextContent('Acheté le 12/05/2026');
    expect(card).toHaveTextContent('8,99 €');
  });

  it('does not link an owned-but-unpublished tour (catalogue page would 404)', () => {
    render(
      <PurchasedTourCard
        purchase={purchase({ tour: tour({ id: 't1', priceCents: 899, status: 'archived' }) })}
      />,
    );
    const card = screen.getByTestId('purchase-card-t1');
    expect(card).not.toHaveAttribute('href');
    expect(card).toHaveTextContent('Indisponible au catalogue');
  });

  it('localises the English card and catalogue link', () => {
    render(<PurchasedTourCard purchase={purchase()} locale="en" />);
    const card = screen.getByTestId('purchase-card-t1');
    expect(card).toHaveAttribute('href', '/en/catalogue/grasse/les-routes-du-parfum#ecouter');
    expect(card).toHaveAccessibleName('Listen to “Grasse — Les Routes du Parfum”');
    expect(card).toHaveTextContent('Purchased on 12/05/2026');
    expect(card).toHaveTextContent('€8.99');
  });

  it('omits the meta line when no date/amount is available', () => {
    render(
      <PurchasedTourCard
        purchase={purchase({ purchasedAt: '', amountCents: undefined })}
      />,
    );
    expect(screen.getByTestId('purchase-card-t1')).not.toHaveTextContent('Acheté le');
  });
});

describe('<MyPurchasesStrip>', () => {
  it.each(['fr', 'en'] as const)('propose l’écoute localisée dans la bande (%s)', (locale) => {
    render(<MyPurchasesStrip purchases={[purchase()]} locale={locale} />);
    const card = screen.getByTestId('purchase-strip-t1');
    expect(card).toHaveAttribute('href', `${locale === 'en' ? '/en' : ''}/catalogue/grasse/les-routes-du-parfum#ecouter`);
    expect(card).toHaveTextContent(locale === 'en' ? 'Listen' : 'Écouter');
    expect(card).toHaveAccessibleName(locale === 'en' ? 'Listen to “Grasse — Les Routes du Parfum”' : 'Écouter « Grasse — Les Routes du Parfum »');
  });

  it('garde un achat archivé visible sans lien d’écoute', () => {
    render(<MyPurchasesStrip purchases={[purchase({ tour: tour({ id: 't1', status: 'archived' }) })]} />);
    expect(screen.getByTestId('purchase-strip-t1')).not.toHaveAttribute('href');
    expect(screen.getByTestId('purchase-strip-t1')).toHaveTextContent('Indisponible au catalogue');
  });
  it('renders nothing when there are no purchases', () => {
    const { container } = render(<MyPurchasesStrip purchases={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a count, a "Voir tout" link and one thumbnail per purchase', () => {
    render(
      <MyPurchasesStrip
        purchases={[
          purchase({ tour: tour({ id: 'a' }) }),
          purchase({ tour: tour({ id: 'b' }) }),
        ]}
      />,
    );
    expect(screen.getByText('Mes achats (2)')).toBeInTheDocument();
    expect(screen.getByText('Voir tout →')).toHaveAttribute('href', '/mes-achats');
    expect(screen.getByTestId('purchase-strip-a')).toBeInTheDocument();
    expect(screen.getByTestId('purchase-strip-b')).toBeInTheDocument();
  });
});
