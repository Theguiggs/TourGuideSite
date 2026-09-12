'use client';

import { useId, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';

export type GuideStatusTarget = 'active' | 'suspended' | 'rejected';

/** Longueur minimale d'un motif : une phrase, pas un mot. */
export const REASON_MIN_LENGTH = 10;

const COPY: Record<GuideStatusTarget, { title: string; description: string; confirm: string; danger: boolean; reason: boolean }> = {
  active: {
    title: 'Activer ce compte guide ?',
    description: 'Le guide pourra publier des visites et apparaître dans le catalogue.',
    confirm: 'Activer le compte',
    danger: false,
    reason: false,
  },
  suspended: {
    title: 'Suspendre ce compte guide ?',
    description: 'Ses visites restent en ligne mais le guide ne peut plus rien publier. Le motif lui sera visible.',
    confirm: 'Suspendre',
    danger: true,
    reason: true,
  },
  rejected: {
    title: 'Rejeter ce compte guide ?',
    description: 'Le compte est refusé. Le motif lui sera visible.',
    confirm: 'Rejeter',
    danger: true,
    reason: true,
  },
};

export interface GuideStatusDialogProps {
  target: GuideStatusTarget;
  guideName: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Confirmation d'un changement de statut de guide (lot 6.3). Suspendre et
 * rejeter exigent un motif : il est enregistré (`GuideStatusDecision`) et lu
 * par le guide lui-même.
 */
export function GuideStatusDialog({ target, guideName, busy = false, error = null, onConfirm, onCancel }: GuideStatusDialogProps) {
  const copy = COPY[target];
  const titleId = useId();
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();
  const reasonOk = !copy.reason || trimmed.length >= REASON_MIN_LENGTH;

  return (
    <Dialog open onClose={busy ? () => {} : onCancel} labelledBy={titleId} dismissOnBackdrop={!busy} data-testid="guide-status-dialog">
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (reasonOk && !busy) onConfirm(trimmed);
        }}
      >
        <h2 id={titleId} className="font-display text-h5 text-ink">{copy.title}</h2>
        <p className="mt-1 text-body font-medium text-ink-80">{guideName}</p>
        <p className="mt-3 text-body text-ink-60">{copy.description}</p>

        {copy.reason && (
          <div className="mt-4">
            <label htmlFor={reasonId} className="block text-meta font-semibold text-ink-80">
              Motif <span className="text-danger">*</span>
            </label>
            <textarea
              id={reasonId}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              required
              minLength={REASON_MIN_LENGTH}
              disabled={busy}
              data-testid="guide-status-reason"
              className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2 text-body text-ink outline-none focus:border-grenadine"
              placeholder="Ce que le guide lira : la règle enfreinte, ce qu'il peut corriger."
            />
            <p className="mt-1 text-meta text-ink-40" aria-live="polite">
              {trimmed.length < REASON_MIN_LENGTH ? `${trimmed.length}/${REASON_MIN_LENGTH} caractères minimum` : 'Le motif sera visible par le guide.'}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-grenadine-soft px-3 py-2 text-body text-danger">{error}</p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            autoFocus
            className="rounded-lg px-4 py-2 text-body font-medium text-ink-80 hover:bg-paper-deep disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={busy || !reasonOk}
            data-testid="guide-status-confirm"
            className={`rounded-lg px-4 py-2 text-body font-medium text-white disabled:opacity-50 ${copy.danger ? 'bg-danger' : 'bg-olive'}`}
          >
            {busy ? 'En cours…' : copy.confirm}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
