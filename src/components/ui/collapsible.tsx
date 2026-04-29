'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';

interface CollapsibleProps {
  /** Unique key used to persist open/closed state in localStorage */
  storageKey?: string;
  /** Default state when no localStorage value exists */
  defaultOpen?: boolean;
  /** Header content (always visible) */
  title: ReactNode;
  /** Optional subtitle / metadata shown next to the title */
  subtitle?: ReactNode;
  /** Optional icon shown left of the title */
  icon?: ReactNode;
  /** Body content (shown when open) */
  children: ReactNode;
  /** Optional class on the wrapper */
  className?: string;
  /** Compact mode — smaller paddings */
  compact?: boolean;
  /** Test ID */
  testId?: string;
}

/**
 * Collapsible card with a clickable header. Persists open/closed state
 * in localStorage when `storageKey` is provided.
 *
 * Use to reduce vertical scrolling on long pages: collapse passive info
 * by default, let the user expand on demand.
 */
export function Collapsible({
  storageKey,
  defaultOpen = false,
  title,
  subtitle,
  icon,
  children,
  className,
  compact = false,
  testId,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount.
  // setState calls below are intentional one-shot hydration — disabled the
  // set-state-in-effect rule per call (it doesn't apply to mount-only side effects).
  useEffect(() => {
    if (!storageKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHydrated(true);
      return;
    }
    try {
      const stored = localStorage.getItem(`collapsible:${storageKey}`);
      if (stored !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setOpen(stored === 'true');
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true);
  }, [storageKey]);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      const next = !prev;
      if (storageKey) {
        try { localStorage.setItem(`collapsible:${storageKey}`, String(next)); } catch { /* ignore */ }
      }
      return next;
    });
  }, [storageKey]);

  const padHeader = compact ? 'px-3 py-2' : 'px-4 py-3';
  const padBody = compact ? 'px-3 pb-3' : 'px-4 pb-4';

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white ${className ?? ''}`}
      data-testid={testId}
    >
      <button
        type="button"
        onClick={toggle}
        className={`w-full flex items-center gap-2 ${padHeader} text-left hover:bg-gray-50 rounded-lg transition-colors`}
        aria-expanded={open}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-gray-800">{title}</span>
          {subtitle && <span className="ml-2 text-xs text-gray-500">{subtitle}</span>}
        </span>
        <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-90' : ''}`}>
          &#x25B6;
        </span>
      </button>
      {hydrated && open && <div className={padBody}>{children}</div>}
    </div>
  );
}
