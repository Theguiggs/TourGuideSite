import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TourFilters } from '../TourFilters';

const baseProps = {
  query: '',
  onQueryChange: jest.fn(),
  statusFilter: 'all' as const,
  onStatusFilterChange: jest.fn(),
  sortBy: 'recently_modified' as const,
  onSortByChange: jest.fn(),
  counts: { all: 12, live: 9, draft: 2, review: 1 },
};

describe('TourFilters', () => {
  beforeEach(() => {
    baseProps.onQueryChange = jest.fn();
    baseProps.onStatusFilterChange = jest.fn();
    baseProps.onSortByChange = jest.fn();
  });

  it('rend les 4 tabs avec leurs counts', () => {
    render(<TourFilters {...baseProps} />);
    expect(screen.getByTestId('tour-filters-tab-all')).toHaveTextContent('Tous');
    expect(screen.getByTestId('tour-filters-tab-all')).toHaveTextContent('12');
    expect(screen.getByTestId('tour-filters-tab-live')).toHaveTextContent('9');
    expect(screen.getByTestId('tour-filters-tab-draft')).toHaveTextContent('2');
    expect(screen.getByTestId('tour-filters-tab-review')).toHaveTextContent('1');
  });

  it("marque le tab actif via aria-pressed", () => {
    render(<TourFilters {...baseProps} statusFilter="live" />);
    expect(screen.getByTestId('tour-filters-tab-live')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('tour-filters-tab-all')).toHaveAttribute('aria-pressed', 'false');
  });

  it("appelle onQueryChange à chaque saisie", () => {
    const onQueryChange = jest.fn();
    render(<TourFilters {...baseProps} onQueryChange={onQueryChange} />);
    fireEvent.change(screen.getByTestId('tour-filters-search'), { target: { value: 'nice' } });
    expect(onQueryChange).toHaveBeenCalledWith('nice');
  });

  it("appelle onStatusFilterChange au clic sur un tab", () => {
    const onStatusFilterChange = jest.fn();
    render(<TourFilters {...baseProps} onStatusFilterChange={onStatusFilterChange} />);
    fireEvent.click(screen.getByTestId('tour-filters-tab-draft'));
    expect(onStatusFilterChange).toHaveBeenCalledWith('draft');
  });

  it("appelle onSortByChange au changement de tri", () => {
    const onSortByChange = jest.fn();
    render(<TourFilters {...baseProps} onSortByChange={onSortByChange} />);
    fireEvent.change(screen.getByTestId('tour-filters-sort'), {
      target: { value: 'alphabetical' },
    });
    expect(onSortByChange).toHaveBeenCalledWith('alphabetical');
  });

  it("propose les 3 options de tri", () => {
    render(<TourFilters {...baseProps} />);
    const select = screen.getByTestId('tour-filters-sort') as HTMLSelectElement;
    expect(select.options).toHaveLength(3);
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      'most_played',
      'recently_modified',
      'alphabetical',
    ]);
  });
});
