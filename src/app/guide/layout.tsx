'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import AuthGuard from '@/components/AuthGuard';

const NAV_ITEMS = [
  { href: '/guide/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/guide/studio', label: 'Mon Studio', icon: '🎙️' },
  { href: '/guide/tours', label: 'Mes Parcours', icon: '🗺️' },
  { href: '/guide/profile', label: 'Mon Profil', icon: '👤' },
  { href: '/guide/revenue', label: 'Revenus', icon: '💰' },
];

function GuideNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  // Don't show nav on public pages
  if (pathname === '/guide/login' || pathname === '/guide/signup') return null;

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 bg-gray-50 border-b lg:border-b-0 lg:border-r border-gray-200">
      <div className="p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-teal-200 rounded-full flex items-center justify-center text-teal-700 font-bold">
            {user?.displayName?.charAt(0) || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 truncate">{user?.displayName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={signOut}
          className="hidden lg:block w-full mt-8 text-left text-sm text-gray-500 hover:text-red-600 px-3 py-2"
        >
          Se deconnecter
        </button>
      </div>
    </aside>
  );
}

export default function GuideLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === '/guide/login' || pathname === '/guide/signup';
  const isStudioPage = pathname.startsWith('/guide/studio');

  if (isPublicPage) {
    return <>{children}</>;
  }

  // Studio routes ship their own Murmure shell (StudioHeader + StudioSidebar)
  // and bypass the legacy GuideNav — the studio/layout.tsx renders both.
  if (isStudioPage) {
    return <AuthGuard>{children}</AuthGuard>;
  }

  return (
    <AuthGuard>
      <div className="flex flex-col lg:flex-row min-h-[80vh]">
        <GuideNav />
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </AuthGuard>
  );
}
