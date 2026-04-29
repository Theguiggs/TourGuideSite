import { create } from 'zustand';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

export interface ToastEntry {
  id: string;
  variant: ToastVariant;
  message: string;
  /** Optional title shown in bold above the message. */
  title?: string;
  /** Auto-dismiss after this many ms. Set 0 to keep until manual dismiss. Default 4000. */
  durationMs: number;
  createdAt: number;
}

interface ToastState {
  toasts: ToastEntry[];
  show: (input: ShowToastInput) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

interface ShowToastInput {
  variant?: ToastVariant;
  message: string;
  title?: string;
  durationMs?: number;
}

const DEFAULT_DURATION = 4000;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: ({ variant = 'success', message, title, durationMs = DEFAULT_DURATION }) => {
    const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: ToastEntry = {
      id,
      variant,
      message,
      title,
      durationMs,
      createdAt: Date.now(),
    };
    set((state) => ({ toasts: [...state.toasts, entry] }));
    if (durationMs > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, durationMs);
    }
    return id;
  },

  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  clear: () => set({ toasts: [] }),
}));

/**
 * Convenience hook returning the show/dismiss API. Doesn't subscribe to the
 * toasts list itself — use this in handlers, not for rendering.
 *
 * Usage :
 *   const toast = useToast();
 *   toast.success('Profil sauvegardé.');
 *   toast.error('Échec', 'Réessayez dans un instant.');
 */
export function useToast() {
  const show = useToastStore((s) => s.show);
  const dismiss = useToastStore((s) => s.dismiss);
  return {
    show: (input: ShowToastInput) => show(input),
    success: (message: string, title?: string) =>
      show({ variant: 'success', message, title }),
    info: (message: string, title?: string) => show({ variant: 'info', message, title }),
    warning: (message: string, title?: string) =>
      show({ variant: 'warning', message, title }),
    error: (message: string, title?: string) =>
      show({ variant: 'error', message, title, durationMs: 6000 }),
    dismiss,
  };
}

export const selectToasts = (s: ToastState) => s.toasts;
