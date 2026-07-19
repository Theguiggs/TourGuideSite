'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStudioConsentStore, selectHasConsented, selectAcceptConsent } from '@/lib/stores/studio-consent-store';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

export function RgpdConsentBanner() {
  const { locale } = useStudioLocale();
  const hasConsented = useStudioConsentStore(selectHasConsented);
  const acceptConsent = useStudioConsentStore(selectAcceptConsent);
  const dialogRef = useRef<HTMLDivElement>(null);
  const acceptBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus the accept button on mount
  useEffect(() => {
    if (!hasConsented) {
      acceptBtnRef.current?.focus();
    }
  }, [hasConsented]);

  // Focus trap: keep Tab/Shift+Tab within the dialog
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusableEls = dialog.querySelectorAll<HTMLElement>(
      'button, a[href], [tabindex]:not([tabindex="-1"])'
    );
    if (focusableEls.length === 0) return;

    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      }
    } else {
      if (document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }
  }, []);

  if (hasConsented) return null;

  const copy = locale === 'en' ? {
    title: 'Privacy consent - Audio Studio', intro: 'By using the Audio Studio, you allow Murmure to:',
    audio: 'Store your audio recordings on our secure servers (AWS S3)', transcription: 'Automatically transcribe your audio with AWS Transcribe',
    metadata: 'Store your text and metadata to publish your tours', privacy: 'Your voice data is not shared with third parties outside AWS Transcribe. You can delete your tours and all associated data at any time.',
    legal: 'By selecting “Accept”, you consent to the processing of your voice data under our privacy policy.', accept: 'Accept', decline: 'Decline',
  } : {
    title: 'Consentement RGPD - Studio audio', intro: 'En utilisant le Studio audio, vous autorisez Murmure à :',
    audio: 'Stocker vos enregistrements audio sur nos serveurs sécurisés (AWS S3)', transcription: 'Transcrire automatiquement vos fichiers audio avec AWS Transcribe',
    metadata: 'Conserver vos textes et métadonnées pour publier vos visites', privacy: 'Vos données vocales ne sont transmises à aucun tiers en dehors d’AWS Transcribe. Vous pouvez supprimer vos visites et toutes les données associées à tout moment.',
    legal: 'En sélectionnant « Accepter », vous consentez au traitement de vos données vocales conformément à notre politique de confidentialité.', accept: 'Accepter', decline: 'Refuser',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rgpd-title"
      onKeyDown={handleKeyDown}
      ref={dialogRef}
    >
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6">
        <h2 id="rgpd-title" className="text-xl font-bold text-ink mb-4">
          {copy.title}
        </h2>

        <div className="text-sm text-ink-80 space-y-3 mb-6">
          <p>
            {copy.intro}
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>{copy.audio}</li>
            <li>{copy.transcription}</li>
            <li>{copy.metadata}</li>
          </ul>
          <p>
            {copy.privacy}
          </p>
          <p className="text-xs text-ink-60">
            {copy.legal}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            ref={acceptBtnRef}
            onClick={acceptConsent}
            className="flex-1 bg-grenadine hover:opacity-90 text-white font-medium py-2.5 px-4 rounded-lg transition"
            data-testid="rgpd-accept"
          >
            {copy.accept}
          </button>
          <a
            href={locale === 'en' ? '/en/catalogue' : '/catalogue'}
            className="flex-1 text-center border border-line text-ink-80 hover:bg-paper-soft font-medium py-2.5 px-4 rounded-lg transition"
            data-testid="rgpd-decline"
          >
            {copy.decline}
          </a>
        </div>
      </div>
    </div>
  );
}
