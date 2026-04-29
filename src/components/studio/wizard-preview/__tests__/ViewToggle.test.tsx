import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewToggle } from '../ViewToggle';

describe('ViewToggle', () => {
  it("rend les 2 modes", () => {
    render(<ViewToggle value="studio" onChange={jest.fn()} />);
    expect(screen.getByTestId('view-toggle-studio')).toBeInTheDocument();
    expect(screen.getByTestId('view-toggle-catalogue')).toBeInTheDocument();
  });

  it("aria-pressed true sur le mode actif", () => {
    render(<ViewToggle value="catalogue" onChange={jest.fn()} />);
    expect(screen.getByTestId('view-toggle-catalogue')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('view-toggle-studio')).toHaveAttribute('aria-pressed', 'false');
  });

  it("appelle onChange au switch", () => {
    const onChange = jest.fn();
    render(<ViewToggle value="studio" onChange={onChange} />);
    fireEvent.click(screen.getByTestId('view-toggle-catalogue'));
    expect(onChange).toHaveBeenCalledWith('catalogue');
  });
});
