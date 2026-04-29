'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  AMBIANCE_CATEGORIES,
  getAmbiancesByCategory,
  getAmbianceUrl,
  type AmbianceCategory,
  type AmbianceSound,
} from '@/lib/studio/ambiance-catalog';
import { useGuideAmbianceStore, type CustomAmbianceSound } from '@/lib/stores/guide-ambiance-store';
import { getPlayableUrl } from '@/lib/studio/studio-upload-service';
import { AmbianceUploadModal } from './ambiance-upload-modal';

interface AmbiancePickerProps {
  guideId: string;
  onSelect: (sound: AmbianceSound) => void;
  onClose: () => void;
}

/** Convert a CustomAmbianceSound into the shape expected by the mixer. */
function customToAmbianceSound(c: CustomAmbianceSound): AmbianceSound {
  return {
    id: c.id,
    label: c.title,
    icon: c.icon || '🎵',
    category: c.category,
    file: c.s3Key, // we use s3Key here; resolveUrl differentiates
    durationSec: c.durationSec,
  };
}

export function AmbiancePicker({ guideId, onSelect, onClose }: AmbiancePickerProps) {
  const [tab, setTab] = useState<'standard' | 'mine'>('standard');
  const [category, setCategory] = useState<AmbianceCategory>('water');
  const [showUpload, setShowUpload] = useState(false);

  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  // Select the raw stable array reference, then filter via useMemo to avoid Zustand getSnapshot loop
  const allSounds = useGuideAmbianceStore((s) => s.sounds);
  const removeSound = useGuideAmbianceStore((s) => s.removeSound);
  const renameSound = useGuideAmbianceStore((s) => s.renameSound);

  const mySounds = useMemo(() => allSounds.filter((s) => s.guideId === guideId), [allSounds, guideId]);

  const standardSounds = useMemo(() => getAmbiancesByCategory(category), [category]);
  const filteredMine = useMemo(
    () => (tab === 'mine' ? mySounds.filter((s) => s.category === category) : mySounds),
    [mySounds, category, tab],
  );

  // Auto-switch to "mine" tab when custom sounds exist and user arrives
  useEffect(() => {
    if (mySounds.length > 0 && tab === 'standard') {
      // keep on standard by default, user can switch
    }
  }, [mySounds.length, tab]);

  const resolveAudioUrl = async (sound: AmbianceSound | CustomAmbianceSound): Promise<string> => {
    // Custom sounds have s3Key stored in `file`; standard sounds have relative path
    const file = 'file' in sound ? sound.file : sound.s3Key;
    if (file.startsWith('guide-studio/')) {
      return getPlayableUrl(file);
    }
    return `/sounds/ambiance/${file}`;
  };

  const handlePreview = useCallback(async (sound: AmbianceSound | CustomAmbianceSound) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }
    if (previewingId === sound.id) {
      setPreviewingId(null);
      previewAudioRef.current = null;
      return;
    }
    try {
      const url = await resolveAudioUrl(sound);
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0.5;
      await audio.play();
      audio.onended = () => setPreviewingId(null);
      previewAudioRef.current = audio;
      setPreviewingId(sound.id);
    } catch { /* playback blocked */ }
  }, [previewingId]);

  const handleSelectStandard = useCallback((sound: AmbianceSound) => {
    if (previewAudioRef.current) previewAudioRef.current.pause();
    onSelect(sound);
  }, [onSelect]);

  const handleSelectCustom = useCallback((sound: CustomAmbianceSound) => {
    if (previewAudioRef.current) previewAudioRef.current.pause();
    onSelect(customToAmbianceSound(sound));
  }, [onSelect]);

  const handleClose = useCallback(() => {
    if (previewAudioRef.current) previewAudioRef.current.pause();
    onClose();
  }, [onClose]);

  const handleRename = (id: string, currentTitle: string) => {
    const newTitle = prompt('Nouveau titre :', currentTitle);
    if (newTitle && newTitle.trim()) renameSound(id, newTitle.trim().slice(0, 80));
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce son de votre banque ?')) {
      if (previewingId === id) previewAudioRef.current?.pause();
      removeSound(id);
    }
  };

  return (
    <>
      <div className="bg-white border-2 border-mer-soft rounded-lg shadow-lg p-4 space-y-3 max-w-lg" data-testid="ambiance-picker">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-ink">Choisir une ambiance</h3>
          <button onClick={handleClose} className="text-ink-40 hover:text-ink-80 text-lg">X</button>
        </div>

        {/* Tabs : Standard / Mine */}
        <div className="flex gap-1 border-b border-line">
          <button
            onClick={() => setTab('standard')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition ${
              tab === 'standard' ? 'border-mer text-mer' : 'border-transparent text-ink-60 hover:text-ink-80'
            }`}
          >
            Bibliotheque standard
          </button>
          <button
            onClick={() => setTab('mine')}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition ${
              tab === 'mine' ? 'border-mer text-mer' : 'border-transparent text-ink-60 hover:text-ink-80'
            }`}
          >
            🎤 Ma banque {mySounds.length > 0 && `(${mySounds.length})`}
          </button>
          <span className="flex-1" />
          <button
            onClick={() => setShowUpload(true)}
            className="px-3 py-1 text-xs font-medium text-mer hover:opacity-80"
          >
            + Ajouter un son
          </button>
        </div>

        {/* Category filters */}
        <div className="flex gap-1 flex-wrap">
          {AMBIANCE_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                category === cat.key
                  ? 'bg-mer text-white'
                  : 'bg-paper-soft text-ink-80 hover:bg-paper-deep'
              }`}
              data-testid={`ambiance-cat-${cat.key}`}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>

        {/* Sounds grid */}
        {tab === 'standard' && (
          <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
            {standardSounds.map((sound) => (
              <div
                key={sound.id}
                className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                  previewingId === sound.id
                    ? 'border-mer bg-mer-soft'
                    : 'border-line hover:border-line hover:bg-paper-soft'
                }`}
                data-testid={`ambiance-sound-${sound.id}`}
              >
                <button
                  onClick={() => handlePreview(sound)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 transition ${
                    previewingId === sound.id
                      ? 'bg-mer text-white animate-pulse'
                      : 'bg-paper-soft text-ink-80 hover:bg-paper-deep'
                  }`}
                >
                  {previewingId === sound.id ? '||' : '\u25B6'}
                </button>
                <button
                  onClick={() => handleSelectStandard(sound)}
                  className="flex-1 min-w-0 text-left"
                >
                  <p className="text-xs font-medium text-ink truncate">{sound.icon} {sound.label}</p>
                  <p className="text-[10px] text-ink-40">{sound.durationSec}s loop</p>
                </button>
              </div>
            ))}
          </div>
        )}

        {tab === 'mine' && (
          <>
            {mySounds.length === 0 ? (
              <div className="text-center py-6 text-ink-60 text-xs">
                <p className="mb-3">Aucun son dans votre banque.</p>
                <button
                  onClick={() => setShowUpload(true)}
                  className="px-4 py-2 bg-mer text-white rounded-lg hover:opacity-90 text-sm font-medium"
                >
                  + Ajouter mon premier son
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredMine.map((sound) => {
                  const cat = AMBIANCE_CATEGORIES.find((c) => c.key === sound.category);
                  const isPlaying = previewingId === sound.id;
                  return (
                    <div
                      key={sound.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        isPlaying
                          ? 'border-mer bg-mer-soft shadow-sm'
                          : 'border-line hover:border-mer-soft hover:bg-paper-soft'
                      }`}
                      data-testid={`custom-ambiance-${sound.id}`}
                    >
                      {/* Play button */}
                      <button
                        onClick={() => handlePreview(sound)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm flex-shrink-0 transition ${
                          isPlaying
                            ? 'bg-mer text-white animate-pulse'
                            : 'bg-mer-soft text-mer hover:opacity-90'
                        }`}
                        title={isPlaying ? 'Stopper la preview' : 'Ecouter la preview'}
                      >
                        {isPlaying ? '⏸' : '▶'}
                      </button>

                      {/* Info — clickable to select */}
                      <button
                        onClick={() => handleSelectCustom(sound)}
                        className="flex-1 min-w-0 text-left"
                        title="Selectionner ce son pour la scene"
                      >
                        {/* Title row */}
                        <div className="flex items-center gap-2">
                          <span className="text-base">{sound.icon || '🎵'}</span>
                          <span className="text-sm font-semibold text-ink truncate">
                            {sound.title || '(sans titre)'}
                          </span>
                        </div>
                        {/* Description */}
                        {sound.description && (
                          <p className="text-xs text-ink-60 mt-0.5 line-clamp-2">{sound.description}</p>
                        )}
                        {/* Meta badges */}
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-paper-soft text-ink-80">
                            ⏱ {sound.durationSec}s
                          </span>
                          {cat && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-mer-soft text-mer">
                              {cat.icon} {cat.label}
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Actions */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => handleRename(sound.id, sound.title)}
                          className="text-ink-40 hover:text-mer p-1 text-xs"
                          title="Renommer"
                        >
                          ✏
                        </button>
                        <button
                          onClick={() => handleDelete(sound.id)}
                          className="text-ink-40 hover:text-danger p-1 text-xs"
                          title="Supprimer"
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {showUpload && (
        <AmbianceUploadModal
          guideId={guideId}
          onClose={() => setShowUpload(false)}
          onAdded={() => setTab('mine')}
        />
      )}
    </>
  );
}
