import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActionRow } from '../ActionRow';

describe('ActionRow', () => {
  it("rend titre et description", () => {
    render(
      <ActionRow
        variant="mer"
        icon="↑"
        title="Publier"
        description="Envoyer à la modération"
      />,
    );
    expect(screen.getByText('Publier')).toBeInTheDocument();
    expect(screen.getByText('Envoyer à la modération')).toBeInTheDocument();
  });

  it("appelle onClick", () => {
    const onClick = jest.fn();
    render(
      <ActionRow variant="mer" icon="↑" title="X" description="Y" onClick={onClick} />,
    );
    fireEvent.click(screen.getByTestId('action-row'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("est désactivé quand disabled", () => {
    render(
      <ActionRow variant="danger" icon="🗑" title="X" description="Y" disabled />,
    );
    expect(screen.getByTestId('action-row')).toBeDisabled();
  });

  it("data-variant correspond", () => {
    render(<ActionRow variant="danger" icon="x" title="X" description="Y" />);
    expect(screen.getByTestId('action-row')).toHaveAttribute('data-variant', 'danger');
  });
});
