import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WizInput } from '../WizInput';

describe('WizInput', () => {
  it("propagate value et onChange", () => {
    const onChange = jest.fn();
    render(<WizInput value="abc" onChange={onChange} aria-label="x" />);
    const input = screen.getByLabelText('x') as HTMLInputElement;
    expect(input.value).toBe('abc');
    fireEvent.change(input, { target: { value: 'def' } });
    expect(onChange).toHaveBeenCalled();
  });

  it("type='text' par défaut, accepte 'number'", () => {
    const { container } = render(<WizInput type="number" defaultValue="0" />);
    expect(container.querySelector('input')?.type).toBe('number');
  });

  it("accepte placeholder et disabled", () => {
    render(<WizInput placeholder="Tape" disabled aria-label="x" />);
    const input = screen.getByLabelText('x');
    expect(input).toHaveAttribute('placeholder', 'Tape');
    expect(input).toBeDisabled();
  });

  it("accepte une className supplémentaire", () => {
    const { container } = render(<WizInput className="custom" defaultValue="" />);
    expect(container.querySelector('input')?.className).toContain('custom');
  });
});
