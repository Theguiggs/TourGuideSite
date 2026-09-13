'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { logger } from '@/lib/logger';
import { describeAuthError, isUnknownUserError } from '@/lib/auth/cognito-errors';
import { PageTitle } from '@murmure/design-system/web';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

const SERVICE_NAME = 'ResetPasswordPage';

export default function ResetPasswordPage() {
  const { t } = useStudioLocale();
  const [step, setStep] = useState<'request' | 'confirm' | 'done'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await resetPassword({ username: email });
      setStep('confirm');
    } catch (err) {
      logger.warn(SERVICE_NAME, 'resetPassword failed', { error: String(err) });
      // Un email inconnu avance comme un email connu : la page ne dit pas
      // quels comptes existent (même politique que la connexion).
      if (isUnknownUserError(err)) { setStep('confirm'); return; }
      setError(describeAuthError(err, 'reset'));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await confirmResetPassword({ username: email, confirmationCode: code, newPassword });
      setStep('done');
    } catch (err) {
      logger.warn(SERVICE_NAME, 'confirmResetPassword failed', { error: String(err) });
      setError(describeAuthError(err, 'reset'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="w-full max-w-sm">
        <PageTitle size="h4" className="mb-2">{t('Réinitialiser le mot de passe', 'Reset your password')}</PageTitle>

        {step === 'request' && (
          <form onSubmit={handleRequest} className="space-y-4">
            <p className="text-body text-ink-60">{t('Entrez votre email pour recevoir un code de réinitialisation.', 'Enter your email to receive a reset code.')}</p>
            <label htmlFor="reset-email" className="block text-body font-semibold text-ink-80 mb-1">Email</label>
            <input
              id="reset-email"
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-grenadine"
            />
            {error && <p className="text-body text-danger" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-grenadine text-white font-bold py-3 rounded-pill hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition text-body"
            >
              {loading ? t('Envoi…', 'Sending…') : t('Envoyer le code', 'Send the code')}
            </button>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <p className="text-body text-ink-60">{t('Un code a été envoyé à ', 'A code has been sent to ')}<strong>{email}</strong>{t('. Entrez-le ci-dessous avec votre nouveau mot de passe.', '. Enter it below with your new password.')}</p>
            <label htmlFor="reset-code" className="block text-body font-semibold text-ink-80 mb-1">{t('Code de vérification', 'Verification code')}</label>
            <input
              id="reset-code"
              type="text"
              required
              placeholder={t('Code de vérification', 'Verification code')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              className="w-full border border-line rounded-lg px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-grenadine"
            />
            <label htmlFor="reset-new-password" className="block text-body font-semibold text-ink-80 mb-1">{t('Nouveau mot de passe', 'New password')}</label>
            <input
              id="reset-new-password"
              type="password"
              required
              placeholder={t('Nouveau mot de passe', 'New password')}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className="w-full border border-line rounded-lg px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-grenadine"
            />
            {error && <p className="text-body text-danger" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-grenadine text-white font-bold py-3 rounded-pill hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition text-body"
            >
              {loading ? t('Réinitialisation…', 'Resetting…') : t('Réinitialiser', 'Reset')}
            </button>
            <button type="button" onClick={() => setStep('request')} className="w-full text-body text-ink-60 hover:text-ink">
              {t('← Recommencer', '← Start over')}
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <p className="text-body text-success font-medium">{t('Mot de passe réinitialisé avec succès.', 'Password reset successfully.')}</p>
            <Link
              href="/guide/login"
              className="block w-full text-center bg-grenadine text-white font-bold py-3 rounded-pill hover:opacity-90 transition text-body"
            >
              {t('Se connecter', 'Sign in')}
            </Link>
          </div>
        )}

        {step !== 'done' && (
          <p className="text-center text-body text-ink-60 mt-6">
            <Link href="/guide/login" className="text-grenadine hover:underline">
              {t('Retour à la connexion', 'Back to sign in')}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
