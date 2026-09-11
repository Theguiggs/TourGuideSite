'use client';

/**
 * Dialogue modal sur `<dialog>` natif (lot 4).
 *
 * Quinze superpositions maison coexistaient (confirmations, visionneuses,
 * modales du Studio) : aucune ne piégeait le focus, aucune ne le rendait à
 * la fermeture, une seule n'avait pas d'Échap, la plupart n'avaient ni rôle
 * ni nom. `showModal()` apporte tout cela d'un coup — piège du focus,
 * arrière-plan inerte, Échap, restitution du focus — et le navigateur, pas
 * nous, garantit le comportement.
 *
 * `open` est piloté par le parent ; `onClose` est appelé pour Échap, le clic
 * sur l'arrière-plan (si `dismissOnBackdrop`) et `close()` interne. Le
 * contenu porte son titre via `aria-labelledby` (ou `aria-label`).
 */

import { useEffect, useRef, type ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  /** id de l'élément qui nomme le dialogue (titre). */
  labelledBy?: string;
  /** Nom direct, quand il n'y a pas de titre visible. */
  label?: string;
  /** Un clic sur l'arrière-plan ferme (défaut : oui). Désactiver pendant une action irréversible. */
  dismissOnBackdrop?: boolean;
  /** Classes du panneau (le `<dialog>` lui-même). */
  className?: string;
  /** Classes de l'arrière-plan. */
  backdropClassName?: string;
  'data-testid'?: string;
  children: ReactNode;
}

const PANEL_BASE =
  'm-auto w-full max-w-sm rounded-xl bg-card p-0 text-ink shadow-2xl outline-none backdrop:bg-black/50';

export function Dialog({
  open,
  onClose,
  labelledBy,
  label,
  dismissOnBackdrop = true,
  className = '',
  'data-testid': testId,
  children,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      // jsdom ne connaît pas showModal : on retombe sur l'attribut `open`.
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    } else if (!open && el.open) {
      if (typeof el.close === 'function') el.close();
      else el.removeAttribute('open');
    }
  }, [open]);

  // Échap : le navigateur émet `cancel` puis `close` ; jsdom n'émet rien, on
  // écoute aussi la touche pour que le comportement soit le même en test.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onClose();
  };

  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    // Un clic sur le `<dialog>` lui-même (pas sur son contenu) = arrière-plan.
    if (dismissOnBackdrop && event.target === event.currentTarget) onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onDocKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onDocKey);
    return () => document.removeEventListener('keydown', onDocKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-label={label}
      aria-modal="true"
      onCancel={handleCancel}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      className={`${PANEL_BASE} ${className}`}
      data-testid={testId}
    >
      {children}
    </dialog>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Sous-titre (ex. le nom de l'élément visé). */
  subject?: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** Action destructrice : bouton rouge. */
  danger?: boolean;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  'data-testid'?: string;
  confirmTestId?: string;
}

let confirmIds = 0;

/** Confirmation à deux boutons ; le focus arrive sur « Annuler », jamais sur l'action irréversible. */
export function ConfirmDialog({
  open,
  title,
  subject,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  busy = false,
  error,
  onConfirm,
  onCancel,
  'data-testid': testId,
  confirmTestId,
}: ConfirmDialogProps) {
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) idRef.current = `confirm-dialog-${++confirmIds}`;
  const titleId = `${idRef.current}-title`;
  const descId = `${idRef.current}-desc`;

  return (
    <Dialog
      open={open}
      onClose={busy ? () => {} : onCancel}
      labelledBy={titleId}
      dismissOnBackdrop={!busy}
      data-testid={testId}
    >
      <div className="p-6">
        <h2 id={titleId} className={`font-display text-h6 mb-1 ${danger ? 'text-danger' : 'text-ink'}`}>
          {title}
        </h2>
        {subject && <p className="text-caption text-ink-80 mb-1 font-semibold">{subject}</p>}
        {description && (
          <div id={descId} className="text-caption text-ink-60 mb-4">
            {description}
          </div>
        )}
        {error && (
          <p className="text-caption text-danger mb-3" role="alert">
            {error}
          </p>
        )}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            autoFocus
            className="min-h-11 px-4 text-caption font-medium text-ink-80 bg-paper-soft rounded-md hover:bg-paper-deep disabled:opacity-50 transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            aria-describedby={description ? descId : undefined}
            data-testid={confirmTestId}
            className={`min-h-11 px-4 text-caption font-medium rounded-md hover:opacity-90 disabled:opacity-50 transition ${
              danger ? 'text-paper bg-danger' : 'text-paper bg-ink'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
