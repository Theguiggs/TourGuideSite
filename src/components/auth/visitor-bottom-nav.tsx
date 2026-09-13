'use client';

import Link from 'next/link';
import { Compass, Headphones, UserRound } from 'lucide-react';
import { visitorAuthUrl } from '@/lib/auth/visitor-routes';
import { useVisitorReturn } from '@/lib/auth/use-visitor-return';
import { Suspense } from 'react';

function BottomNavContent({ locale, pathname }: { locale: 'fr' | 'en'; pathname: string }) {
  const currentReturn = useVisitorReturn();
  const items = [
    { href: locale === 'en' ? '/en/catalogue' : '/catalogue', label: locale === 'en' ? 'Explore' : 'Explorer', icon: Compass },
    { href: locale === 'en' ? '/en/my-purchases' : '/mes-achats', label: locale === 'en' ? 'My tours' : 'Mes visites', icon: Headphones },
    { href: visitorAuthUrl(locale, 'login', currentReturn), label: locale === 'en' ? 'Account' : 'Compte', icon: UserRound },
  ];
  return <nav aria-label={locale === 'en' ? 'Visitor navigation' : 'Navigation visiteur'} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-line bg-paper pb-[env(safe-area-inset-bottom)] xl:hidden">
    {items.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className="flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-meta font-semibold text-ink no-underline aria-[current=page]:text-grenadine">
      <Icon size={20} aria-hidden="true" />{label}
    </Link>)}
  </nav>;
}

export function VisitorBottomNav(props: { locale: 'fr' | 'en'; pathname: string }) {
  return <Suspense><BottomNavContent {...props} /></Suspense>;
}
