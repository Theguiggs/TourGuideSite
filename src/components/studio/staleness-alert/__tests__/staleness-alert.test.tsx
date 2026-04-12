import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StalenessAlert } from '../staleness-alert';

describe('StalenessAlert', () => {
  it('renders banner when staleCount > 0', () => {
    render(
      <StalenessAlert
        staleCount={3}
        staleSegmentIds={['seg-1', 'seg-2', 'seg-3']}
        onRetranslate={jest.fn()}
      />,
    );

    expect(screen.getByTestId('staleness-alert')).toBeInTheDocument();
    expect(screen.getByText(/3 scenes modifiees depuis la derniere traduction/)).toBeInTheDocument();
  });

  it('renders nothing when staleCount is 0', () => {
    const { container } = render(
      <StalenessAlert
        staleCount={0}
        staleSegmentIds={[]}
        onRetranslate={jest.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('calls onRetranslate with segment ids when button clicked', () => {
    const onRetranslate = jest.fn();
    const ids = ['seg-a', 'seg-b'];

    render(
      <StalenessAlert
        staleCount={2}
        staleSegmentIds={ids}
        onRetranslate={onRetranslate}
      />,
    );

    fireEvent.click(screen.getByTestId('staleness-retranslate-button'));

    expect(onRetranslate).toHaveBeenCalledTimes(1);
    expect(onRetranslate).toHaveBeenCalledWith(ids);
  });

  it('uses singular form when staleCount is 1', () => {
    render(
      <StalenessAlert
        staleCount={1}
        staleSegmentIds={['seg-1']}
        onRetranslate={jest.fn()}
      />,
    );

    expect(screen.getByText(/1 scene modifiee depuis la derniere traduction/)).toBeInTheDocument();
    expect(screen.getByText(/Retraduire 1/)).toBeInTheDocument();
  });

  it('has role=alert for accessibility', () => {
    render(
      <StalenessAlert
        staleCount={2}
        staleSegmentIds={['seg-1', 'seg-2']}
        onRetranslate={jest.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
