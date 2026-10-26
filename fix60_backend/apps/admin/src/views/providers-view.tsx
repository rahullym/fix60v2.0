'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import type { AdminProviderSummary, Paged, ProviderStatus } from '@fix60/shared';
import { AccountStatusBadge, ProviderStatusBadge } from '@/entities/people/status-badges';
import { api } from '@/shared/api/client';
import { formatDateTime } from '@/shared/lib/format';
import { Input, Select } from '@/shared/ui/form';
import { Card, EmptyState, ErrorNotice, Loading, PageHeader, Pagination, Table, Td, Th } from '@/shared/ui/surfaces';

const PAGE_SIZE = 20;

/** Providers: search by name, phone, email or code, filter by status. */
export function ProvidersView(): ReactNode {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ProviderStatus | ''>('');
  const providers = useQuery({
    queryKey: ['admin-providers', page, q, status],
    queryFn: () =>
      api<Paged<AdminProviderSummary>>('GET', '/admin/providers', {
        query: { page, pageSize: PAGE_SIZE, q: q.trim(), status },
      }),
  });

  return (
    <>
      <PageHeader title="Providers" description="People who offer services through the app." />
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            type="search"
            placeholder="Search name, phone, email or PRV code"
            aria-label="Search providers"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => { setStatus(e.target.value as ProviderStatus | ''); setPage(1); }}
            className="max-w-48">
            <option value="">All statuses</option>
            <option value="onboarding">Onboarding</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </Select>
        </div>
        {providers.isPending ? (
          <Loading />
        ) : providers.isError ? (
          <ErrorNotice error={providers.error} onRetry={() => void providers.refetch()} />
        ) : providers.data.items.length === 0 ? (
          <EmptyState title="No providers found" body={q || status ? 'Try a different search or filter.' : 'Providers appear here after they sign up in the app.'} />
        ) : (
          <>
            <Table>
              <thead><tr><Th>Provider</Th><Th>Phone</Th><Th>Services</Th><Th>Experience</Th><Th>Status</Th><Th>Account</Th><Th>Joined</Th></tr></thead>
              <tbody>
                {providers.data.items.map((provider) => (
                  <tr key={provider.id} className="hover:bg-surface-fog">
                    <Td>
                      <Link href={`/providers/${provider.id}`} className="font-medium text-foreground hover:underline">{provider.fullName}</Link>
                      <p className="text-xs text-muted">{provider.code}</p>
                    </Td>
                    <Td className="whitespace-nowrap">{provider.phone ?? '—'}</Td>
                    <Td className="whitespace-nowrap">
                      {provider.approvedServiceCount} approved
                      {provider.pendingServiceCount > 0 ? <span className="text-warning"> · {provider.pendingServiceCount} pending</span> : null}
                    </Td>
                    <Td>{provider.yearsExperience === null ? '—' : `${provider.yearsExperience} yrs`}</Td>
                    <Td><ProviderStatusBadge status={provider.status} /></Td>
                    <Td><AccountStatusBadge status={provider.accountStatus} /></Td>
                    <Td className="whitespace-nowrap text-muted">{formatDateTime(provider.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={providers.data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
