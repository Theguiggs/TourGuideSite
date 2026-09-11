'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { loginUrlFor } from '@/lib/auth/return-to';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireGuide?: boolean;
}

export default function AuthGuard({
  children,
  requireAdmin = false,
  requireGuide = false,
}: AuthGuardProps) {
  const { isAuthenticated, isAdmin, isGuide, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      // La page demandée est conservée : après connexion, on y revient.
      router.replace(loginUrlFor(pathname));
    } else if (requireAdmin && !isAdmin) {
      router.replace(isGuide ? '/guide/studio' : '/catalogue');
    } else if (requireGuide && !isGuide) {
      router.replace('/catalogue');
    }
  }, [isAuthenticated, isAdmin, isGuide, isLoading, requireAdmin, requireGuide, router, pathname]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="text-ink-60">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated) return null;
  if (requireAdmin && !isAdmin) return null;
  if (requireGuide && !isGuide) return null;

  return <>{children}</>;
}
