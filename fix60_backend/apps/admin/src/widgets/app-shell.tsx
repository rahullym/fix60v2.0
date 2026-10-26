'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { HardHat, KeyRound, LayoutDashboard, LogOut, ScrollText, ShieldCheck, UserRound, Users } from 'lucide-react';
import type { AdminPermission } from '@fix60/shared';
import { hasPermission, useAdminMe } from '@/entities/admin/use-admin-me';
import { authCall } from '@/shared/api/client';
import { cn } from '@/shared/lib/cn';
import { ErrorNotice, Loading } from '@/shared/ui/surfaces';

const nav: { href: string; label: string; icon: typeof Users; permission?: AdminPermission }[] = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: UserRound, permission: 'customers.read' },
  { href: '/providers', label: 'Providers', icon: HardHat, permission: 'providers.read' },
  { href: '/admins', label: 'Admin users', icon: Users, permission: 'admins.manage' },
  { href: '/roles', label: 'Roles & permissions', icon: ShieldCheck, permission: 'admins.manage' },
  { href: '/audit-logs', label: 'Audit log', icon: ScrollText, permission: 'audit.read' },
  { href: '/account', label: 'Account', icon: KeyRound },
];

async function signOut(): Promise<void> {
  await authCall('/logout').catch(() => undefined);
  window.location.assign('/login');
}

/** Sidebar + top bar. Links are filtered by permission; the API still enforces every call. */
export function AppShell({ children }: { children: ReactNode }): ReactNode {
  const pathname = usePathname();
  const me = useAdminMe();
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-rail-deep text-white md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex size-8 items-center justify-center rounded-md bg-accent font-heading text-sm font-bold">60</div>
          <span className="font-heading font-semibold">Fix60 Admin</span>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 px-3">
          {nav
            .filter((item) => !item.permission || hasPermission(me.data, item.permission))
            .map(({ href, label, icon: Icon }) => {
              const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white',
                    isActive && 'bg-white/10 font-medium text-white',
                  )}>
                  <Icon className="size-4" aria-hidden />
                  {label}
                </Link>
              );
            })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-white/60">
          {me.data ? (
            <>
              <p className="truncate font-medium text-white">{me.data.fullName}</p>
              <p className="truncate">{me.data.email}</p>
            </>
          ) : null}
          <button type="button" onClick={signOut} className="mt-3 flex items-center gap-2 text-white/80 hover:text-white">
            <LogOut className="size-3.5" aria-hidden /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 bg-surface-fog">
        <div className="mx-auto max-w-6xl px-6 py-8">
          {me.isPending ? <Loading /> : me.isError ? <ErrorNotice error={me.error} onRetry={() => void me.refetch()} /> : children}
        </div>
      </main>
    </div>
  );
}
