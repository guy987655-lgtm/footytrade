'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  TrendingUp,
  Briefcase,
  ListOrdered,
  Users,
  Shield,
  LogIn,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { formatCredits } from '@/lib/utils';
import Badge from '@/components/ui/Badge';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/market', label: 'Market', icon: TrendingUp },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/orders', label: 'Orders', icon: ListOrdered },
  { href: '/referrals', label: 'Referrals', icon: Users },
];

export default function Navbar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const allItems = user?.role === 'ADMIN'
    ? [...navItems, { href: '/admin', label: 'Admin', icon: Shield }]
    : navItems;

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex flex-col gap-6 p-6">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚽</span>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-xl font-bold text-transparent">
              FootyTrade
            </span>
          </Link>

          {/* User credits */}
          {user && (
            <div className="flex items-center gap-2">
              <Badge variant="accent">
                {formatCredits(user.credits)} credits
              </Badge>
            </div>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {allItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive(href)
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted hover:bg-card-hover hover:text-foreground'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        {/* Auth button */}
        <div className="border-t border-border p-4">
          {user ? (
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-card-hover hover:text-foreground"
            >
              <LogOut size={18} />
              Logout
            </button>
          ) : (
            <Link
              href="/"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-card-hover hover:text-foreground"
            >
              <LogIn size={18} />
              Login
            </Link>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <main className="min-h-screen pb-20 md:pb-0 md:pl-64">
        <div className="mx-auto max-w-7xl p-4 md:p-6">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card md:hidden">
        {allItems.slice(0, 5).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
              isActive(href) ? 'text-primary' : 'text-muted'
            }`}
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
