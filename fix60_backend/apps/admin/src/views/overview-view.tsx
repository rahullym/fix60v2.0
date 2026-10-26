'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import { hasPermission, useAdminMe } from '@/entities/admin/use-admin-me';
import { permissionLabel } from '@/shared/lib/format';
import { Badge, Card, PageHeader } from '@/shared/ui/surfaces';

/** Modules from docs/plan/phase1-plan.md §8 whose APIs are not built yet. */
const upcoming = [
  { name: 'Catalog, questions & locations', milestone: 'M2' },
  { name: 'Provider applications & document verification', milestone: 'M3' },
  { name: 'Provider search & matching console', milestone: 'M4–M5' },
  { name: 'Requests & invitations', milestone: 'M5' },
  { name: 'Bookings, reviews, reports & blocks', milestone: 'M6' },
  { name: 'Notifications, WhatsApp & email', milestone: 'M7' },
  { name: 'CMS: banners, FAQs, policies', milestone: 'M2' },
];

/** Landing page: who you are, what you can do, what's coming. */
export function OverviewView(): ReactNode {
  const { data: me } = useAdminMe();
  if (!me) {
    return null;
  }
  return (
    <>
      <PageHeader title={`Welcome, ${me.fullName.split(' ')[0]}`} description="Fix60 operations console" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <h2 className="font-heading font-semibold">Your access</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {me.roles.map((role) => (
              <Badge key={role.slug} tone={me.isSuper ? 'accent' : 'neutral'}>
                {role.name}
              </Badge>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            {me.isSuper
              ? 'Super Admin: every permission, including admin users and roles.'
              : `${me.permissions.length} permissions`}
          </p>
          {!me.isSuper ? (
            <ul className="mt-2 grid grid-cols-2 gap-1 text-sm text-foreground">
              {me.permissions.map((permission) => (
                <li key={permission}>{permissionLabel(permission)}</li>
              ))}
            </ul>
          ) : null}
        </Card>
        <Card>
          <h2 className="font-heading font-semibold">Quick links</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {hasPermission(me, 'admins.manage') ? (
              <>
                <li><Link className="text-primary underline-offset-2 hover:underline" href="/admins">Invite an admin</Link></li>
                <li><Link className="text-primary underline-offset-2 hover:underline" href="/roles">Manage roles</Link></li>
              </>
            ) : null}
            {hasPermission(me, 'audit.read') ? (
              <li><Link className="text-primary underline-offset-2 hover:underline" href="/audit-logs">Review the audit log</Link></li>
            ) : null}
            <li><Link className="text-primary underline-offset-2 hover:underline" href="/account">Change your password</Link></li>
          </ul>
        </Card>
      </div>
      <Card className="mt-4">
        <h2 className="font-heading font-semibold">Coming next</h2>
        <p className="mt-1 text-sm text-muted">
          These screens appear as their backend milestones ship. No numbers are shown until real data exists.
        </p>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {upcoming.map((item) => (
            <li key={item.name} className="flex items-center justify-between rounded-md border border-border bg-surface-fog px-3 py-2 text-sm">
              <span className="flex items-center gap-2"><Clock className="size-3.5 text-muted" aria-hidden />{item.name}</span>
              <Badge>{item.milestone}</Badge>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
