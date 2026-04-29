import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SpecialtyChipsInput } from '../SpecialtyChipsInput';

describe('SpecialtyChipsInput', () => {
  it('rend les chips fournies', () => {
    const onChange = jest.fn();
    render(<SpecialtyChipsInput value={['Histoire', 'Parfumerie']} onChange={onChange} />);
    expect(screen.getByTestId('specialty-chip-Histoire')).toBeInTheDocument();
    expect(screen.getByTestId('specialty-chip-Parfumerie')).toBeInTheDocument();
  });

  it('ajoute une chip via Enter', () => {
    const onChange = jest.fn();
    render(<SpecialtyChipsInput value={[]} onChange={onChange} />);
    const input = screen.getByTestId('specialty-chips-input-field');
    fireEvent.change(input, { target: { value: 'Architecture' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledWith(['Architecture']);
  });

  it('ajoute une chip via virgule', () => {
    const onChange = jest.fn();
    render(<SpecialtyChipsInput value={[]} onChange={onChange} />);
    const input = screen.getByTestId('specialty-chips-input-field');
    fireEvent.change(input, { target: { value: 'Cuisine' } });
    fireEvent.keyDown(input, { key: ',' });
    expect(onChange).toHaveBeenCalledWith(['Cuisine']);
  });

  it("retire une chip au clic sur ✕", () => {
    const onChange = jest.fn();
    render(<SpecialtyChipsInput value={['Histoire', 'Parfumerie']} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Retirer Histoire'));
    expect(onChange).toHaveBeenCalledWith(['Parfumerie']);
  });

  it('Backspace sur input vide retire la dernière chip', () => {
    const onChange = jest.fn();
    render(<SpecialtyChipsInput value={['a', 'b']} onChange={onChange} />);
    const input = screen.getByTestId('specialty-chips-input-field');
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledWith(['a']);
  });

  it("appelle onError sur doublon (case-insensitive)", () => {
    const onChange = jest.fn();
    const onError = jest.fn();
    render(<SpecialtyChipsInput value={['Histoire']} onChange={onChange} onError={onError} />);
    const input = screen.getByTestId('specialty-chips-input-field');
    fireEvent.change(input, { target: { value: 'HISTOIRE' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it("désactive l'input quand max atteint", () => {
    render(<SpecialtyChipsInput value={['a', 'b']} onChange={jest.fn()} max={2} />);
    expect(screen.getByTestId('specialty-chips-input-field')).toBeDisabled();
  });
});
