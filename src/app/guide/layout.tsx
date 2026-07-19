'use client';

import { usePathname } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';

const PUBLIC_GUIDE_ROUTES = new Set([
  '/guide/login',
  '/guide/signup',
  '/guide/reset-password',
]);

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';

  if (PUBLIC_GUIDE_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return <AuthGuard>{children}</AuthGuard>;
}
