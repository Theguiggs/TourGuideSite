'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, PanelsTopLeft, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { localizePublicPath } from '@/lib/i18n/public-routes';
import { visitorAuthUrl, localizeVisitorReturn } from '@/lib/auth/visitor-routes';
import { MurmureLogo } from '@/components/shell/MurmureLogo';
import StoreLink from '@/components/StoreLink';
import { useVisitorReturn } from '@/lib/auth/use-visitor-return';

interface HeaderProps {
  locale?: 'fr' | 'en';
  onLocaleChange?: (locale: 'fr' | 'en') => void;
}
const navLink = 'inline-flex min-h-11 items-center text-caption font-semibold text-ink-80 hover:text-grenadine no-underline';

function HeaderContent({ locale = 'fr', onLocaleChange }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() ?? '/';
  const params = useSearchParams();
  const currentReturn = useVisitorReturn();
  const { isAuthenticated, isAdmin, isGuide, signOut } = useAuth();
  const t = (fr: string, en: string) => locale === 'fr' ? fr : en;
  const home = locale === 'en' ? '/en' : '/';
  const catalogue = `${locale === 'en' ? '/en' : ''}/catalogue`;
  const purchases = locale === 'en' ? '/en/my-purchases' : '/mes-achats';
  const login = visitorAuthUrl(locale, 'login', currentReturn);
  const account = isAuthenticated ? visitorAuthUrl(locale) : login;
  const isAuthPage = /^\/(connexion|inscription|mot-de-passe-oublie|en\/(sign-in|sign-up|reset-password))$/.test(pathname);
  const languageHref = (target: 'fr' | 'en') => {
    const path = localizePublicPath(pathname, target);
    if (!isAuthPage) return path;
    const returnTo = localizeVisitorReturn(params?.get('returnTo') ?? null, target);
    const translated = new URLSearchParams();
    if (returnTo) translated.set('returnTo', returnTo);
    const step = params?.get('step');
    if (step && ['login', 'signup', 'confirm', 'reset', 'reset-confirm'].includes(step)) translated.set('step', step);
    return translated.size ? `${path}?${translated}` : path;
  };
  const languageSwitch = <div className="inline-flex gap-1" role="group" aria-label={t('Choisir la langue', 'Choose language')}>
    {(['fr', 'en'] as const).map(target => onLocaleChange
      ? <button type="button" key={target} lang={target} aria-pressed={locale === target} className={`${navLink} min-w-11 justify-center rounded-md ${target === locale ? 'bg-paper-deep' : ''}`} onClick={() => { onLocaleChange(target); setMenuOpen(false); }}>{target.toUpperCase()}</button>
      : <Link key={target} href={languageHref(target)} hrefLang={target} aria-current={locale === target ? 'page' : undefined} className={`${navLink} min-w-11 justify-center rounded-md ${target === locale ? 'bg-paper-deep' : ''}`} onClick={() => setMenuOpen(false)}>{target.toUpperCase()}</Link>)}
  </div>;
  const creatorLink = <Link href={isAdmin ? '/admin/moderation' : isGuide ? '/guide/studio' : locale === 'en' ? '/en/create-tours' : '/creer-des-visites'} className={navLink} onClick={() => setMenuOpen(false)}>
    <PanelsTopLeft size={16} className="mr-2" aria-hidden="true" />{isAdmin ? t('Administrer', 'Admin') : isGuide ? t('Mon Studio', 'My Studio') : t('Créer des visites', 'Create tours')}
  </Link>;

  return <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur-sm">
    <nav aria-label={t('Navigation principale', 'Main navigation')} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="flex min-h-16 items-center justify-between gap-2">
        <Link href={home} className="shrink-0 no-underline"><MurmureLogo size={26} /></Link>
        <div className="hidden xl:flex items-center gap-5">
          <Link href={catalogue} className={navLink}>{t('Découvrir les visites', 'Discover tours')}</Link>
          <Link href={purchases} className={navLink}>{t('Mes visites', 'My tours')}</Link>
          <Link href={locale === 'en' ? '/en/help' : '/aide'} className={navLink}>{t('Aide', 'Help')}</Link>
          {creatorLink}{languageSwitch}
          <Link href={account} className="inline-flex min-h-11 items-center rounded-pill bg-grenadine px-4 text-caption font-bold text-paper no-underline">{isAuthenticated ? t('Mon compte', 'My account') : t('Se connecter', 'Sign in')}</Link>
        </div>
        <div className="flex items-center gap-2 xl:hidden">
          <Link href={account} className={`${navLink} text-grenadine`}>{isAuthenticated ? t('Mon compte', 'My account') : t('Se connecter', 'Sign in')}</Link>
          <button type="button" className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-ink" aria-expanded={menuOpen} aria-controls="menu-mobile" aria-label={menuOpen ? t('Fermer le menu', 'Close menu') : t('Ouvrir le menu', 'Open menu')} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
          </button>
        </div>
      </div>
      {menuOpen && <div id="menu-mobile" className="grid max-h-[70dvh] overflow-y-auto border-t border-line pb-4 xl:hidden" onKeyDown={event => { if (event.key === 'Escape') setMenuOpen(false); }}>
        <Link href={catalogue} className={navLink} onClick={() => setMenuOpen(false)}>{t('Découvrir les visites', 'Discover tours')}</Link>
        <Link href={purchases} className={navLink} onClick={() => setMenuOpen(false)}>{t('Mes visites', 'My tours')}</Link>
        <Link href={locale === 'en' ? '/en/help' : '/aide'} className={navLink} onClick={() => setMenuOpen(false)}>{t('Aide', 'Help')}</Link>
        {creatorLink}{languageSwitch}
        <StoreLink className={navLink} onClick={() => setMenuOpen(false)}>{t('Télécharger l’application', 'Download the app')}</StoreLink>
        {isAuthenticated && <button type="button" className={navLink} onClick={() => { void signOut(); setMenuOpen(false); }}>{t('Déconnexion', 'Sign out')}</button>}
      </div>}
    </nav>
  </header>;
}

export default function Header(props: HeaderProps) {
  return <Suspense><HeaderContent {...props} /></Suspense>;
}
