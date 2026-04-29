'use client';

import { useToastStore, type ToastEntry, type ToastVariant } from '@/lib/stores/toast-store';

interface ToastProps {
  toast: ToastEntry;
}

const VARIANT_CFG: Record<
  ToastVariant,
  { bg: string; border: string; text: string; icon: string }
> = {
  success: {
    bg: 'bg-grenadine-soft',
    border: 'border-grenadine',
    text: 'text-grenadine',
    icon: '✓',
  },
  info: {
    bg: 'bg-mer-soft',
    border: 'border-mer',
    text: 'text-mer',
    icon: 'ⓘ',
  },
  warning: {
    bg: 'bg-ocre-soft',
    border: 'border-ocre',
    text: 'text-ocre',
    icon: '⚠',
  },
  error: {
    bg: 'bg-grenadine-soft',
    border: 'border-danger',
    text: 'text-danger',
    icon: '✕',
  },
};

/**
 * <Toast> — toast unifié Murmure (rendered by `<Toaster>`).
 * Brief §7 Phase 5 (« toast de succès en grenadine soft, position bottom-right »).
 */
export function Toast({ toast }: ToastProps) {
  const dismiss = useToastStore((s) => s.dismiss);
  const cfg = VARIANT_CFG[toast.variant];

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      data-testid="toast"
      data-variant={toast.variant}
      className={`rounded-md border ${cfg.bg} ${cfg.border} px-4 py-3 shadow-md flex items-start gap-3 max-w-sm pointer-events-auto`}
    >
      <span aria-hidden="true" className={`text-h6 leading-none shrink-0 ${cfg.text}`}>
        {cfg.icon}
      </span>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <div className={`text-caption font-bold ${cfg.text}`}>{toast.title}</div>
        )}
        <div className="text-meta text-ink-80">{toast.message}</div>
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Fermer"
        data-testid="toast-dismiss"
        className="text-ink-40 hover:text-ink leading-none text-h6 cursor-pointer transition"
      >
        ×
      </button>
    </div>
  );
}
