'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import type { AdminProviderDetail } from '@fix60/shared';
import { hasPermission, useAdminMe } from '@/entities/admin/use-admin-me';
import { RecentBookings } from '@/entities/people/recent-bookings';
import { AccountStatusBadge, ProviderStatusBadge, ReviewStatusBadge } from '@/entities/people/status-badges';
import { AccountActions } from '@/features/manage-account/account-actions';
import { api } from '@/shared/api/client';
import { formatDate, formatDateTime, formatMoney, humanize } from '@/shared/lib/format';
import { Card, DetailList, EmptyState, ErrorNotice, Loading, PageHeader, Stat, Table, Td, Th } from '@/shared/ui/surfaces';

/** One provider: profile, services, verification, ratings and recent bookings. */
export function ProviderDetailView(): ReactNode {
  const { id } = useParams<{ id: string }>();
  const me = useAdminMe();
  const queryKey = ['admin-provider', id] as const;
  const provider = useQuery({ queryKey, queryFn: () => api<AdminProviderDetail>('GET', `/admin/providers/${id}`) });

  return (
    <>
      <Link href="/providers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> Providers
      </Link>
      {provider.isPending ? (
        <Loading />
      ) : provider.isError ? (
        <ErrorNotice error={provider.error} onRetry={() => void provider.refetch()} />
      ) : (
        <ProviderDetail
          provider={provider.data}
          canManage={hasPermission(me.data, 'providers.manage')}
          queryKeys={[queryKey, ['admin-providers']]}
        />
      )}
    </>
  );
}

function ProviderDetail({
  provider,
  canManage,
  queryKeys,
}: {
  provider: AdminProviderDetail;
  canManage: boolean;
  queryKeys: readonly (readonly unknown[])[];
}): ReactNode {
  return (
    <>
      <PageHeader
        title={provider.fullName}
        description={`${provider.code} · joined ${formatDate(provider.createdAt)}`}
        actions={
          canManage ? (
            <AccountActions
              path={`/admin/providers/${provider.id}`}
              queryKeys={queryKeys}
              kindLabel="provider"
              fullName={provider.fullName}
              email={provider.email}
              accountStatus={provider.accountStatus}
            />
          ) : undefined
        }
      />
      {provider.accountStatus === 'suspended' ? (
        <div role="status" className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Suspended {formatDateTime(provider.suspendedAt)}
          {provider.suspensionReason ? ` — ${provider.suspensionReason}` : ''}
        </div>
      ) : null}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Status" value={<span className="flex gap-1.5"><ProviderStatusBadge status={provider.status} /><AccountStatusBadge status={provider.accountStatus} /></span>} />
        <Stat
          label="Rating"
          value={
            provider.rating.average === null ? (
              <span className="text-base text-muted">No reviews</span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Star className="size-4 fill-warning text-warning" aria-hidden />
                {provider.rating.average}
                <span className="text-sm font-normal text-muted">({provider.rating.count})</span>
              </span>
            )
          }
        />
        <Stat label="Bookings" value={provider.bookingCount} />
        <Stat label="Completed" value={provider.completedBookingCount} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-heading font-semibold">Contact &amp; profile</h2>
          <DetailList
            items={[
              { label: 'Phone', value: provider.phone },
              { label: 'WhatsApp', value: provider.whatsappPhone },
              { label: 'Email', value: provider.email },
              { label: 'Gender', value: provider.gender ? humanize(provider.gender) : null },
              { label: 'Date of birth', value: provider.dateOfBirth ? formatDate(provider.dateOfBirth) : null },
              { label: 'Experience', value: provider.yearsExperience === null ? null : `${provider.yearsExperience} years` },
              { label: 'Languages', value: provider.languages.length > 0 ? provider.languages.join(', ') : null },
              { label: 'Travels to customers', value: provider.travelPreference ? humanize(provider.travelPreference) : null },
              { label: 'Max hours per day', value: provider.maxHoursPerDay },
              { label: 'Service areas', value: provider.serviceAreaCount },
              { label: 'Approved', value: formatDateTime(provider.approvedAt) },
              { label: 'Last sign-in', value: formatDateTime(provider.lastLoginAt) },
            ]}
          />
          {provider.bio ? (
            <>
              <h3 className="mb-1 mt-5 text-xs font-medium uppercase tracking-wide text-muted">About</h3>
              <p className="whitespace-pre-line text-sm text-foreground">{provider.bio}</p>
            </>
          ) : null}
        </Card>
        <Card>
          <h2 className="mb-4 font-heading font-semibold">Verification</h2>
          {provider.application ? (
            <div className="mb-4 flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-mono text-xs">{provider.application.code}</p>
                <p className="text-xs text-muted">
                  Step {provider.application.currentStep} of 9
                  {provider.application.submittedAt ? ` · submitted ${formatDate(provider.application.submittedAt)}` : ''}
                </p>
              </div>
              <ReviewStatusBadge status={provider.application.status} />
            </div>
          ) : (
            <p className="mb-4 text-sm text-muted">No application started.</p>
          )}
          {provider.documents.length === 0 ? (
            <p className="text-sm text-muted">No documents uploaded.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {provider.documents.map((document) => (
                <li key={document.id} className="flex items-center justify-between gap-3">
                  <span>{humanize(document.type)}</span>
                  <ReviewStatusBadge status={document.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <Card className="mt-4">
        <h2 className="mb-4 font-heading font-semibold">Services</h2>
        {provider.services.length === 0 ? (
          <EmptyState title="No services added" />
        ) : (
          <Table>
            <thead><tr><Th>Service</Th><Th>Experience</Th><Th>Hourly</Th><Th>Daily</Th><Th>Monthly</Th><Th>Status</Th></tr></thead>
            <tbody>
              {provider.services.map((service) => (
                <tr key={service.id}>
                  <Td className="font-medium">
                    {service.serviceName}
                    {service.isNegotiable ? <p className="text-xs font-normal text-muted">Rates negotiable</p> : null}
                  </Td>
                  <Td>{service.yearsExperience === null ? '—' : `${service.yearsExperience} yrs`}</Td>
                  <Td>{formatMoney(service.hourlyRate)}</Td>
                  <Td>{formatMoney(service.dailyRate)}</Td>
                  <Td>{formatMoney(service.monthlyRate)}</Td>
                  <Td><ReviewStatusBadge status={service.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <Card className="mt-4">
        <h2 className="mb-4 font-heading font-semibold">Recent bookings</h2>
        <RecentBookings bookings={provider.recentBookings} counterpartLabel="Customer" />
      </Card>
    </>
  );
}
