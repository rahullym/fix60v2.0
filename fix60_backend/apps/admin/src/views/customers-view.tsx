'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import type { AdminCustomerSummary, Paged, UserStatus } from '@fix60/shared';
import { AccountStatusBadge } from '@/entities/people/status-badges';
import { api } from '@/shared/api/client';
import { formatDateTime } from '@/shared/lib/format';
import { Input, Select } from '@/shared/ui/form';
import { Card, EmptyState, ErrorNotice, Loading, PageHeader, Pagination, Table, Td, Th } from '@/shared/ui/surfaces';

const PAGE_SIZE = 20;

/** Customers: search by name, phone or email, filter by status. */
export function CustomersView(): ReactNode {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<UserStatus | ''>('');
  const customers = useQuery({
    queryKey: ['admin-customers', page, q, status],
    queryFn: () =>
      api<Paged<AdminCustomerSummary>>('GET', '/admin/customers', {
        query: { page, pageSize: PAGE_SIZE, q: q.trim(), status },
      }),
  });

  return (
    <>
      <PageHeader title="Customers" description="People who book services through the app." />
      <Card>
        <div className="mb-4 flex flex-wrap gap-3">
          <Input
            type="search"
            placeholder="Search name, phone or email"
            aria-label="Search customers"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            className="max-w-xs"
          />
          <Select
            aria-label="Filter by status"
            value={status}
            onChange={(e) => { setStatus(e.target.value as UserStatus | ''); setPage(1); }}
            className="max-w-48">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending_deletion">Pending deletion</option>
          </Select>
        </div>
        {customers.isPending ? (
          <Loading />
        ) : customers.isError ? (
          <ErrorNotice error={customers.error} onRetry={() => void customers.refetch()} />
        ) : customers.data.items.length === 0 ? (
          <EmptyState title="No customers found" body={q || status ? 'Try a different search or filter.' : 'Customers appear here after they sign up in the app.'} />
        ) : (
          <>
            <Table>
              <thead><tr><Th>Customer</Th><Th>Phone</Th><Th>District</Th><Th>Bookings</Th><Th>Status</Th><Th>Joined</Th></tr></thead>
              <tbody>
                {customers.data.items.map((customer) => (
                  <tr key={customer.id} className="hover:bg-surface-fog">
                    <Td>
                      <Link href={`/customers/${customer.id}`} className="font-medium text-foreground hover:underline">{customer.fullName}</Link>
                      {customer.email ? <p className="text-xs text-muted">{customer.email}</p> : null}
                    </Td>
                    <Td className="whitespace-nowrap">{customer.phone ?? '—'}</Td>
                    <Td>{customer.district ?? '—'}</Td>
                    <Td>{customer.bookingCount}</Td>
                    <Td><AccountStatusBadge status={customer.status} /></Td>
                    <Td className="whitespace-nowrap text-muted">{formatDateTime(customer.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={customers.data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
