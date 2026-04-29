import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalMetadataPanel } from '../components/GlobalMetadataPanel';
import type { TourMetadataDraft } from '../lib/validation';

const EMPTY: TourMetadataDraft = {
  title: '',
  description: '',
  themes: [],
  language: 'fr',
  durationMinutes: null,
};

describe('GlobalMetadataPanel', () => {
  it('renders all required fields with hint labels', () => {
    const onChange = jest.fn();
    render(<GlobalMetadataPanel value={EMPTY} onChange={onChange} />);
    expect(screen.getByTestId('metadata-title-input')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-description-input')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-themes')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-language-select')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-duration-input')).toBeInTheDocument();
  });

  it('emits title patch on input change', () => {
    const onChange = jest.fn();
    render(<GlobalMetadataPanel value={EMPTY} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('metadata-title-input'), {
      target: { value: 'Nouveau titre' },
    });
    expect(onChange).toHaveBeenCalledWith({ title: 'Nouveau titre' });
  });

  it('toggles a theme on and off via the chip buttons', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <GlobalMetadataPanel value={EMPTY} onChange={onChange} />,
    );
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));
    expect(onChange).toHaveBeenCalledWith({ themes: ['histoire'] });

    // simulate parent applying patch
    rerender(
      <GlobalMetadataPanel
        value={{ ...EMPTY, themes: ['histoire'] }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByTestId('metadata-theme-histoire'));
    expect(onChange).toHaveBeenLastCalledWith({ themes: [] });
  });

  it('floors non-integer duration input to an integer (regression: GCI-4.2 CR)', () => {
    const onChange = jest.fn();
    render(<GlobalMetadataPanel value={EMPTY} onChange={onChange} />);
    fireEvent.change(screen.getByTestId('metadata-duration-input'), {
      target: { value: '60.9' },
    });
    // Must not persist fractional minutes — we floor to 60.
    expect(onChange).toHaveBeenCalledWith({ durationMinutes: 60 });
  });

  it('emits durationMinutes as null when input cleared, number when filled', () => {
    const onChange = jest.fn();
    const { rerender } = render(
      <GlobalMetadataPanel value={EMPTY} onChange={onChange} />,
    );
    fireEvent.change(screen.getByTestId('metadata-duration-input'), {
      target: { value: '60' },
    });
    expect(onChange).toHaveBeenCalledWith({ durationMinutes: 60 });

    // Simulate parent applying the patch so the controlled input reflects 60,
    // then clear and assert null is emitted.
    rerender(
      <GlobalMetadataPanel
        value={{ ...EMPTY, durationMinutes: 60 }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByTestId('metadata-duration-input'), {
      target: { value: '' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ durationMinutes: null });
  });
});
