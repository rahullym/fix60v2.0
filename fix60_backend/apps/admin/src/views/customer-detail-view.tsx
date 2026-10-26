'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { AdminCustomerDetail } from '@fix60/shared';
import { hasPermission, useAdminMe } from '@/entities/admin/use-admin-me';
import { AccountStatusBadge } from '@/entities/people/status-badges';
import { RecentBookings } from '@/entities/people/recent-bookings';
import { AccountActions } from '@/features/manage-account/account-actions';
import { api } from '@/shared/api/client';
import { formatDate, formatDateTime, humanize } from '@/shared/lib/format';
import { Badge, Card, DetailList, EmptyState, ErrorNotice, Loading, PageHeader, Stat } from '@/shared/ui/surfaces';

/** One customer: contact details, activity, consents and recent bookings. */
export function CustomerDetailView(): ReactNode {
  const { id } = useParams<{ id: string }>();
  const me = useAdminMe();
  const queryKey = ['admin-customer', id] as const;
  const customer = useQuery({ queryKey, queryFn: () => api<AdminCustomerDetail>('GET', `/admin/customers/${id}`) });

  return (
    <>
      <Link href="/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Customers
      </Link>
      {customer.isPending ? (
        <Loading />
      ) : customer.isError ? (
        <ErrorNotice error={customer.error} onRetry={() => void customer.refetch()} />
      ) : (
        <CustomerDetail
          customer={customer.data}
          canManage={hasPermission(me.data, 'customers.manage')}
          queryKeys={[queryKey, ['admin-customers']]}
        />
      )}
    </>
  );
}

function CustomerDetail({
  customer,
  canManage,
  queryKeys,
}: {
  customer: AdminCustomerDetail;
  canManage: boolean;
  queryKeys: readonly (readonly unknown[])[];
}): ReactNode {
  return (
    <>
      <PageHeader
        title={customer.fullName}
        description={`Customer since ${formatDate(customer.createdAt)}`}
        actions={
          canManage ? (
            <AccountActions
              path={`/admin/customers/${customer.id}`}
              queryKeys={queryKeys}
              kindLabel="customer"
              fullName={customer.fullName}
              email={customer.email}
              accountStatus={customer.status}
            />
          ) : undefined
        }
      />
      {customer.status === 'suspended' ? (
        <div role="status" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Suspended {formatDateTime(customer.suspendedAt)}
          {customer.suspensionReason ? ` — ${customer.suspensionReason}` : ''}
        </div>
      ) : null}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Status" value={<AccountStatusBadge status={customer.status} />} />
        <Stat label="Requests" value={customer.requestCount} />
        <Stat label="Bookings" value={customer.bookingCount} />
        <Stat label="Completed" value={customer.completedBookingCount} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-heading font-semibold">Contact &amp; profile</h2>
          <DetailList
            items={[
              { label: 'Phone', value: customer.phone },
              { label: 'WhatsApp', value: customer.whatsappPhone },
              { label: 'Email', value: customer.email },
              { label: 'Language', value: customer.preferredLocale === 'ml' ? 'Malayalam' : 'English' },
              { label: 'District', value: customer.district },
              { label: 'Locality', value: customer.locality },
              { label: 'Gender', value: customer.gender ? humanize(customer.gender) : null },
              { label: 'Date of birth', value: customer.dateOfBirth ? formatDate(customer.dateOfBirth) : null },
              { label: 'Last sign-in', value: formatDateTime(customer.lastLoginAt) },
            ]}
          />
        </Card>
        <Card>
          <h2 className="mb-4 font-heading font-semibold">Consents</h2>
          {customer.consents.length === 0 ? (
            <EmptyState title="No consents recorded" />
          ) : (
            <ul className="flex flex-col gap-2.5 text-sm">
              {customer.consents.map((consent) => (
                <li key={consent.type} className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-foreground">{humanize(consent.type)}</p>
                    <p className="text-xs text-muted">v{consent.policyVersion} · {formatDate(consent.at)}</p>
                  </div>
                  <Badge tone={consent.isGranted ? 'success' : 'neutral'}>{consent.isGranted ? 'Granted' : 'Withdrawn'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card className="mt-4">
        <h2 className="mb-4 font-heading font-semibold">Recent bookings</h2>
        <RecentBookings bookings={customer.recentBookings} counterpartLabel="Provider" />
      </Card>
    </>
  );
}
