'use client';

import { useState, type KeyboardEvent } from 'react';
import { dedupeChips } from '@/lib/studio/profile-helpers';

interface SpecialtyChipsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  /** Max number of chips. Once reached, the input is disabled. */
  max?: number;
  /** Max length per chip (chars). */
  maxLength?: number;
  placeholder?: string;
  /** Called when validation fails (max or duplicate). Optional. */
  onError?: (message: string) => void;
}

/**
 * <SpecialtyChipsInput> — input chips ocre pour les spécialités du profil.
 * Type un texte + Enter ou virgule → ajoute. Bouton ✕ sur chaque chip.
 */
export function SpecialtyChipsInput({
  value,
  onChange,
  max = 8,
  maxLength = 30,
  placeholder = 'Ajouter…',
  onError,
}: SpecialtyChipsInputProps) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (trimmed.length > maxLength) {
      onError?.(`${maxLength} caractères max par spécialité.`);
      return;
    }
    const next = dedupeChips([...value, trimmed]);
    if (next.length === value.length) {
      onError?.('Cette spécialité existe déjà.');
      return;
    }
    if (next.length > max) {
      onError?.(`${max} spécialités max.`);
      return;
    }
    onChange(next);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      // Remove last chip on Backspace when input is empty
      onChange(value.slice(0, -1));
    }
  };

  const remove = (chip: string) => {
    onChange(value.filter((v) => v !== chip));
  };

  const isFull = value.length >= max;

  return (
    <div
      className="px-3 py-2.5 border border-line rounded-md bg-paper flex flex-wrap gap-1.5 items-center min-h-[44px] focus-within:border-grenadine transition"
      data-testid="specialty-chips-input"
    >
      {value.map((s) => (
        <span
          key={s}
          data-testid={`specialty-chip-${s}`}
          className="bg-ocre-soft text-ocre px-2.5 py-1 rounded-pill text-meta font-semibold inline-flex items-center gap-1.5"
        >
          {s}
          <button
            type="button"
            onClick={() => remove(s)}
            aria-label={`Retirer ${s}`}
            className="opacity-60 hover:opacity-100 text-meta cursor-pointer"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => commit(draft)}
        placeholder={isFull ? '' : placeholder}
        disabled={isFull}
        maxLength={maxLength}
        data-testid="specialty-chips-input-field"
        className="flex-1 min-w-[100px] border-none outline-none text-meta bg-transparent placeholder:text-ink-40 disabled:cursor-not-allowed"
      />
    </div>
  );
}
