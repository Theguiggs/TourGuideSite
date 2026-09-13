import { act, fireEvent, render, screen } from '@testing-library/react';
import { PwaRegistration } from '../pwa-registration';

it('propose la version en attente sans activation automatique ni interruption audio', async () => {
  process.env.NEXT_PUBLIC_PWA_TEST = 'true';
  const worker = Object.assign(new EventTarget(), { state: 'installed', postMessage: jest.fn() });
  const registration = Object.assign(new EventTarget(), { waiting: worker, installing: null, update: jest.fn().mockResolvedValue(undefined) });
  const register = jest.fn().mockResolvedValue(registration);
  const original = Object.getOwnPropertyDescriptor(navigator, 'serviceWorker');
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { register, controller: {} } });
  try {
    const view = render(<PwaRegistration locale="fr" />);
    await act(async () => {});
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/', updateViaCache: 'none' });
    expect(screen.getByText('Une nouvelle version est prête.')).toBeVisible();
    expect(worker.postMessage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Recharger' }));
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'ACTIVATE_UPDATE' });
    expect(screen.getByRole('button', { name: 'Recharger' })).toBeDisabled();
    view.unmount();
  } finally {
    delete process.env.NEXT_PUBLIC_PWA_TEST;
    if (original) Object.defineProperty(navigator, 'serviceWorker', original);
    else Reflect.deleteProperty(navigator, 'serviceWorker');
  }
});
