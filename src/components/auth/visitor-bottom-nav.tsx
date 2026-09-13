'use client';
import type { InterfaceLocale } from '@/lib/i18n/locales';
import { translate } from '@/lib/i18n/translate';

import Link from 'next/link';
import { Compass, Headphones, UserRound } from 'lucide-react';
import { visitorAuthUrl } from '@/lib/auth/visitor-routes';
import { useVisitorReturn } from '@/lib/auth/use-visitor-return';
import { Suspense } from 'react';

function BottomNavContent({ locale, pathname }: { locale: InterfaceLocale; pathname: string }) {
  const currentReturn = useVisitorReturn();
  const items = [
    { href: translate(locale, '/catalogue', '/en/catalogue'), label: translate(locale, 'Explorer', 'Explore'), icon: Compass },
    { href: translate(locale, '/mes-achats', '/en/my-purchases'), label: translate(locale, 'Mes visites', 'My tours'), icon: Headphones },
    { href: visitorAuthUrl(locale, 'login', currentReturn), label: translate(locale, 'Compte', 'Account'), icon: UserRound },
  ];
  return <nav aria-label={translate(locale, 'Navigation visiteur', 'Visitor navigation')} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] xl:hidden">
    {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className="flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-meta font-semibold text-ink no-underline aria-[current=page]:text-grenadine">
      <Icon size={20} aria-hidden="true" />{label}
    </Link>)}
  </nav>;
}

export function VisitorBottomNav(props: { locale: InterfaceLocale; pathname: string }) {
  return <Suspense><BottomNavContent {...props} /></Suspense>;
}
