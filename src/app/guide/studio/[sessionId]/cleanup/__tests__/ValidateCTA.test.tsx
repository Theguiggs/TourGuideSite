import { render, screen, fireEvent } from '@testing-library/react';
import { ValidateCTA } from '../components/ValidateCTA';

describe('ValidateCTA', () => {
  it('is disabled and shows reasons when validation.ready=false', () => {
    const onValidate = jest.fn();
    render(
      <ValidateCTA
        validation={{ ready: false, reasons: ['Titre trop court', 'Au moins 1 thème requis'] }}
        busy={false}
        onValidate={onValidate}
      />,
    );
    const button = screen.getByTestId('validate-cta-button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', expect.stringMatching(/Titre trop court/));
    const reasons = screen.getByTestId('validate-cta-reasons');
    expect(reasons.textContent).toMatch(/Titre trop court/);
    expect(reasons.textContent).toMatch(/thème requis/);
  });

  it('is enabled and shows "Prêt" indicator when validation.ready=true', () => {
    const onValidate = jest.fn();
    render(
      <ValidateCTA
        validation={{ ready: true, reasons: [] }}
        busy={false}
        onValidate={onValidate}
      />,
    );
    const button = screen.getByTestId('validate-cta-button');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('title', 'Prêt à valider');
    expect(screen.getByTestId('validate-cta-ready')).toBeInTheDocument();
  });

  it('invokes onValidate on click when enabled, not when disabled', () => {
    const onValidate = jest.fn();
    const { rerender } = render(
      <ValidateCTA
        validation={{ ready: false, reasons: ['err'] }}
        busy={false}
        onValidate={onValidate}
      />,
    );
    fireEvent.click(screen.getByTestId('validate-cta-button'));
    expect(onValidate).not.toHaveBeenCalled();

    rerender(
      <ValidateCTA
        validation={{ ready: true, reasons: [] }}
        busy={false}
        onValidate={onValidate}
      />,
    );
    fireEvent.click(screen.getByTestId('validate-cta-button'));
    expect(onValidate).toHaveBeenCalledTimes(1);
  });

  it('shows busy label and stays disabled when busy=true even if ready', () => {
    render(
      <ValidateCTA
        validation={{ ready: true, reasons: [] }}
        busy={true}
        onValidate={jest.fn()}
      />,
    );
    const button = screen.getByTestId('validate-cta-button');
    expect(button).toBeDisabled();
    expect(button.textContent).toMatch(/Validation/);
  });
});
