'use client';

import { useQuery } from '@tanstack/react-query';
import { Fragment, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { AuditLogEntry, Paged } from '@fix60/shared';
import { api } from '@/shared/api/client';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/form';
import { Badge, Card, EmptyState, ErrorNotice, Loading, PageHeader, Pagination, Table, Td, Th } from '@/shared/ui/surfaces';

const PAGE_SIZE = 25;

/** Read-only, append-only audit trail with filters and diff view. */
export function AuditLogsView(): ReactNode {
  const [page, setPage] = useState(1);
  const [draft, setDraft] = useState({ action: '', entityType: '' });
  const [filters, setFilters] = useState(draft);
  const [expanded, setExpanded] = useState<string | null>(null);
  const logs = useQuery({
    queryKey: ['audit-logs', page, filters],
    queryFn: () => api<Paged<AuditLogEntry>>('GET', '/admin/audit-logs', { query: { page, pageSize: PAGE_SIZE, ...filters } }),
  });

  return (
    <>
      <PageHeader title="Audit log" description="Every admin change and security event, newest first." />
      <Card>
        <form
          className="mb-4 flex flex-wrap items-end gap-3"
          onSubmit={(event) => { event.preventDefault(); setFilters(draft); setPage(1); }}>
          <div className="w-56">
            <Field label="Action">
              {(props) => <Input {...props} placeholder="e.g. admin.login" value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value.trim() })} />}
            </Field>
          </div>
          <div className="w-56">
            <Field label="Entity type">
              {(props) => <Input {...props} placeholder="e.g. admin_user" value={draft.entityType} onChange={(e) => setDraft({ ...draft, entityType: e.target.value.trim() })} />}
            </Field>
          </div>
          <Button type="submit" variant="secondary">Apply</Button>
        </form>
        {logs.isPending ? (
          <Loading />
        ) : logs.isError ? (
          <ErrorNotice error={logs.error} onRetry={() => void logs.refetch()} />
        ) : logs.data.items.length === 0 ? (
          <EmptyState title="No events yet" body="Sign-ins and admin changes appear here." />
        ) : (
          <>
            <Table>
              <thead><tr><Th className="w-8" /><Th>When</Th><Th>Actor</Th><Th>Action</Th><Th>Entity</Th><Th>IP</Th></tr></thead>
              <tbody>
                {logs.data.items.map((entry) => {
                  const isOpen = expanded === entry.id;
                  return (
                    <Fragment key={entry.id}>
                      <tr>
                        <Td>
                          {entry.diff ? (
                            <button type="button" aria-label={isOpen ? 'Hide changes' : 'Show changes'} aria-expanded={isOpen} onClick={() => setExpanded(isOpen ? null : entry.id)} className="text-muted hover:text-foreground">
                              {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </button>
                          ) : null}
                        </Td>
                        <Td className="whitespace-nowrap text-muted">{formatDateTime(entry.createdAt)}</Td>
                        <Td><p>{entry.actorName ?? '—'}</p><Badge>{entry.actorType}</Badge></Td>
                        <Td className="font-mono text-xs">{entry.action}</Td>
                        <Td className="text-xs"><p>{entry.entityType}</p><p className="font-mono text-muted">{entry.entityId ?? ''}</p></Td>
                        <Td className="font-mono text-xs text-muted">{entry.ipAddress ?? '—'}</Td>
                      </tr>
                      {isOpen && entry.diff ? (
                        <tr>
                          <td colSpan={6} className="border-b border-border bg-surface-fog px-4 py-3">
                            <pre className="overflow-x-auto text-xs text-foreground">{JSON.stringify(entry.diff, null, 2)}</pre>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={logs.data.total} onPage={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
