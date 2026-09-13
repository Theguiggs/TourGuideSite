'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { confirmResetPassword, confirmSignUp, resendSignUpCode, resetPassword, signUp } from 'aws-amplify/auth';
import { useAuth } from '@/lib/auth/auth-context';
import { describeAuthError, isUnknownUserError, type AuthErrorContext } from '@/lib/auth/cognito-errors';
import { visitorAuthUrl, visitorDestination, localizeVisitorReturn, type VisitorAuthMode } from '@/lib/auth/visitor-routes';
import { AnalyticsEvents, trackEvent } from '@/lib/analytics';

type Step = VisitorAuthMode | 'confirm' | 'reset-confirm';
type Props = { locale: 'fr' | 'en'; mode: VisitorAuthMode };
const inputClass = 'w-full min-w-0 rounded-md border border-line bg-paper px-3 py-3 text-body text-ink focus:border-grenadine focus:outline-none focus:ring-2 focus:ring-grenadine-soft';
const linkClass = 'inline-flex min-h-11 items-center text-grenadine underline underline-offset-4';

function VisitorAuthContent({ locale, mode }: Props) {
  const t = (fr: string, en: string) => locale === 'fr' ? fr : en;
  const params = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const returnTo = visitorDestination(locale, params.get('returnTo'));
  const initialStep = params.get('step');
  const requestedStep: Step = initialStep && ['login', 'signup', 'reset', 'confirm', 'reset-confirm'].includes(initialStep) ? initialStep as Step : mode;
  const [step, setStep] = useState<Step>(requestedStep);
  const [seenRequest, setSeenRequest] = useState(requestedStep);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const [resendAfter, setResendAfter] = useState(0);
  // Next conserve le composant quand seule la query change (retour navigateur,
  // lien du header). Réconcilier cette entrée externe avant le rendu du formulaire.
  if (seenRequest !== requestedStep) {
    setSeenRequest(requestedStep); setStep(requestedStep);
    setPassword(''); setCode(''); setError(null);
  }
  useEffect(() => {
    if (!resendAfter) return;
    const timer = window.setTimeout(() => setResendAfter((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendAfter]);
  useEffect(() => {
    if (previousStep.current !== step) heading.current?.focus();
    previousStep.current = step;
  }, [step]);

  const context: AuthErrorContext = step === 'signup' ? 'signUp' : step === 'confirm' ? 'confirmSignUp' : step.startsWith('reset') ? 'reset' : 'signIn';
  const transition = (next: Step, message = '') => {
    if (!alive.current) return;
    setPassword(''); setCode(''); setError(null); setNotice(message); setStep(next);
    // L’étape, jamais l’email ni le mot de passe, suit la bascule de langue.
    const url = new URL(window.location.href);
    url.searchParams.set('step', next);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  };
  async function run(action: () => Promise<void>, errorContext = context) {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError(null); setNotice('');
    try { await action(); }
    catch (failure) { setError(describeAuthError(failure, errorContext, locale)); }
    finally { pending.current = false; setBusy(false); }
  }
  const username = email.trim().toLowerCase();
  async function requestReset() {
    try { await resetPassword({ username }); }
    catch (failure) { if (!isUnknownUserError(failure)) throw failure; }
    transition('reset-confirm', t('Si ce compte peut recevoir un code, vous le trouverez dans votre boîte email.', 'If this account can receive a code, you will find it in your email.'));
    setResendAfter(30);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    await run(async () => {
      if (step === 'login') {
        trackEvent(AnalyticsEvents.WEB_AUTH_STARTED, { locale });
        const result = await auth.signIn(username, password);
        if (!alive.current) return;
        if (result.ok) {
          setPassword('');
          trackEvent(AnalyticsEvents.WEB_AUTH_COMPLETED, { locale });
          router.push(returnTo);
        } else if (result.nextStep === 'confirmSignUp') {
          transition('confirm', t('Confirmez votre compte avec le code reçu par email, ou demandez un nouveau code.', 'Confirm your account with the code from your email, or request a new code.'));
        } else if (result.nextStep === 'resetPassword') {
          transition('reset', t('Réinitialisez votre mot de passe pour continuer.', 'Reset your password to continue.'));
        } else {
          const failure = Object.assign(new Error(), { name: result.errorCode ?? '' });
          setError(result.errorCode === 'AdditionalStepRequired'
            ? t('Ce compte nécessite une étape de connexion supplémentaire. Utilisez l’aide pour nous contacter.', 'This account requires an additional sign-in step. Use Help to contact us.')
            : describeAuthError(failure, 'signIn', locale));
        }
      } else if (step === 'signup') {
        trackEvent(AnalyticsEvents.WEB_SIGNUP_STARTED, { locale });
        const result = await signUp({ username, password, options: { userAttributes: { email: username } } });
        if (result.isSignUpComplete) {
          trackEvent(AnalyticsEvents.WEB_SIGNUP_COMPLETED, { locale });
          transition('login', t('Compte créé. Connectez-vous pour continuer.', 'Account created. Sign in to continue.'));
        } else {
          transition('confirm', t('Saisissez le code de confirmation reçu par email.', 'Enter the confirmation code from your email.'));
          setResendAfter(30);
        }
      } else if (step === 'confirm') {
        const result = await confirmSignUp({ username, confirmationCode: code.trim() });
        if (!result.isSignUpComplete) {
          setError(t('La confirmation n’est pas terminée. Réessayez ou consultez l’aide.', 'Confirmation is not complete. Try again or visit Help.'));
          return;
        }
        trackEvent(AnalyticsEvents.WEB_SIGNUP_COMPLETED, { locale });
        transition('login', t('Compte confirmé. Connectez-vous pour retrouver votre visite.', 'Account confirmed. Sign in to return to your tour.'));
      } else if (step === 'reset') {
        await requestReset();
      } else {
        await confirmResetPassword({ username, confirmationCode: code.trim(), newPassword: password });
        transition('login', t('Mot de passe modifié. Connectez-vous pour continuer.', 'Password updated. Sign in to continue.'));
      }
    });
  }
  const title = step === 'login' ? t('Se connecter', 'Sign in')
    : step === 'signup' ? t('Créer mon compte', 'Create my account')
    : step === 'confirm' ? t('Confirmer mon email', 'Confirm my email')
    : t('Réinitialiser mon mot de passe', 'Reset my password');
  const submitLabel = step === 'login' ? t('Se connecter', 'Sign in') : step === 'signup' ? t('Créer mon compte', 'Create my account')
    : step === 'confirm' ? t('Confirmer mon compte', 'Confirm my account') : step === 'reset' ? t('Envoyer le code', 'Send the code') : t('Enregistrer le mot de passe', 'Save password');
  const hasCode = step === 'confirm' || step === 'reset-confirm';
  const hasPassword = step === 'login' || step === 'signup' || step === 'reset-confirm';
  const linkMode = step === 'signup' || step === 'confirm' ? 'signup' : step.startsWith('reset') ? 'reset' : 'login';
  const otherLocale = locale === 'fr' ? 'en' : 'fr';

  return <section className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12" aria-labelledby="visitor-auth-title">
    <h1 id="visitor-auth-title" ref={heading} tabIndex={-1} className="font-display text-h4 sm:text-h3 leading-tight text-ink break-words">{title}</h1>
    <p className="mt-3 mb-6 text-body text-ink-60">{t('Retrouvez vos visites et écoutez à votre rythme. Le même compte fonctionne dans l’application Murmure.', 'Find your tours and listen at your own pace. The same account works in the Murmure app.')}</p>
    {auth.isLoading ? <p role="status">{t('Vérification de votre session…', 'Checking your session…')}</p> : auth.isAuthenticated ? <div className="rounded-md border border-line bg-card p-4 sm:p-6 space-y-4">
      <p className="text-body break-words">{t('Vous êtes connecté avec ', 'You are signed in as ')}{auth.user?.email}.</p>
      <Link className={linkClass} href={returnTo}>{t('Continuer vers ma visite', 'Continue to my tour')}</Link>
      {(auth.isGuide || auth.isAdmin) && <p><Link className={linkClass} href={auth.isAdmin ? '/admin/moderation' : '/guide/studio'}>{t('Accéder à mon espace créateur', 'Open my creator space')}</Link></p>}
      <button type="button" disabled={busy} className={`${linkClass} block`} onClick={() => void run(async () => { await auth.signOut(); transition('login'); })}>{t('Changer de compte', 'Use another account')}</button>
    </div> : <form onSubmit={submit} className="rounded-md border border-line bg-card p-4 sm:p-6 space-y-4" aria-busy={busy}>
      {params.get('reason') === 'expired' && <p role="status" className="text-body text-ink-60">{t('Votre session a expiré. Reconnectez-vous pour continuer.', 'Your session has expired. Sign in again to continue.')}</p>}
      <div role="alert" className="text-body text-danger">{error}</div>
      <div role="status" className="text-body text-ink-80">{notice}</div>
      <div>
        <label htmlFor="visitor-email" className="mb-2 block text-body font-semibold">Email</label>
        <input id="visitor-email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required disabled={busy} value={email} onChange={event => { setEmail(event.target.value); setCode(''); }} className={inputClass} />
      </div>
      {hasCode && <div>
        <label htmlFor="visitor-code" className="mb-2 block text-body font-semibold">{t('Code reçu par email', 'Code from your email')}</label>
        <input id="visitor-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" required disabled={busy} value={code} onChange={event => setCode(event.target.value)} className={inputClass} />
      </div>}
      {hasPassword && <div>
        <label htmlFor="visitor-password" className="mb-2 block text-body font-semibold">{step === 'reset-confirm' ? t('Nouveau mot de passe', 'New password') : t('Mot de passe', 'Password')}</label>
        <input id="visitor-password" name="password" type="password" autoComplete={step === 'login' ? 'current-password' : 'new-password'} required minLength={step === 'login' ? undefined : 8} aria-describedby={step === 'login' ? undefined : 'password-help'} disabled={busy} value={password} onChange={event => setPassword(event.target.value)} className={inputClass} />
        {step !== 'login' && <p id="password-help" className="mt-2 text-caption text-ink-60">{t('Au moins 8 caractères, avec majuscule, minuscule, chiffre et caractère spécial.', 'At least 8 characters, including uppercase, lowercase, a number and a special character.')}</p>}
      </div>}
      <button type="submit" disabled={busy} className="min-h-11 w-full rounded-pill bg-grenadine px-4 py-3 text-body font-bold text-paper disabled:opacity-50">{busy ? t('Veuillez patienter…', 'Please wait…') : submitLabel}</button>
      {hasCode && <div className="flex flex-wrap gap-x-4">
        <button type="button" disabled={busy || resendAfter > 0} className={`${linkClass} disabled:opacity-50`} onClick={() => void run(async () => {
          if (step === 'confirm') {
            await resendSignUpCode({ username }); setResendAfter(30);
            setNotice(t('Si l’envoi est possible, un nouveau code vous parviendra par email.', 'If delivery is possible, a new code will arrive by email.'));
          } else await requestReset();
        })}>{t('Renvoyer le code', 'Resend code')}{resendAfter > 0 ? ` (${resendAfter} s)` : ''}</button>
        <button type="button" disabled={busy} className={linkClass} onClick={() => transition(step === 'confirm' ? 'login' : 'reset')}>{t('Modifier l’email', 'Change email')}</button>
      </div>}
      <div className="flex flex-col items-start">
        {step !== 'login' && <Link className={linkClass} href={visitorAuthUrl(locale, 'login', returnTo)} onClick={event => { event.preventDefault(); if (!busy) transition('login'); }}>{t('Déjà un compte ? Se connecter', 'Already have an account? Sign in')}</Link>}
        {step !== 'signup' && <Link className={linkClass} href={visitorAuthUrl(locale, 'signup', returnTo)} aria-disabled={busy} onClick={event => { event.preventDefault(); if (!busy) transition('signup'); }}>{t('Créer un compte visiteur', 'Create a visitor account')}</Link>}
        {step === 'signup' && <button type="button" className={linkClass} disabled={busy} onClick={() => transition('confirm')}>{t('J’ai déjà un code de confirmation', 'I already have a confirmation code')}</button>}
        <Link className={linkClass} href={visitorAuthUrl(locale, 'reset', returnTo)} aria-disabled={busy} onClick={event => { event.preventDefault(); if (!busy) transition('reset'); }}>{t('Mot de passe oublié ?', 'Forgot your password?')}</Link>
      </div>
    </form>}
    <div className="mt-4 flex flex-wrap justify-between gap-x-4">
      <Link className={linkClass} href={locale === 'en' ? '/en/help' : '/aide'}>{t('Besoin d’aide ?', 'Need help?')}</Link>
      <Link className={linkClass} href={`${visitorAuthUrl(otherLocale, linkMode, localizeVisitorReturn(returnTo, otherLocale))}&step=${step}`} hrefLang={otherLocale} aria-disabled={busy} onClick={event => { if (busy) event.preventDefault(); }}>{otherLocale === 'en' ? 'English' : 'Français'}</Link>
    </div>
  </section>;
}

export function VisitorAuth(props: Props) {
  // Une navigation vers une autre étape repart avec un formulaire sans secret.
  return <Suspense><VisitorAuthContent key={`${props.locale}-${props.mode}`} {...props} /></Suspense>;
}
