import React from 'react';
import { render, screen } from '@testing-library/react';
import { QuotaDisplay } from '../quota-display';

describe('QuotaDisplay', () => {
  it('renders nothing when quota is null', () => {
    const { container } = render(<QuotaDisplay quota={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders normal quota', () => {
    render(<QuotaDisplay quota={{ usedMinutes: 30, limitMinutes: 120, remainingMinutes: 90, isWarning: false, isExceeded: false }} />);
    expect(screen.getByTestId('quota-display')).toBeInTheDocument();
    expect(screen.getByText('30 / 120 min')).toBeInTheDocument();
  });

  it('shows warning indicator when approaching limit', () => {
    render(<QuotaDisplay quota={{ usedMinutes: 105, limitMinutes: 120, remainingMinutes: 15, isWarning: true, isExceeded: false }} />);
    expect(screen.getByText('Attention')).toBeInTheDocument();
  });

  it('shows exceeded alert', () => {
    render(<QuotaDisplay quota={{ usedMinutes: 120, limitMinutes: 120, remainingMinutes: 0, isWarning: true, isExceeded: true }} />);
    expect(screen.getByText('Quota atteint')).toBeInTheDocument();
  });

  it('has accessible progressbar', () => {
    render(<QuotaDisplay quota={{ usedMinutes: 60, limitMinutes: 120, remainingMinutes: 60, isWarning: false, isExceeded: false }} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '60');
    expect(bar).toHaveAttribute('aria-valuemax', '120');
  });
});
