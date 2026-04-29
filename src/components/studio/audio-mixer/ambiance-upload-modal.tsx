'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useGuideAmbianceStore } from '@/lib/stores/guide-ambiance-store';
import { uploadCustomAmbiance, getPlayableUrl } from '@/lib/studio/studio-upload-service';
import { AMBIANCE_CATEGORIES, type AmbianceCategory } from '@/lib/studio/ambiance-catalog';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'AmbianceUploadModal';

interface AmbianceUploadModalProps {
  guideId: string;
  onClose: () => void;
  onAdded?: () => void;
}

type Mode = 'record' | 'upload';

export function AmbianceUploadModal({ guideId, onClose, onAdded }: AmbianceUploadModalProps) {
  const [mode, setMode] = useState<Mode>('upload');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<AmbianceCategory>('city');
  const [icon, setIcon] = useState('🎵');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [durationSec, setDurationSec] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Upload/save state
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Preview audio element
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetMedia = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setBlob(null);
    setPreviewUrl(null);
    setDurationSec(0);
    setIsPlaying(false);
  };

  // --- Recording ---

  const startRecording = useCallback(async () => {
    setError(null);
    resetMedia();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setBlob(recordedBlob);
        const url = URL.createObjectURL(recordedBlob);
        setPreviewUrl(url);
        // Duration detected on audio load
        const audio = new Audio(url);
        audio.onloadedmetadata = () => {
          // On Chrome, WebM duration may be Infinity until sought. Use recordingTime as fallback.
          const d = isFinite(audio.duration) ? audio.duration : recordingTime;
          setDurationSec(Math.round(d));
        };
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (e) {
      setError('Impossible d\'acceder au microphone. Autorisez l\'acces.');
      logger.error(SERVICE_NAME, 'getUserMedia failed', { error: String(e) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
  }, [isRecording]);

  // --- Upload ---

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError('Fichier trop volumineux (max 50 MB).');
      return;
    }
    resetMedia();
    setBlob(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setDurationSec(Math.round(audio.duration));
    };
    // Auto-suggest title from filename
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').slice(0, 60));
    }
  }, [title]);

  // --- Preview ---

  const togglePreview = () => {
    if (!previewUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(previewUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // --- Save ---

  const addSound = useGuideAmbianceStore((s) => s.addSound);

  const handleSave = useCallback(async () => {
    if (!blob || !title.trim()) {
      setError('Ajoutez un fichier et un titre.');
      return;
    }
    setIsSaving(true);
    setError(null);

    const soundId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const result = await uploadCustomAmbiance(blob, guideId, soundId);
    if (!result.ok) {
      setError(result.error);
      setIsSaving(false);
      return;
    }

    addSound({
      id: soundId,
      guideId,
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      icon,
      s3Key: result.s3Key,
      durationSec: durationSec || 10,
      createdAt: new Date().toISOString(),
    });

    // Warm the URL cache so playback is instant
    try { await getPlayableUrl(result.s3Key); } catch { /* non-blocking */ }

    setIsSaving(false);
    onAdded?.();
    onClose();
  }, [blob, title, description, category, icon, durationSec, guideId, addSound, onClose, onAdded]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Ajouter un son d&apos;ambiance</h2>
          <button onClick={onClose} className="text-ink-40 hover:text-ink-80 text-xl">×</button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('upload'); resetMedia(); setError(null); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              mode === 'upload' ? 'bg-mer text-white' : 'bg-paper-soft text-ink-80 hover:bg-paper-deep'
            }`}
          >
            📁 Uploader
          </button>
          <button
            onClick={() => { setMode('record'); resetMedia(); setError(null); }}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
              mode === 'record' ? 'bg-mer text-white' : 'bg-paper-soft text-ink-80 hover:bg-paper-deep'
            }`}
          >
            🎤 Enregistrer
          </button>
        </div>

        {/* Upload mode */}
        {mode === 'upload' && (
          <div>
            <label className="block text-xs font-medium text-ink-80 mb-1">
              Choisir un fichier audio (mp3, m4a, wav, ogg, webm · max 50 MB)
            </label>
            <input
              type="file"
              accept="audio/*,video/webm"
              onChange={handleFileSelect}
              className="block w-full text-sm text-ink-80 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-mer-soft file:text-mer file:font-medium hover:file:bg-mer-soft"
            />
            <p className="text-[10px] text-ink-40 mt-1">
              Astuce mobile : enregistrez avec Dictaphone / Voice Memos puis uploadez depuis votre telephone.
            </p>
          </div>
        )}

        {/* Record mode */}
        {mode === 'record' && (
          <div className="space-y-2">
            {!blob && !isRecording && (
              <button
                onClick={startRecording}
                className="w-full py-4 bg-grenadine-soft hover:opacity-90 border-2 border-grenadine-soft rounded-lg text-danger font-medium transition"
              >
                🎤 Demarrer l&apos;enregistrement
              </button>
            )}
            {isRecording && (
              <div className="space-y-2">
                <div className="p-4 bg-grenadine-soft border-2 border-grenadine-soft rounded-lg text-center">
                  <div className="text-2xl animate-pulse">🔴</div>
                  <p className="text-sm font-medium text-danger mt-1">Enregistrement... {recordingTime}s</p>
                </div>
                <button
                  onClick={stopRecording}
                  className="w-full py-3 bg-ink-80 hover:bg-ink text-white rounded-lg font-medium"
                >
                  ⏹ Arreter
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preview + metadata (shared) */}
        {previewUrl && (
          <div className="space-y-3 pt-2 border-t border-line">
            <div className="flex items-center gap-2 p-2 bg-paper-soft rounded-lg">
              <button
                onClick={togglePreview}
                className="w-10 h-10 rounded-full bg-mer text-white flex items-center justify-center hover:opacity-90"
              >
                {isPlaying ? '||' : '▶'}
              </button>
              <div className="flex-1">
                <p className="text-xs text-ink-80">Preview · {durationSec || '?'}s</p>
              </div>
              <button onClick={resetMedia} className="text-ink-40 hover:text-danger text-sm">Effacer</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-ink mb-1">
                Titre <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Fontaine place aux Aires"
                maxLength={80}
                required
                className="w-full px-3 py-2 border-2 border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mer focus:border-mer"
              />
              <p className="text-[10px] text-ink-40 mt-0.5">{title.length}/80 — donnez un nom court et reconnaissable</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-ink-80 mb-1">
                Description <span className="text-ink-40">(optionnel)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Enregistre le 12 avril, marche du samedi matin"
                maxLength={200}
                rows={2}
                className="w-full px-3 py-1.5 border border-line rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-mer"
              />
              <p className="text-[10px] text-ink-40 mt-0.5">{description.length}/200</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-ink-80 mb-1">Categorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AmbianceCategory)}
                  className="w-full px-2 py-1.5 border border-line rounded-lg text-sm"
                >
                  {AMBIANCE_CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>{c.icon} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-80 mb-1">Icone</label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value.slice(0, 2))}
                  maxLength={2}
                  className="w-full px-3 py-1.5 border border-line rounded-lg text-sm text-center"
                  placeholder="🎵"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-danger bg-grenadine-soft p-2 rounded">{error}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-paper-soft text-ink-80 rounded-lg font-medium hover:bg-paper-deep"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!blob || !title.trim() || isSaving}
            className="flex-1 py-2 bg-mer text-white rounded-lg font-medium hover:opacity-90 disabled:bg-paper-deep"
          >
            {isSaving ? 'Sauvegarde...' : 'Ajouter a ma banque'}
          </button>
        </div>
      </div>
    </div>
  );
}
