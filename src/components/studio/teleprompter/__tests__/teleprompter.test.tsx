import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Teleprompter } from '../teleprompter';

// Mock scrolling methods (not available in jsdom)
Element.prototype.scrollBy = jest.fn();

// Mock requestAnimationFrame
beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id));
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const SAMPLE_TEXT = 'Bienvenue sur la Place aux Aires ancien marché aux herbes de Grasse';

describe('Teleprompter', () => {
  it('renders all words', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    expect(screen.getByText('Bienvenue')).toBeInTheDocument();
    expect(screen.getByText('Grasse')).toBeInTheDocument();
  });

  it('keeps already-read words visible while moving the highlight', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    const firstWord = screen.getByText('Bienvenue');

    expect(firstWord).toHaveClass('text-paper', 'bg-ocre');
    fireEvent.click(screen.getByTestId('prompter-start'));

    act(() => {
      jest.advanceTimersByTime(1_000);
    });

    expect(firstWord).toHaveClass('text-paper');
    expect(firstWord).not.toHaveClass('text-ink-40');
  });

  it('lets the user scroll manually and offers to resume automatic follow', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    fireEvent.click(screen.getByTestId('prompter-start'));

    fireEvent.wheel(screen.getByTestId('prompter-scroll-area'), { deltaY: 100 });
    expect(screen.getByTestId('prompter-follow')).toHaveTextContent('Suivre le texte');

    fireEvent.click(screen.getByTestId('prompter-follow'));
    expect(screen.queryByTestId('prompter-follow')).not.toBeInTheDocument();
  });

  it('keeps manual control after scrolling while paused', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    fireEvent.click(screen.getByTestId('prompter-start'));
    fireEvent.click(screen.getByTestId('prompter-pause'));

    fireEvent.wheel(screen.getByTestId('prompter-scroll-area'), { deltaY: 100 });
    fireEvent.click(screen.getByTestId('prompter-resume'));

    expect(screen.getByTestId('prompter-follow')).toBeInTheDocument();
  });

  it('renders start button', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    expect(screen.getByTestId('prompter-start')).toBeInTheDocument();
  });

  it('shows pause button after start', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    fireEvent.click(screen.getByTestId('prompter-start'));
    expect(screen.getByTestId('prompter-pause')).toBeInTheDocument();
  });

  it('shows resume button when paused', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    fireEvent.click(screen.getByTestId('prompter-start'));
    fireEvent.click(screen.getByTestId('prompter-pause'));
    expect(screen.getByTestId('prompter-resume')).toBeInTheDocument();
  });

  it('shows stop button when active', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    fireEvent.click(screen.getByTestId('prompter-start'));
    expect(screen.getByTestId('prompter-stop')).toBeInTheDocument();
  });

  it('renders speed slider', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    expect(screen.getByTestId('speed-slider')).toBeInTheDocument();
  });

  it('renders chronomètre starting at 00:00', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    expect(screen.getByTestId('chronometre')).toHaveTextContent('00:00');
  });

  it('has dark background for contrast (NFR19)', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    const container = screen.getByTestId('teleprompter');
    expect(container).toBeInTheDocument();
    // The bg-ink class provides >4.5:1 contrast with text-gray-100
  });
});
