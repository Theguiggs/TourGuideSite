'use client';

import { useToastStore, selectToasts } from '@/lib/stores/toast-store';
import { Toast } from './Toast';

/**
 * <Toaster> — conteneur global qui rend les toasts en position fixed
 * bottom-right. À monter une seule fois au layout root du Studio.
 */
export function Toaster() {
  const toasts = useToastStore(selectToasts);
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      data-testid="toaster"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"
    >
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}
