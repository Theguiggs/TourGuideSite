import React from 'react';
import { render, screen } from '@testing-library/react';
import { BatchProgressBar } from '../batch-progress-bar';
import { useLanguageBatchStore } from '@/lib/stores/language-batch-store';

describe('BatchProgressBar — Accessibility (ML-6.4)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useLanguageBatchStore.getState().resetBatch();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('has role="progressbar" with aria-valuenow on progress fill', () => {
    useLanguageBatchStore.getState().initBatch('en', 4);
    useLanguageBatchStore.getState().updateProgress('en', 'scene-1');
    useLanguageBatchStore.getState().updateProgress('en', 'scene-2');

    render(<BatchProgressBar />);

    const progressFill = screen.getByTestId('batch-progress-fill');
    expect(progressFill).toHaveAttribute('role', 'progressbar');
    expect(progressFill).toHaveAttribute('aria-valuenow', '50');
    expect(progressFill).toHaveAttribute('aria-valuemin', '0');
    expect(progressFill).toHaveAttribute('aria-valuemax', '100');
  });

  it('has descriptive aria-label on progressbar', () => {
    useLanguageBatchStore.getState().initBatch('en', 3);
    useLanguageBatchStore.getState().updateProgress('en', 'scene-1');

    render(<BatchProgressBar />);

    const progressFill = screen.getByTestId('batch-progress-fill');
    const label = progressFill.getAttribute('aria-label');
    expect(label).toContain('33%');
    expect(label).toContain('1 sur 3');
  });

  it('has aria-live="polite" on progress counter section', () => {
    useLanguageBatchStore.getState().initBatch('en', 2);
    useLanguageBatchStore.getState().updateProgress('en', 'scene-1');

    render(<BatchProgressBar />);

    const container = screen.getByTestId('batch-progress-bar');
    const liveRegion = container.querySelector('[aria-live="polite"]');
    expect(liveRegion).not.toBeNull();
  });

  it('has role="status" on the container for screen reader announcement', () => {
    useLanguageBatchStore.getState().initBatch('en', 2);

    render(<BatchProgressBar />);

    const container = screen.getByTestId('batch-progress-bar');
    expect(container).toHaveAttribute('role', 'status');
    expect(container).toHaveAttribute('aria-label', 'Progression de la traduction');
  });
});
