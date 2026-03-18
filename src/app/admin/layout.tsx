'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import AuthGuard from '@/components/AuthGuard';

const NAV_ITEMS = [
  { href: '/admin/moderation', label: "File d'attente", icon: '📋' },
  { href: '/admin/moderation/history', label: 'Historique', icon: '📜' },
  { href: '/admin/tours', label: 'Tous les parcours', icon: '🗺️' },
  { href: '/admin/guides', label: 'Tous les guides', icon: '👥' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📊' },
];

function AdminNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 bg-gray-900 text-white">
      <div className="p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-bold">
            {user?.displayName?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{user?.displayName}</p>
            <p className="text-xs text-gray-400 truncate">Admin - Moderation</p>
          </div>
        </div>

        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin/moderation' && pathname.startsWith(item.href));
            const isQueueActive = item.href === '/admin/moderation' && pathname.startsWith('/admin/moderation') && !pathname.startsWith('/admin/moderation/history');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  isActive || isQueueActive
                    ? 'bg-red-700 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
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
          className="hidden lg:block w-full mt-8 text-left text-sm text-gray-400 hover:text-red-400 px-3 py-2"
        >
          Se deconnecter
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAdmin>
      <div className="flex flex-col lg:flex-row min-h-[80vh]">
        <AdminNav />
        <main className="flex-1 p-4 lg:p-8 bg-gray-50">{children}</main>
      </div>
    </AuthGuard>
  );
}
