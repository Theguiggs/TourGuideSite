import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { PoiOverviewCard } from '../PoiOverviewCard';

describe('PoiOverviewCard', () => {
  const baseProps = {
    index: 1,
    title: 'Place du Peyra',
    hasGps: true,
    validated: false,
  };

  it("rend numéro et titre", () => {
    render(<PoiOverviewCard {...baseProps} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Place du Peyra')).toBeInTheDocument();
  });

  it("indicateur GPS OK quand hasGps=true", () => {
    render(<PoiOverviewCard {...baseProps} hasGps />);
    expect(screen.getByText(/GPS OK/)).toBeInTheDocument();
  });

  it("indicateur Pas de GPS quand hasGps=false", () => {
    render(<PoiOverviewCard {...baseProps} hasGps={false} />);
    expect(screen.getByText(/Pas de GPS/)).toBeInTheDocument();
  });

  it("affiche '✓ Validé' quand validated=true", () => {
    render(<PoiOverviewCard {...baseProps} validated />);
    expect(screen.getByTestId('poi-validated')).toBeInTheDocument();
  });

  it("appelle onEdit / onToggleValidate / onDelete", () => {
    const onEdit = jest.fn();
    const onToggleValidate = jest.fn();
    const onDelete = jest.fn();
    render(
      <PoiOverviewCard
        {...baseProps}
        onEdit={onEdit}
        onToggleValidate={onToggleValidate}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByTestId('poi-edit'));
    fireEvent.click(screen.getByTestId('poi-validate'));
    fireEvent.click(screen.getByTestId('poi-delete'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onToggleValidate).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("affiche reorder buttons selon canMoveUp/Down", () => {
    const onMoveUp = jest.fn();
    const onMoveDown = jest.fn();
    render(
      <PoiOverviewCard
        {...baseProps}
        canMoveUp
        canMoveDown
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />,
    );
    fireEvent.click(screen.getByTestId('poi-move-up'));
    fireEvent.click(screen.getByTestId('poi-move-down'));
    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  it("masque les actions quand locked", () => {
    render(<PoiOverviewCard {...baseProps} locked onEdit={jest.fn()} />);
    expect(screen.queryByTestId('poi-edit')).toBeNull();
  });
});
