import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WizTextarea } from '../WizTextarea';

describe('WizTextarea', () => {
  it("propagate value et onChange", () => {
    const onChange = jest.fn();
    render(<WizTextarea value="hello" onChange={onChange} aria-label="ta" />);
    const ta = screen.getByLabelText('ta') as HTMLTextAreaElement;
    expect(ta.value).toBe('hello');
    fireEvent.change(ta, { target: { value: 'world' } });
    expect(onChange).toHaveBeenCalled();
  });

  it("rows par défaut à 4", () => {
    render(<WizTextarea defaultValue="" aria-label="ta" />);
    expect(screen.getByLabelText('ta')).toHaveAttribute('rows', '4');
  });

  it("rows customisable", () => {
    render(<WizTextarea rows={8} defaultValue="" aria-label="ta" />);
    expect(screen.getByLabelText('ta')).toHaveAttribute('rows', '8');
  });

  it("accepte maxLength", () => {
    render(<WizTextarea maxLength={500} defaultValue="" aria-label="ta" />);
    expect(screen.getByLabelText('ta')).toHaveAttribute('maxlength', '500');
  });
});
