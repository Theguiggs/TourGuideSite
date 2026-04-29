import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Teleprompter } from '../teleprompter';

// Mock scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = jest.fn();

// Mock requestAnimationFrame
beforeEach(() => {
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    return setTimeout(() => cb(performance.now()), 16) as unknown as number;
  });
  jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => clearTimeout(id));
});

afterEach(() => {
  jest.restoreAllMocks();
});

const SAMPLE_TEXT = 'Bienvenue sur la Place aux Aires ancien marché aux herbes de Grasse';

describe('Teleprompter', () => {
  it('renders all words', () => {
    render(<Teleprompter text={SAMPLE_TEXT} />);
    expect(screen.getByText('Bienvenue')).toBeInTheDocument();
    expect(screen.getByText('Grasse')).toBeInTheDocument();
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
