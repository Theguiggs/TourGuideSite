import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { WizSelect } from '../WizSelect';

const options = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
];

describe('WizSelect', () => {
  it("rend toutes les options", () => {
    render(<WizSelect options={options} aria-label="lang" defaultValue="fr" />);
    const sel = screen.getByLabelText('lang') as HTMLSelectElement;
    expect(sel.options).toHaveLength(2);
  });

  it("propagate value + onChange", () => {
    const onChange = jest.fn();
    render(<WizSelect options={options} value="fr" onChange={onChange} aria-label="lang" />);
    fireEvent.change(screen.getByLabelText('lang'), { target: { value: 'en' } });
    expect(onChange).toHaveBeenCalled();
  });

  it("rend un caret ▼", () => {
    const { container } = render(
      <WizSelect options={options} aria-label="lang" defaultValue="fr" />,
    );
    expect(container.textContent).toContain('▼');
  });
});
