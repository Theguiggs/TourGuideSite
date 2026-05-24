'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { trackEvent } from '@/lib/analytics';
import { GuideAnalyticsEvents } from '@/lib/analytics';

function GuideLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn(email, password);
    setLoading(false);

    if (result.ok) {
      trackEvent(GuideAnalyticsEvents.GUIDE_PORTAL_LOGIN, { email_domain: email.split('@')[1] });
      router.push(result.role === 'admin' ? '/admin/moderation' : '/guide/dashboard');
    } else {
      setError(result.error || 'Erreur de connexion');
    }
  };

  const inputClass = "w-full bg-paper border border-line rounded-md px-4 py-3 text-caption text-ink focus:outline-none focus:border-grenadine focus:ring-2 focus:ring-grenadine-soft transition";
  const labelClass = "block text-meta font-semibold text-ink-80 mb-1.5";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-paper">
      <div className="w-full max-w-md">
        <h1 className="font-display text-h3 text-ink text-center mb-2 leading-none">Espace Guide</h1>
        <p className="font-editorial italic text-body-lg text-ink-60 text-center mb-8">
          Connectez-vous pour gérer vos parcours et votre profil.
        </p>

        <form onSubmit={handleSubmit} className="bg-card border border-line rounded-md p-8 shadow-sm">
          {justRegistered && (
            <div className="bg-olive-soft border border-olive/30 text-olive rounded-md p-3 mb-6 text-caption">
              Compte créé ! Connectez-vous pour accéder à votre tableau de bord.
            </div>
          )}
          {error && (
            <div className="bg-grenadine-soft border border-grenadine/30 text-danger rounded-md p-3 mb-6 text-caption" role="alert">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              data-testid="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="guide@murmure.app"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className={labelClass}>
              Mot de passe
            </label>
            <input
              id="password"
              data-testid="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            data-testid="login-submit"
            disabled={loading}
            className="w-full bg-grenadine text-paper font-bold py-3 rounded-pill hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition text-caption"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>

          <p className="text-center text-meta text-ink-60 mt-4">
            <a href="#" className="text-grenadine hover:underline underline-offset-2">
              Mot de passe oublié ?
            </a>
          </p>
        </form>

        <p className="text-center text-caption text-ink-60 mt-6">
          Pas encore de compte ?{' '}
          <Link href="/guide/signup" className="text-grenadine hover:underline underline-offset-2 font-medium no-underline">
            Devenir guide
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function GuideLoginPage() {
  return (
    <Suspense>
      <GuideLoginContent />
    </Suspense>
  );
}
