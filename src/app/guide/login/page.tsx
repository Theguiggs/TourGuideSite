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

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-gray-900 text-center mb-2">Espace Guide</h1>
        <p className="text-gray-600 text-center mb-8">
          Connectez-vous pour gérer vos parcours et votre profil.
        </p>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          {justRegistered && (
            <div className="bg-teal-50 text-teal-700 rounded-lg p-3 mb-6 text-sm">
              Compte créé ! Connectez-vous pour accéder à votre tableau de bord.
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-6 text-sm" role="alert">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="guide@tourguide.app"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            data-testid="login-submit"
            disabled={loading}
            className="w-full bg-teal-700 text-white font-bold py-3 rounded-xl hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          <p className="text-center text-sm text-gray-500 mt-4">
            <a href="#" className="text-teal-700 hover:underline">
              Mot de passe oublié ?
            </a>
          </p>

        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Pas encore de compte ?{' '}
          <Link href="/guide/signup" className="text-teal-700 hover:underline font-medium">
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
