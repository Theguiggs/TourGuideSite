'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStudioConsentStore, selectHasConsented, selectAcceptConsent } from '@/lib/stores/studio-consent-store';

export function RgpdConsentBanner() {
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
          Consentement RGPD — Audio Studio
        </h2>

        <div className="text-sm text-ink-80 space-y-3 mb-6">
          <p>
            En utilisant le Studio Audio, vous autorisez TourGuide a :
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Stocker vos enregistrements audio sur nos serveurs securises (AWS S3)</li>
            <li>Transcrire automatiquement vos audio via AWS Transcribe</li>
            <li>Conserver vos textes et metadonnees pour la publication de vos tours</li>
          </ul>
          <p>
            Vos donnees vocales ne sont transmises a aucun tiers en dehors d&apos;AWS Transcribe.
            Vous pouvez supprimer vos tours et toutes les donnees associees a tout moment.
          </p>
          <p className="text-xs text-ink-60">
            En cliquant &quot;Accepter&quot;, vous consentez au traitement de vos donnees vocales
            conformement a notre politique de confidentialite.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            ref={acceptBtnRef}
            onClick={acceptConsent}
            className="flex-1 bg-grenadine hover:opacity-90 text-white font-medium py-2.5 px-4 rounded-lg transition"
            data-testid="rgpd-accept"
          >
            Accepter
          </button>
          <a
            href="/guide/dashboard"
            className="flex-1 text-center border border-line text-ink-80 hover:bg-paper-soft font-medium py-2.5 px-4 rounded-lg transition"
            data-testid="rgpd-decline"
          >
            Refuser
          </a>
        </div>
      </div>
    </div>
  );
}
