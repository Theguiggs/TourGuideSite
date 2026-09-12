'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStudioConsentStore, selectHasConsented, selectAcceptConsent, CONSENT_VERSION } from '@/lib/stores/studio-consent-store';
import { useOptionalAuth } from '@/lib/auth/auth-context';
import { updateGuideProfileMutation } from '@/lib/api/appsync-client';
import { shouldUseStubs } from '@/config/api-mode';
import { logger } from '@/lib/logger';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

export function RgpdConsentBanner() {
  const { locale } = useStudioLocale();
  const hasConsented = useStudioConsentStore(selectHasConsented);
  const acceptConsent = useStudioConsentStore(selectAcceptConsent);
  const auth = useOptionalAuth();
  const guideId = auth?.user?.guideId ?? null;

  // Accepter = local tout de suite, profil au mieux (un autre navigateur le retrouvera).
  const handleAccept = () => {
    acceptConsent();
    if (guideId && !shouldUseStubs()) {
      updateGuideProfileMutation(guideId, { rgpdConsentVersion: CONSENT_VERSION, rgpdConsentAt: new Date().toISOString() })
        .then((r) => { if (!r.ok) logger.warn('RgpdConsentBanner', 'Consent not written to profile', { error: r.error }); })
        .catch((e: unknown) => logger.warn('RgpdConsentBanner', 'Consent write failed', { error: String(e) }));
    }
  };
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

  // Sous-traitants RÉELS du Studio (lot 6.2) : le texte ne citait qu'AWS.
  const copy = locale === 'en' ? {
    title: 'Privacy consent - Audio Studio', intro: 'By using the Audio Studio, you allow Murmure to:',
    audio: 'Store your audio recordings and photos on our servers (Amazon Web Services, EU region)', transcription: 'Transcribe your audio automatically (Amazon Transcribe)',
    tts: 'Produce synthetic voices from your texts (Microsoft Azure Speech)', translation: 'Translate your texts (DeepL, Anthropic)',
    payment: 'Process language purchases through Stripe (no voice data is sent to Stripe)',
    metadata: 'Store your text and metadata to publish your tours', privacy: 'Your voice data is shared only with the providers listed above, for these purposes. You can delete your tours and all associated data at any time.',
    legal: `By selecting “Accept”, you consent to this processing under our privacy policy (text version ${CONSENT_VERSION}).`, accept: 'Accept', decline: 'Decline',
  } : {
    title: 'Consentement RGPD - Studio audio', intro: 'En utilisant le Studio audio, vous autorisez Murmure à :',
    audio: 'Stocker vos enregistrements audio et vos photos sur nos serveurs (Amazon Web Services, région UE)', transcription: 'Transcrire automatiquement vos fichiers audio (Amazon Transcribe)',
    tts: 'Produire des voix de synthèse à partir de vos textes (Microsoft Azure Speech)', translation: 'Traduire vos textes (DeepL, Anthropic)',
    payment: 'Encaisser les achats de langues via Stripe (aucune donnée vocale ne lui est transmise)',
    metadata: 'Conserver vos textes et métadonnées pour publier vos visites', privacy: 'Vos données vocales ne sont transmises qu’aux prestataires cités ci-dessus, pour ces seules finalités. Vous pouvez supprimer vos visites et toutes les données associées à tout moment.',
    legal: `En sélectionnant « Accepter », vous consentez à ces traitements conformément à notre politique de confidentialité (texte version ${CONSENT_VERSION}).`, accept: 'Accepter', decline: 'Refuser',
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
      <div className="bg-card rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6">
        <h2 id="rgpd-title" className="text-h5 font-bold text-ink mb-4">
          {copy.title}
        </h2>

        <div className="text-body text-ink-80 space-y-3 mb-6">
          <p>
            {copy.intro}
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>{copy.audio}</li>
            <li>{copy.transcription}</li>
            <li>{copy.tts}</li>
            <li>{copy.translation}</li>
            <li>{copy.payment}</li>
            <li>{copy.metadata}</li>
          </ul>
          <p>
            {copy.privacy}
          </p>
          <p className="text-meta text-ink-60">
            {copy.legal}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            ref={acceptBtnRef}
            onClick={handleAccept}
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
