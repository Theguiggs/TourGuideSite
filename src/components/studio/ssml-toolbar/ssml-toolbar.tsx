'use client';

import { useState, useCallback } from 'react';

interface SSMLToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
}

interface PauseOption {
  label: string;
  value: string;
}

const PAUSE_PRESETS: PauseOption[] = [
  { label: '0.5s', value: '500ms' },
  { label: '1s', value: '1s' },
  { label: '2s', value: '2s' },
  { label: '3s', value: '3s' },
];

// Décision audio 2026-05-18 :
// Les autres effets SSML (prosody / emphasis / say-as) sonnent mal sur edge-tts
// gratuit (rendu saccadé/robotique). On les a désactivés de la toolbar en
// attendant éventuellement un switch vers Azure Neural payant.
// La constante TOOL_BUTTONS + les helpers wrapSelection / handleToolClick ont
// été retirés. Les pauses (`<break>`) restent — elles sont fiables sur edge-tts.

export function SSMLToolbar({ textareaRef, value, onChange }: SSMLToolbarProps) {
  const [showPauseInput, setShowPauseInput] = useState(false);
  const [customPause, setCustomPause] = useState('1.5');

  const insertAtCursor = useCallback((insertion: string) => {
    const el = textareaRef.current;
    const scrollTop = el?.scrollTop ?? 0;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? 0;
    const newValue = value.substring(0, start) + insertion + value.substring(end);
    onChange(newValue);
    // Restore cursor + scroll position after the re-render
    requestAnimationFrame(() => {
      const cur = textareaRef.current;
      if (!cur) return;
      const pos = start + insertion.length;
      cur.focus();
      cur.setSelectionRange(pos, pos);
      cur.scrollTop = scrollTop;
    });
  }, [value, onChange, textareaRef]);

  const handlePauseInsert = useCallback((duration: string) => {
    insertAtCursor(` <break time="${duration}"/> `);
    setShowPauseInput(false);
  }, [insertAtCursor]);

  const handleCustomPause = useCallback(() => {
    const seconds = parseFloat(customPause);
    if (isNaN(seconds) || seconds <= 0 || seconds > 10) return;
    const duration = seconds >= 1 ? `${seconds}s` : `${Math.round(seconds * 1000)}ms`;
    handlePauseInsert(duration);
  }, [customPause, handlePauseInsert]);

  return (
    <div className="space-y-1" data-testid="ssml-toolbar">
      {/* Main toolbar — pauses only */}
      <div className="flex items-center gap-1 flex-wrap p-1.5 bg-paper-soft rounded-lg border border-line">
        <div className="flex items-center gap-0.5">
          <span className="text-xs text-ink-40 mr-0.5">Pause :</span>
          {PAUSE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePauseInsert(p.value)}
              className="px-1.5 py-0.5 text-[10px] font-medium bg-ocre-soft text-ocre hover:opacity-90 rounded transition"
              title={`Insérer une pause de ${p.label}`}
              data-testid={`ssml-pause-${p.value}`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setShowPauseInput(!showPauseInput)}
            className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition ${
              showPauseInput ? 'bg-ocre text-white' : 'bg-ocre-soft text-ocre hover:opacity-90'
            }`}
            title="Pause personnalisée"
            data-testid="ssml-pause-custom-toggle"
          >
            …
          </button>
        </div>
      </div>

      {/* Custom pause input */}
      {showPauseInput && (
        <div className="flex items-center gap-2 p-2 bg-ocre-soft border border-ocre-soft rounded-lg">
          <span className="text-xs text-ocre">Pause de</span>
          <input
            type="number"
            min={0.1}
            max={10}
            step={0.1}
            value={customPause}
            onChange={(e) => setCustomPause(e.target.value)}
            className="w-16 px-2 py-0.5 text-xs border border-ocre-soft rounded text-center focus:outline-none focus:ring-1 focus:ring-ocre"
            data-testid="custom-pause-input"
          />
          <span className="text-xs text-ocre">secondes (0,1 à 10)</span>
          <button
            onClick={handleCustomPause}
            className="px-2 py-0.5 text-xs font-medium bg-ocre text-white rounded hover:opacity-90 transition"
            data-testid="custom-pause-insert"
          >
            Insérer
          </button>
        </div>
      )}

      {/* Help text */}
      <p className="text-[10px] text-ink-40 px-1">
        Clic sur une durée = insertion d&apos;une pause au curseur. Les autres effets (prosody / emphasis) sont désactivés — ils sonnent trop saccadés sur edge-tts.
      </p>
    </div>
  );
}
