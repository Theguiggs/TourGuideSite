'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { trackEvent } from '@/lib/analytics';
import { GuideAnalyticsEvents } from '@/lib/analytics';
import { loginDestination, safeReturnTo } from '@/lib/auth/return-to';
import { useStudioLocale } from '@/lib/i18n/studio-locale';

function GuideLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === '1';
  const returnTo = safeReturnTo(searchParams.get('returnTo'));
  const reason = searchParams.get('reason');
  const { signIn } = useAuth();
  const { t } = useStudioLocale();
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
      router.push(loginDestination(result.role, returnTo));
    } else {
      setError(result.error || t('Connexion impossible pour le moment. Réessayez dans un instant.', 'Unable to sign in right now. Please try again in a moment.'));
    }
  };

  const inputClass = "w-full bg-paper border border-line rounded-md px-4 py-3 text-caption text-ink focus:outline-none focus:border-grenadine focus:ring-2 focus:ring-grenadine-soft transition";
  const labelClass = "block text-meta font-semibold text-ink-80 mb-1.5";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 bg-paper">
      <div className="w-full max-w-md">
        <h1 className="font-display text-h3 text-ink text-center mb-2 leading-none">{t('Espace Guide', 'Guide Area')}</h1>
        <p className="font-editorial italic text-body-lg text-ink-60 text-center mb-8">
          {t('Connectez-vous pour gérer vos parcours et votre profil.', 'Sign in to manage your tours and your profile.')}
        </p>

        <form onSubmit={handleSubmit} className="bg-card border border-line rounded-md p-8 shadow-sm">
          {reason === 'expired' && (
            <div className="bg-ocre-soft border border-ocre/30 text-ocre-ink rounded-md p-3 mb-6 text-caption" role="status" data-testid="login-reason">
              {t('Votre session a expiré. Reconnectez-vous pour reprendre là où vous étiez.', 'Your session has expired. Sign in again to pick up where you left off.')}
            </div>
          )}
          {reason === 'revoked' && (
            <div className="bg-grenadine-soft border border-grenadine/30 text-danger rounded-md p-3 mb-6 text-caption" role="alert" data-testid="login-reason">
              {t('Votre accès guide a été retiré. Si vous pensez qu’il s’agit d’une erreur, écrivez-nous.', 'Your guide access has been removed. If you think this is a mistake, write to us.')}
            </div>
          )}
          {justRegistered && (
            <div className="bg-olive-soft border border-olive/30 text-olive rounded-md p-3 mb-6 text-caption">
              {t('Compte créé ! Connectez-vous pour accéder à votre tableau de bord.', 'Account created! Sign in to access your dashboard.')}
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
              {t('Mot de passe', 'Password')}
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
            {loading ? t('Connexion…', 'Signing in…') : t('Se connecter', 'Sign in')}
          </button>

          <p className="text-center text-meta text-ink-60 mt-4">
            <Link href="/guide/reset-password" className="text-grenadine hover:underline underline-offset-2">
              {t('Mot de passe oublié ?', 'Forgot your password?')}
            </Link>
          </p>
        </form>

        <p className="text-center text-caption text-ink-60 mt-6">
          {t('Pas encore de compte ?', 'No account yet?')}{' '}
          <Link href="/guide/signup" className="text-grenadine hover:underline underline-offset-2 font-medium no-underline">
            {t('Devenir guide', 'Become a guide')}
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
