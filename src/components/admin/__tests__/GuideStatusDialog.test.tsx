import { fireEvent, render, screen } from '@testing-library/react';
import { GuideStatusDialog } from '../GuideStatusDialog';

describe('GuideStatusDialog (lot 6.3)', () => {
  it('exige un motif d’au moins dix caractères pour suspendre, et le transmet épuré', () => {
    const onConfirm = jest.fn();
    render(<GuideStatusDialog target="suspended" guideName="Marie Dupont" onConfirm={onConfirm} onCancel={() => {}} />);

    const confirm = screen.getByTestId('guide-status-confirm');
    expect(confirm).toBeDisabled();
    expect(screen.getByText('Marie Dupont')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('guide-status-reason'), { target: { value: 'court' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(screen.getByTestId('guide-status-reason'), { target: { value: '  Audio hors charte sur trois visites.  ' } });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith('Audio hors charte sur trois visites.');
  });

  it('ne demande pas de motif pour activer, mais demande quand même confirmation', () => {
    const onConfirm = jest.fn();
    render(<GuideStatusDialog target="active" guideName="Marie Dupont" onConfirm={onConfirm} onCancel={() => {}} />);
    expect(screen.queryByTestId('guide-status-reason')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('guide-status-confirm'));
    expect(onConfirm).toHaveBeenCalledWith('');
  });

  it('affiche l’erreur du serveur et laisse le bouton actif pour réessayer', () => {
    render(<GuideStatusDialog target="rejected" guideName="X" error="Action refusée par le serveur." onConfirm={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Action refusée par le serveur.');
  });
});
