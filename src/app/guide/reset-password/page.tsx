'use client';

import { useState } from 'react';
import Link from 'next/link';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { logger } from '@/lib/logger';

const SERVICE_NAME = 'ResetPasswordPage';

export default function ResetPasswordPage() {
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
      setError('Impossible d\'envoyer le code. Vérifiez votre email et réessayez.');
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
      setError('Code invalide ou mot de passe incorrect. Réessayez.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-ink mb-2">Réinitialiser le mot de passe</h1>

        {step === 'request' && (
          <form onSubmit={handleRequest} className="space-y-4">
            <p className="text-sm text-ink-60">Entrez votre email pour recevoir un code de réinitialisation.</p>
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-grenadine"
            />
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-grenadine text-white font-bold py-3 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
            >
              {loading ? 'Envoi…' : 'Envoyer le code'}
            </button>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={handleConfirm} className="space-y-4">
            <p className="text-sm text-ink-60">Un code a été envoyé à <strong>{email}</strong>. Entrez-le ci-dessous avec votre nouveau mot de passe.</p>
            <input
              type="text"
              required
              placeholder="Code de vérification"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="one-time-code"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-grenadine"
            />
            <input
              type="password"
              required
              placeholder="Nouveau mot de passe"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-grenadine"
            />
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-grenadine text-white font-bold py-3 rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
            >
              {loading ? 'Réinitialisation…' : 'Réinitialiser'}
            </button>
            <button type="button" onClick={() => setStep('request')} className="w-full text-sm text-ink-60 hover:text-ink">
              ← Recommencer
            </button>
          </form>
        )}

        {step === 'done' && (
          <div className="space-y-4">
            <p className="text-sm text-success font-medium">Mot de passe réinitialisé avec succès.</p>
            <Link
              href="/guide/login"
              className="block w-full text-center bg-grenadine text-white font-bold py-3 rounded-full hover:opacity-90 transition text-sm"
            >
              Se connecter
            </Link>
          </div>
        )}

        {step !== 'done' && (
          <p className="text-center text-sm text-ink-60 mt-6">
            <Link href="/guide/login" className="text-grenadine hover:underline">
              Retour à la connexion
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
