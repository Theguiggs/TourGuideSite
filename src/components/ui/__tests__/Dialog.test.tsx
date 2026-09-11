import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog, Dialog } from '../Dialog';

describe('Dialog', () => {
  it('rend un vrai <dialog> ouvert, nommé par son titre', () => {
    render(
      <Dialog open onClose={jest.fn()} labelledBy="t">
        <h2 id="t">Titre</h2>
      </Dialog>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Titre' });
    expect(dialog.tagName).toBe('DIALOG');
    expect(dialog).toHaveAttribute('open');
  });

  it('ne rend rien fermé', () => {
    const { container } = render(
      <Dialog open={false} onClose={jest.fn()} label="x">
        contenu
      </Dialog>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('Échap et le clic sur l’arrière-plan ferment ; un clic dans le contenu, non', () => {
    const onClose = jest.fn();
    render(
      <Dialog open onClose={onClose} label="x">
        <p>contenu</p>
      </Dialog>,
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('contenu'));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('peut refuser la fermeture par l’arrière-plan', () => {
    const onClose = jest.fn();
    render(
      <Dialog open onClose={onClose} label="x" dismissOnBackdrop={false}>
        <p>contenu</p>
      </Dialog>,
    );
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ConfirmDialog', () => {
  const base = {
    open: true,
    title: 'Supprimer ?',
    subject: 'Ma visite',
    description: 'Irréversible.',
    confirmLabel: 'Supprimer',
    cancelLabel: 'Annuler',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  it('nomme le dialogue par son titre, et place le focus sur Annuler', () => {
    render(<ConfirmDialog {...base} danger confirmTestId="confirm" />);
    expect(screen.getByRole('dialog', { name: 'Supprimer ?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus();
    expect(screen.getByTestId('confirm')).toHaveAccessibleDescription('Irréversible.');
  });

  it('confirme et annule', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(<ConfirmDialog {...base} onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(onConfirm).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('pendant l’action, rien ne ferme et les boutons sont inertes', () => {
    const onCancel = jest.fn();
    render(<ConfirmDialog {...base} busy onCancel={onCancel} error="Réseau" />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('Réseau');
  });
});
