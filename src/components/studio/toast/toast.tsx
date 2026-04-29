'use client';

import { useTranscriptionStore, selectToastMessage } from '@/lib/stores/transcription-store';

export function StudioToast() {
  const message = useTranscriptionStore(selectToastMessage);

  if (!message) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-40 bg-grenadine text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3"
      role="status"
      aria-live="polite"
      data-testid="studio-toast"
    >
      <span className="text-sm">{message}</span>
      <button
        onClick={() => useTranscriptionStore.getState().clearToast()}
        className="text-grenadine hover:text-white text-lg leading-none"
        aria-label="Fermer"
      >
        &times;
      </button>
    </div>
  );
}
