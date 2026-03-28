'use client';

import { useState, useCallback } from 'react';
import {
  AMBIANCE_CATEGORIES,
  AMBIANCE_SOUNDS,
  getAmbiancesByCategory,
  getAmbianceUrl,
  type AmbianceCategory,
  type AmbianceSound,
} from '@/lib/studio/ambiance-catalog';

interface AmbiancePickerProps {
  onSelect: (sound: AmbianceSound) => void;
  onClose: () => void;
}

export function AmbiancePicker({ onSelect, onClose }: AmbiancePickerProps) {
  const [category, setCategory] = useState<AmbianceCategory>('water');
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const sounds = getAmbiancesByCategory(category);

  const handlePreview = useCallback((sound: AmbianceSound) => {
    // Stop current preview
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }

    if (previewingId === sound.id) {
      setPreviewingId(null);
      setPreviewAudio(null);
      return;
    }

    const audio = new Audio(getAmbianceUrl(sound));
    audio.loop = true;
    audio.volume = 0.5;
    audio.play();
    audio.onended = () => setPreviewingId(null);
    setPreviewAudio(audio);
    setPreviewingId(sound.id);
  }, [previewAudio, previewingId]);

  const handleSelect = useCallback((sound: AmbianceSound) => {
    if (previewAudio) {
      previewAudio.pause();
    }
    onSelect(sound);
  }, [previewAudio, onSelect]);

  const handleClose = useCallback(() => {
    if (previewAudio) {
      previewAudio.pause();
    }
    onClose();
  }, [previewAudio, onClose]);

  return (
    <div className="bg-white border-2 border-indigo-200 rounded-lg shadow-lg p-4 space-y-3" data-testid="ambiance-picker">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Choisir une ambiance</h3>
        <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-lg">X</button>
      </div>

      {/* Categories */}
      <div className="flex gap-1 flex-wrap">
        {AMBIANCE_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              category === cat.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            data-testid={`ambiance-cat-${cat.key}`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Sounds grid */}
      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
        {sounds.map((sound) => (
          <div
            key={sound.id}
            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
              previewingId === sound.id
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            data-testid={`ambiance-sound-${sound.id}`}
          >
            <button
              onClick={() => handlePreview(sound)}
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition-colors ${
                previewingId === sound.id
                  ? 'bg-indigo-600 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {previewingId === sound.id ? '||' : '\u25B6'}
            </button>
            <div className="flex-1 min-w-0" onClick={() => handleSelect(sound)}>
              <p className="text-xs font-medium text-gray-800 truncate">{sound.icon} {sound.label}</p>
              <p className="text-[10px] text-gray-400">{sound.durationSec}s loop</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
