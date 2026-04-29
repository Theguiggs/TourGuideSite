import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { StepNav } from '../StepNav';

describe('StepNav', () => {
  it("affiche un lien prev quand prevHref fourni", () => {
    render(<StepNav prevHref="/back" prevLabel="Sessions" nextHref="/next" nextLabel="Général" />);
    expect(screen.getByTestId('step-nav-prev')).toHaveAttribute('href', '/back');
    expect(screen.getByTestId('step-nav-prev')).toHaveTextContent('Sessions');
  });

  it("masque le lien prev sans prevHref", () => {
    render(<StepNav nextHref="/next" />);
    expect(screen.queryByTestId('step-nav-prev')).toBeNull();
  });

  it("rend un Link pour next si nextHref + pas d'onClick", () => {
    render(<StepNav nextHref="/next" nextLabel="Général" />);
    expect(screen.getByTestId('step-nav-next')).toHaveAttribute('href', '/next');
  });

  it("rend un button pour next si onNextClick fourni", () => {
    const onNextClick = jest.fn();
    render(<StepNav onNextClick={onNextClick} nextLabel="Action" />);
    fireEvent.click(screen.getByTestId('step-nav-next'));
    expect(onNextClick).toHaveBeenCalledTimes(1);
  });

  it("désactive le bouton next quand nextDisabled=true (button mode)", () => {
    render(<StepNav onNextClick={() => {}} nextDisabled />);
    expect(screen.getByTestId('step-nav-next')).toBeDisabled();
  });

  it("aria-disabled sur le Link next quand nextDisabled (link mode)", () => {
    render(<StepNav nextHref="/next" nextDisabled />);
    expect(screen.getByTestId('step-nav-next')).toHaveAttribute('aria-disabled', 'true');
  });

  it("masque le next sans nextHref ni onNextClick", () => {
    render(<StepNav prevHref="/back" />);
    expect(screen.queryByTestId('step-nav-next')).toBeNull();
  });
});
