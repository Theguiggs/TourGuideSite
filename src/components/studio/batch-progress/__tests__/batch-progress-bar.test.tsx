import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { BatchProgressBar } from '../batch-progress-bar';
import { useLanguageBatchStore } from '@/lib/stores/language-batch-store';

describe('BatchProgressBar', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useLanguageBatchStore.getState().resetBatch();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the correct percentage', () => {
    useLanguageBatchStore.getState().initBatch('en', 4);
    useLanguageBatchStore.getState().updateProgress('en', 'scene-1');
    useLanguageBatchStore.getState().updateProgress('en', 'scene-2');

    render(<BatchProgressBar />);

    expect(screen.getByTestId('batch-progress-percentage')).toHaveTextContent('50%');
  });

  it('displays the current scene name', () => {
    useLanguageBatchStore.getState().initBatch('en', 3);
    useLanguageBatchStore.getState().updateProgress('en', 'Cathédrale Notre-Dame');

    render(<BatchProgressBar />);

    expect(screen.getByTestId('batch-current-scene')).toHaveTextContent('Cathédrale Notre-Dame');
  });

  it('activates sticky mode after 30 seconds', () => {
    useLanguageBatchStore.getState().initBatch('en', 10);
    useLanguageBatchStore.getState().updateProgress('en', 'scene-1');

    render(<BatchProgressBar />);

    const container = screen.getByTestId('batch-progress-bar');
    expect(container.className).not.toContain('sticky');

    act(() => {
      jest.advanceTimersByTime(30_000);
    });

    expect(container.className).toContain('sticky');
    expect(container.className).toContain('shadow-md');
  });

  it('disappears when batch completes', () => {
    useLanguageBatchStore.getState().initBatch('en', 2);
    useLanguageBatchStore.getState().updateProgress('en', 'scene-1');
    useLanguageBatchStore.getState().updateProgress('en', 'scene-2');

    const { rerender } = render(<BatchProgressBar />);
    expect(screen.getByTestId('batch-progress-bar')).toBeInTheDocument();

    // Mark as completed
    act(() => {
      useLanguageBatchStore.getState().markCompleted('en');
    });

    rerender(<BatchProgressBar />);
    expect(screen.queryByTestId('batch-progress-bar')).not.toBeInTheDocument();
  });
});
