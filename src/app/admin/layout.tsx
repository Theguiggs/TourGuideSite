'use client';

import Link from 'next/link';
import { BarChart3, ClipboardList, Headphones, History, Map, Users } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import AuthGuard from '@/components/AuthGuard';
import { JetBrains_Mono } from 'next/font/google';

// `font-mono` (identifiants, montants) : police chargée ici, pas sur le site public.
const jetBrainsMono = JetBrains_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--tg-font-mono',
  display: 'swap',
});

const NAV_ITEMS = [
  { href: '/admin/moderation', label: "File d'attente", icon: ClipboardList },
  { href: '/admin/moderation/history', label: 'Historique', icon: History },
  { href: '/admin/tours', label: 'Toutes les visites', icon: Map },
  { href: '/admin/guides', label: 'Tous les guides', icon: Users },
  { href: '/admin/narration', label: 'Narrations demandées', icon: Headphones },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
];

function AdminNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 bg-paper-deep text-white">
      <div className="p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-grenadine rounded-pill flex items-center justify-center text-white font-bold">
            {user?.displayName?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{user?.displayName}</p>
            <p className="text-meta text-ink-40 truncate">Admin · Modération</p>
          </div>
        </div>

        <nav aria-label="Administration" className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin/moderation' && pathname.startsWith(item.href));
            const isQueueActive = item.href === '/admin/moderation' && pathname.startsWith('/admin/moderation') && !pathname.startsWith('/admin/moderation/history');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-body font-medium whitespace-nowrap ${
                  isActive || isQueueActive
                    ? 'bg-grenadine text-white'
                    : 'text-ink-20 hover:bg-paper-deep'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={signOut}
          className="hidden lg:block w-full mt-8 text-left text-body text-ink-40 hover:text-danger px-3 py-2"
        >
          Se déconnecter
        </button>
      </div>
    </aside>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard requireAdmin>
      <div className={`flex flex-col lg:flex-row min-h-[80vh] ${jetBrainsMono.variable}`}>
        <AdminNav />
        <div className="flex-1 p-4 lg:p-8 bg-paper-soft">{children}</div>
      </div>
    </AuthGuard>
  );
}
