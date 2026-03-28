'use client';

import { useState, useCallback, useRef } from 'react';

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

interface ToolButton {
  id: string;
  icon: string;
  label: string;
  type: 'insert' | 'wrap';
  tag?: string;
}

const TOOL_BUTTONS: ToolButton[] = [
  { id: 'slow', icon: '🐢', label: 'Lent', type: 'wrap', tag: 'prosody rate="slow"' },
  { id: 'fast', icon: '🐇', label: 'Rapide', type: 'wrap', tag: 'prosody rate="fast"' },
  { id: 'loud', icon: '📢', label: 'Fort', type: 'wrap', tag: 'prosody volume="loud"' },
  { id: 'soft', icon: '🤫', label: 'Doux', type: 'wrap', tag: 'prosody volume="soft"' },
  { id: 'high', icon: '⬆', label: 'Aigu', type: 'wrap', tag: 'prosody pitch="high"' },
  { id: 'low', icon: '⬇', label: 'Grave', type: 'wrap', tag: 'prosody pitch="low"' },
  { id: 'emphasis', icon: '💪', label: 'Emphase', type: 'wrap', tag: 'emphasis level="strong"' },
];

export function SSMLToolbar({ textareaRef, value, onChange }: SSMLToolbarProps) {
  const [showPauseInput, setShowPauseInput] = useState(false);
  const [customPause, setCustomPause] = useState('1.5');

  const getSelection = useCallback((): { start: number; end: number; selected: string } => {
    const el = textareaRef.current;
    if (!el) return { start: 0, end: 0, selected: '' };
    return {
      start: el.selectionStart,
      end: el.selectionEnd,
      selected: value.substring(el.selectionStart, el.selectionEnd),
    };
  }, [textareaRef, value]);

  const insertAtCursor = useCallback((insertion: string) => {
    const { start, end } = getSelection();
    const newValue = value.substring(0, start) + insertion + value.substring(end);
    onChange(newValue);
    // Restore cursor position after insertion
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        const pos = start + insertion.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    }, 0);
  }, [value, onChange, getSelection, textareaRef]);

  const wrapSelection = useCallback((openTag: string) => {
    const { start, end, selected } = getSelection();
    if (!selected) return; // Nothing selected

    // Extract tag name for closing tag (e.g. "prosody rate='slow'" -> "prosody")
    const tagName = openTag.split(' ')[0];
    const wrapped = `<${openTag}>${selected}</${tagName}>`;
    const newValue = value.substring(0, start) + wrapped + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(start, start + wrapped.length);
      }
    }, 0);
  }, [value, onChange, getSelection, textareaRef]);

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

  const handleToolClick = useCallback((tool: ToolButton) => {
    if (tool.type === 'insert' && tool.tag) {
      insertAtCursor(tool.tag);
    } else if (tool.type === 'wrap' && tool.tag) {
      wrapSelection(tool.tag);
    }
  }, [insertAtCursor, wrapSelection]);

  return (
    <div className="space-y-1" data-testid="ssml-toolbar">
      {/* Main toolbar */}
      <div className="flex items-center gap-1 flex-wrap p-1.5 bg-gray-100 rounded-lg border border-gray-200">
        {/* Pause button group */}
        <div className="flex items-center gap-0.5 mr-1">
          <span className="text-xs text-gray-400 mr-0.5">Pause:</span>
          {PAUSE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => handlePauseInsert(p.value)}
              className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 rounded transition-colors"
              title={`Inserer une pause de ${p.label}`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setShowPauseInput(!showPauseInput)}
            className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
              showPauseInput ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
            }`}
            title="Pause personnalisee"
          >
            ...
          </button>
        </div>

        <div className="w-px h-5 bg-gray-300 mx-1" />

        {/* Wrap buttons (need selection) */}
        {TOOL_BUTTONS.map((tool) => (
          <button
            key={tool.id}
            onClick={() => handleToolClick(tool)}
            className="px-1.5 py-0.5 text-[10px] font-medium bg-white text-gray-700 hover:bg-gray-200 rounded border border-gray-200 transition-colors"
            title={`${tool.label} (selectionnez du texte d'abord)`}
            data-testid={`ssml-btn-${tool.id}`}
          >
            {tool.icon} {tool.label}
          </button>
        ))}
      </div>

      {/* Custom pause input */}
      {showPauseInput && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <span className="text-xs text-amber-700">Pause de</span>
          <input
            type="number"
            min={0.1}
            max={10}
            step={0.1}
            value={customPause}
            onChange={(e) => setCustomPause(e.target.value)}
            className="w-16 px-2 py-0.5 text-xs border border-amber-300 rounded text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
            data-testid="custom-pause-input"
          />
          <span className="text-xs text-amber-700">secondes</span>
          <button
            onClick={handleCustomPause}
            className="px-2 py-0.5 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
            data-testid="custom-pause-insert"
          >
            Inserer
          </button>
        </div>
      )}

      {/* Help text */}
      <p className="text-[10px] text-gray-400 px-1">
        Cliquez sur un bouton pause pour inserer. Pour lent/rapide/fort/doux : selectionnez du texte puis cliquez.
      </p>
    </div>
  );
}
