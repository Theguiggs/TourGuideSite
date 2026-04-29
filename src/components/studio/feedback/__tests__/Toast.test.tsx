import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from '../Toast';
import { Toaster } from '../Toaster';
import { useToastStore } from '@/lib/stores/toast-store';

describe('Toast', () => {
  beforeEach(() => useToastStore.getState().clear());

  it("rend message et titre", () => {
    render(
      <Toast
        toast={{
          id: 't1',
          variant: 'success',
          message: 'Sauvé.',
          title: 'OK',
          durationMs: 0,
          createdAt: 0,
        }}
      />,
    );
    expect(screen.getByText('Sauvé.')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();
  });

  it("data-variant correspond", () => {
    render(
      <Toast
        toast={{
          id: 't1',
          variant: 'error',
          message: 'KO',
          durationMs: 0,
          createdAt: 0,
        }}
      />,
    );
    expect(screen.getByTestId('toast')).toHaveAttribute('data-variant', 'error');
  });

  it("error variant a role='alert'", () => {
    render(
      <Toast
        toast={{
          id: 't1',
          variant: 'error',
          message: 'KO',
          durationMs: 0,
          createdAt: 0,
        }}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it("autres variants ont role='status'", () => {
    render(
      <Toast
        toast={{
          id: 't1',
          variant: 'success',
          message: 'OK',
          durationMs: 0,
          createdAt: 0,
        }}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it("dismiss au clic sur ×", () => {
    useToastStore.getState().show({ message: 'X' });
    const id = useToastStore.getState().toasts[0].id;
    render(
      <Toast
        toast={{
          id,
          variant: 'success',
          message: 'X',
          durationMs: 0,
          createdAt: 0,
        }}
      />,
    );
    fireEvent.click(screen.getByTestId('toast-dismiss'));
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});

describe('Toaster', () => {
  beforeEach(() => useToastStore.getState().clear());

  it("ne rend rien si aucun toast", () => {
    render(<Toaster />);
    expect(screen.queryByTestId('toaster')).toBeNull();
  });

  it("rend tous les toasts du store", () => {
    useToastStore.getState().show({ message: 'A', durationMs: 0 });
    useToastStore.getState().show({ message: 'B', durationMs: 0 });
    render(<Toaster />);
    expect(screen.getAllByTestId('toast')).toHaveLength(2);
  });
});
