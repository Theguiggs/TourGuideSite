'use client';

/**
 * Guide Sign-Up Page
 *
 * Step 1 — Registration: email, password, display name, city
 * Step 2 — Email confirmation: 6-digit code sent by Cognito
 * After confirmation: auto sign-in + create GuideProfile in AppSync → dashboard
 */

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, confirmSignUp, signIn as amplifySignIn, fetchAuthSession, signOut as amplifySignOut } from 'aws-amplify/auth';
import { createGuideProfileMutation, getGuideProfileByUserId } from '@/lib/api/appsync-client';
import { useAuth } from '@/lib/auth/auth-context';
import { trackEvent, GuideAnalyticsEvents } from '@/lib/analytics';

const CITIES = [
  'Grasse', 'Nice', 'Cannes', 'Antibes', 'Monaco',
  'Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse',
  'Strasbourg', 'Nantes', 'Rennes', 'Montpellier', 'Lille',
];

type Step = 'register' | 'confirm';

interface FormErrors {
  displayName?: string;
  email?: string;
  password?: string;
  city?: string;
  code?: string;
  global?: string;
}

function parseSignUpError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('UsernameExistsException')) return 'Un compte existe déjà avec cet email';
    if (msg.includes('InvalidPasswordException')) return 'Mot de passe trop faible (min. 8 caractères, majuscule, chiffre)';
    if (msg.includes('InvalidParameterException')) return 'Paramètre invalide — vérifiez vos informations';
    if (msg.includes('CodeMismatchException')) return 'Code incorrect — vérifiez votre email';
    if (msg.includes('ExpiredCodeException')) return 'Code expiré — cliquez sur "Renvoyer le code"';
    if (msg.includes('LimitExceededException')) return 'Trop de tentatives — réessayez dans quelques minutes';
    return msg;
  }
  return 'Une erreur est survenue';
}

export default function GuideSignupPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [step, setStep] = useState<Step>('register');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Step 1 fields
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');

  // Step 2 fields
  const [code, setCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const signupStartedFired = useRef(false);

  function trackSignupStarted() {
    if (signupStartedFired.current) return;
    signupStartedFired.current = true;
    trackEvent(GuideAnalyticsEvents.GUIDE_SIGNUP_STARTED);
  }

  // ---- Validation ----

  function validateStep1(): FormErrors {
    const e: FormErrors = {};
    if (displayName.trim().length < 2) e.displayName = 'Minimum 2 caractères';
    if (displayName.trim().length > 50) e.displayName = 'Maximum 50 caractères';
    if (!email.includes('@')) e.email = 'Email invalide';
    if (password.length < 8) e.password = 'Minimum 8 caractères';
    else if (!/[A-Z]/.test(password)) e.password = 'Au moins une majuscule requise';
    else if (!/[a-z]/.test(password)) e.password = 'Au moins une minuscule requise';
    else if (!/[0-9]/.test(password)) e.password = 'Au moins un chiffre requis';
    else if (!/[^A-Za-z0-9]/.test(password)) e.password = 'Au moins un caractère spécial requis (!@#$%...)';
    if (!city) e.city = 'Sélectionnez une ville';
    return e;
  }

  // ---- Step 1: Register ----

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const errs = validateStep1();
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
      setErrors({});
      setLoading(true);

      try {
        await signUp({
          username: email.toLowerCase().trim(),
          password,
          options: {
            userAttributes: {
              email: email.toLowerCase().trim(),
              name: displayName.trim(),
            },
          },
        });
        setStep('confirm');
        startResendCooldown();
      } catch (error) {
        setErrors({ global: parseSignUpError(error) });
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [email, password, displayName, city],
  );

  // ---- Step 2: Confirm email + create profile ----

  const handleConfirm = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (code.trim().length !== 6) { setErrors({ code: 'Le code comporte 6 chiffres' }); return; }
      setErrors({});
      setLoading(true);

      try {
        // 1. Confirm Cognito account
        await confirmSignUp({ username: email.toLowerCase().trim(), confirmationCode: code.trim() });

        // 2. Sign in — sign out first if a stale session exists
        try {
          await amplifySignOut();
        } catch {
          // ignore — no session to clear
        }
        await amplifySignIn({ username: email.toLowerCase().trim(), password });

        // 3. Get Cognito userId from the access token (more reliable than getCurrentUser after fresh sign-in)
        const session = await fetchAuthSession();
        const userId = session.tokens?.accessToken?.payload?.sub as string | undefined;
        if (!userId) {
          setErrors({ global: 'Impossible de récupérer le profil — réessayez' });
          setLoading(false);
          return;
        }

        // 4. Create GuideProfile (idempotent — skip if already exists)
        const existing = await getGuideProfileByUserId(userId, 'userPool');
        if (!existing) {
          const profileResult = await createGuideProfileMutation({
            userId,
            displayName: displayName.trim(),
            city,
          });
          if (!profileResult.ok) {
            setErrors({ global: 'Compte créé mais erreur de profil — contactez le support' });
            setLoading(false);
            return;
          }
        }

        // 5. Refresh auth-context (reads the new GuideProfile and populates session)
        const refreshResult = await refreshUser();
        trackEvent(GuideAnalyticsEvents.GUIDE_SIGNUP_COMPLETED, { city });
        if (refreshResult.ok) {
          router.push('/guide/studio');
        } else {
          router.push('/guide/login?registered=1');
        }
      } catch (error) {
        setErrors({ global: parseSignUpError(error) });
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [code, email, password, displayName, city, refreshUser],
  );

  // ---- Resend code ----

  function startResendCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const { resendSignUpCode } = await import('aws-amplify/auth');
      await resendSignUpCode({ username: email.toLowerCase().trim() });
      startResendCooldown();
      setErrors({});
    } catch (error) {
      setErrors({ global: parseSignUpError(error) });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, resendCooldown]);

  // ---- Render ----

  const inputBase = "w-full bg-paper border rounded-md px-4 py-3 text-caption text-ink focus:outline-none focus:border-grenadine focus:ring-2 focus:ring-grenadine-soft transition";
  const labelClass = "block text-meta font-semibold text-ink-80 mb-1.5";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-paper">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-h3 text-ink mb-2 leading-none">Devenir Guide</h1>
          <p className="font-editorial italic text-body-lg text-ink-60">
            {step === 'register'
              ? 'Créez votre espace guide pour publier vos parcours.'
              : `Code de confirmation envoyé à ${email}`}
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8 gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-meta font-bold transition
            ${step === 'register' ? 'bg-grenadine text-paper' : 'bg-grenadine-soft text-grenadine'}`}>1</div>
          <div className="w-12 h-0.5 bg-line" />
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-meta font-bold transition
            ${step === 'confirm' ? 'bg-grenadine text-paper' : 'bg-paper-deep text-ink-40'}`}>2</div>
        </div>

        <div className="bg-card border border-line rounded-md p-8 shadow-sm">

          {errors.global && (
            <div className="bg-grenadine-soft border border-grenadine/30 text-danger rounded-md p-3 mb-6 text-caption" role="alert">
              {errors.global}
            </div>
          )}

          {/* ---- Step 1: Registration form ---- */}
          {step === 'register' && (
            <form onSubmit={handleRegister} noValidate>
              <div className="space-y-4">

                <div>
                  <label htmlFor="displayName" className={labelClass}>
                    Nom complet <span className="text-danger">*</span>
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => { trackSignupStarted(); setDisplayName(e.target.value); }}
                    placeholder="Marie Dupont"
                    required
                    className={`${inputBase} ${errors.displayName ? 'border-grenadine' : 'border-line'}`}
                  />
                  {errors.displayName && <p className="text-danger text-meta mt-1">{errors.displayName}</p>}
                </div>

                <div>
                  <label htmlFor="email" className={labelClass}>
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => { trackSignupStarted(); setEmail(e.target.value); }}
                    placeholder="guide@exemple.com"
                    required
                    autoComplete="email"
                    className={`${inputBase} ${errors.email ? 'border-grenadine' : 'border-line'}`}
                  />
                  {errors.email && <p className="text-danger text-meta mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="password" className={labelClass}>
                    Mot de passe <span className="text-danger">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    required
                    autoComplete="new-password"
                    className={`${inputBase} ${errors.password ? 'border-grenadine' : 'border-line'}`}
                  />
                  {password.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {[
                        { label: '8 caractères minimum', ok: password.length >= 8 },
                        { label: 'Une majuscule (A–Z)', ok: /[A-Z]/.test(password) },
                        { label: 'Une minuscule (a–z)', ok: /[a-z]/.test(password) },
                        { label: 'Un chiffre (0–9)', ok: /[0-9]/.test(password) },
                        { label: 'Un caractère spécial (!@#$%…)', ok: /[^A-Za-z0-9]/.test(password) },
                      ].map(({ label, ok }) => (
                        <li key={label} className={`flex items-center gap-1.5 text-meta transition-colors ${ok ? 'text-mer' : 'text-ink-40'}`}>
                          <span className="text-[11px] font-bold">{ok ? '✓' : '○'}</span>
                          {label}
                        </li>
                      ))}
                    </ul>
                  )}
                  {errors.password && <p className="text-danger text-meta mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label htmlFor="city" className={labelClass}>
                    Ville principale <span className="text-danger">*</span>
                  </label>
                  <select
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    className={`${inputBase} ${errors.city ? 'border-grenadine' : 'border-line'}`}
                  >
                    <option value="">Sélectionnez une ville…</option>
                    {CITIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {errors.city && <p className="text-danger text-meta mt-1">{errors.city}</p>}
                </div>

              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full bg-grenadine text-paper font-bold py-3 rounded-pill hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition text-caption"
              >
                {loading ? 'Création du compte…' : 'Créer mon compte'}
              </button>

              <p className="text-center text-caption text-ink-60 mt-4">
                Déjà un compte ?{' '}
                <Link href="/guide/login" className="text-grenadine hover:underline underline-offset-2 font-medium no-underline">
                  Se connecter
                </Link>
              </p>
            </form>
          )}

          {/* ---- Step 2: Email confirmation ---- */}
          {step === 'confirm' && (
            <form onSubmit={handleConfirm} noValidate>
              <div className="mb-2">
                <p className="text-caption text-ink-60 mb-4">
                  Vérifiez votre boite mail et saisissez le code à 6 chiffres.
                </p>
                <label htmlFor="code" className={labelClass}>
                  Code de confirmation
                </label>
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  className={`${inputBase} text-center text-h5 tracking-widest font-mono ${errors.code ? 'border-grenadine' : 'border-line'}`}
                />
                {errors.code && <p className="text-danger text-meta mt-1">{errors.code}</p>}
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="mt-6 w-full bg-grenadine text-paper font-bold py-3 rounded-pill hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition text-caption"
              >
                {loading ? 'Vérification…' : 'Confirmer et accéder au tableau de bord'}
              </button>

              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="text-caption text-grenadine hover:underline underline-offset-2 disabled:text-ink-40 disabled:no-underline"
                >
                  {resendCooldown > 0
                    ? `Renvoyer le code (${resendCooldown}s)`
                    : 'Renvoyer le code'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => { setStep('register'); setCode(''); setErrors({}); }}
                className="mt-3 w-full text-caption text-ink-40 hover:text-ink transition"
              >
                ← Modifier mes informations
              </button>
            </form>
          )}

        </div>

        {/* Info block */}
        <div className="mt-6 bg-mer-soft border border-mer/30 rounded-md p-4 text-caption text-mer">
          <p className="font-semibold mb-1.5">Après votre inscription</p>
          <ul className="space-y-1">
            <li>✓ Votre profil sera soumis à validation</li>
            <li>✓ Vous pouvez commencer à créer vos parcours</li>
            <li>✓ Chaque parcours passe par une modération avant publication</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
