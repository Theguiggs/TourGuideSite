import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MicHelp } from '../mic-help';

describe('MicHelp', () => {
  it('renders help panel', () => {
    render(<MicHelp onClose={jest.fn()} />);
    expect(screen.getByTestId('mic-help')).toBeInTheDocument();
    expect(screen.getByText(/Permission micro/)).toBeInTheDocument();
  });

  it('shows browser tabs', () => {
    render(<MicHelp onClose={jest.fn()} />);
    expect(screen.getByTestId('browser-tab-chrome')).toBeInTheDocument();
    expect(screen.getByTestId('browser-tab-firefox')).toBeInTheDocument();
    expect(screen.getByTestId('browser-tab-safari')).toBeInTheDocument();
  });

  it('switches browser instructions', () => {
    render(<MicHelp onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId('browser-tab-firefox'));
    expect(screen.getByText(/Supprimer les permissions/)).toBeInTheDocument();
  });

  it('close button calls onClose', () => {
    const onClose = jest.fn();
    render(<MicHelp onClose={onClose} />);
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows alternative import tip', () => {
    render(<MicHelp onClose={jest.fn()} />);
    expect(screen.getByText(/Alternative/)).toBeInTheDocument();
  });
});
