import { useToastStore } from '../toast-store';

describe('toast-store', () => {
  beforeEach(() => {
    useToastStore.getState().clear();
  });

  it("ajoute un toast via show()", () => {
    useToastStore.getState().show({ message: 'OK' });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].message).toBe('OK');
  });

  it("default variant = 'success'", () => {
    useToastStore.getState().show({ message: 'OK' });
    expect(useToastStore.getState().toasts[0].variant).toBe('success');
  });

  it("respecte le variant fourni", () => {
    useToastStore.getState().show({ variant: 'error', message: 'KO' });
    expect(useToastStore.getState().toasts[0].variant).toBe('error');
  });

  it("génère un id unique", () => {
    const a = useToastStore.getState().show({ message: 'A' });
    const b = useToastStore.getState().show({ message: 'B' });
    expect(a).not.toBe(b);
  });

  it("dismiss() retire un toast", () => {
    const id = useToastStore.getState().show({ message: 'X' });
    useToastStore.getState().dismiss(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it("auto-dismiss après durationMs", () => {
    jest.useFakeTimers();
    useToastStore.getState().show({ message: 'X', durationMs: 1000 });
    expect(useToastStore.getState().toasts).toHaveLength(1);
    jest.advanceTimersByTime(1500);
    expect(useToastStore.getState().toasts).toHaveLength(0);
    jest.useRealTimers();
  });

  it("durationMs=0 garde le toast", () => {
    jest.useFakeTimers();
    useToastStore.getState().show({ message: 'X', durationMs: 0 });
    jest.advanceTimersByTime(60_000);
    expect(useToastStore.getState().toasts).toHaveLength(1);
    jest.useRealTimers();
  });

  it("clear() vide tout", () => {
    useToastStore.getState().show({ message: 'A' });
    useToastStore.getState().show({ message: 'B' });
    useToastStore.getState().clear();
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });
});
