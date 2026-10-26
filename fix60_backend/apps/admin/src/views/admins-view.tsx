'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Plus } from 'lucide-react';
import type { AdminRole, AdminUser, ItemList, Paged } from '@fix60/shared';
import { api } from '@/shared/api/client';
import { fieldErrors } from '@/shared/lib/error-copy';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Checkbox, Field, Input, Select } from '@/shared/ui/form';
import { Badge, Card, Dialog, EmptyState, ErrorNotice, Loading, PageHeader, Pagination, Table, Td, Th } from '@/shared/ui/surfaces';

const PAGE_SIZE = 20;

type Editing = { mode: 'create' } | { mode: 'edit'; admin: AdminUser } | null;

function AdminDialog({ editing, roles, onClose }: { editing: Editing; roles: AdminRole[]; onClose: () => void }): ReactNode {
  const queryClient = useQueryClient();
  const existing = editing?.mode === 'edit' ? editing.admin : null;
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState(existing?.fullName ?? '');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<AdminUser['status']>(existing?.status ?? 'active');
  const [roleIds, setRoleIds] = useState<string[]>(existing?.roles.map((role) => role.id) ?? []);
  const [resetTotp, setResetTotp] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      existing
        ? api<AdminUser>('PATCH', `/admin/admin-users/${existing.id}`, {
            body: { fullName, status, roleIds, ...(resetTotp ? { resetTotp: true } : {}) },
          })
        : api<AdminUser>('POST', '/admin/admin-users', { body: { email, fullName, password, roleIds } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      onClose();
    },
  });
  const errors = fieldErrors(save.error);
  const toggleRole = (id: string, isOn: boolean) =>
    setRoleIds((current) => (isOn ? [...current, id] : current.filter((roleId) => roleId !== id)));

  return (
    <Dialog
      isOpen={editing !== null}
      onClose={onClose}
      title={existing ? `Edit ${existing.fullName}` : 'Add admin'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button isLoading={save.isPending} disabled={roleIds.length === 0} onClick={() => save.mutate()}>
            {existing ? 'Save changes' : 'Create admin'}
          </Button>
        </>
      }>
      <div className="flex flex-col gap-4">
        {!existing ? (
          <Field label="Work email" error={errors.email}>
            {(props) => <Input {...props} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
        ) : null}
        <Field label="Full name" error={errors.fullName}>
          {(props) => <Input {...props} value={fullName} onChange={(e) => setFullName(e.target.value)} />}
        </Field>
        {!existing ? (
          <Field label="Temporary password" hint="12+ characters with upper and lower case and a number. Share it securely." error={errors.password}>
            {(props) => <Input {...props} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
          </Field>
        ) : (
          <Field label="Status">
            {(props) => (
              <Select {...props} value={status} onChange={(e) => setStatus(e.target.value as AdminUser['status'])}>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </Select>
            )}
          </Field>
        )}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Roles</legend>
          {roles.map((role) => (
            <Checkbox
              key={role.id}
              label={role.name}
              description={role.description ?? undefined}
              checked={roleIds.includes(role.id)}
              onChange={(isOn) => toggleRole(role.id, isOn)}
            />
          ))}
        </fieldset>
        {existing ? (
          <Checkbox
            label="Reset two-factor authentication"
            description="They will set up a new authenticator on next sign-in."
            checked={resetTotp}
            onChange={setResetTotp}
          />
        ) : null}
        {save.error ? <ErrorNotice error={save.error} /> : null}
      </div>
    </Dialog>
  );
}

/** Admin users: list, search, create, edit. */
export function AdminsView(): ReactNode {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Editing>(null);
  const admins = useQuery({
    queryKey: ['admin-users', page, q],
    queryFn: () => api<Paged<AdminUser>>('GET', '/admin/admin-users', { query: { page, pageSize: PAGE_SIZE, q } }),
  });
  const roles = useQuery({ queryKey: ['admin-roles'], queryFn: () => api<ItemList<AdminRole>>('GET', '/admin/roles') });

  return (
    <>
      <PageHeader
        title="Admin users"
        description="People who can sign in to this console."
        actions={<Button onClick={() => setEditing({ mode: 'create' })}><Plus className="size-4" aria-hidden />Add admin</Button>}
      />
      <Card>
        <Input
          type="search"
          placeholder="Search name or email"
          aria-label="Search admins"
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          className="mb-4 max-w-xs"
        />
        {admins.isPending ? (
          <Loading />
        ) : admins.isError ? (
          <ErrorNotice error={admins.error} onRetry={() => void admins.refetch()} />
        ) : admins.data.items.length === 0 ? (
          <EmptyState title="No admins found" />
        ) : (
          <>
            <Table>
              <thead><tr><Th>Name</Th><Th>Roles</Th><Th>Status</Th><Th>2FA</Th><Th>Last sign-in</Th><Th /></tr></thead>
              <tbody>
                {admins.data.items.map((admin) => (
                  <tr key={admin.id}>
                    <Td><p className="font-medium">{admin.fullName}</p><p className="text-xs text-muted">{admin.email}</p></Td>
                    <Td><div className="flex flex-wrap gap-1">{admin.roles.map((role) => <Badge key={role.id}>{role.name}</Badge>)}</div></Td>
                    <Td><Badge tone={admin.status === 'active' ? 'success' : 'neutral'}>{admin.status === 'active' ? 'Active' : 'Disabled'}</Badge></Td>
                    <Td>{admin.isTotpEnabled ? <Badge tone="success">On</Badge> : <Badge tone="warning">Not set up</Badge>}</Td>
                    <Td className="text-muted">{formatDateTime(admin.lastLoginAt)}</Td>
                    <Td className="text-right"><Button size="sm" variant="secondary" onClick={() => setEditing({ mode: 'edit', admin })}>Edit</Button></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={admins.data.total} onPage={setPage} />
          </>
        )}
      </Card>
      {editing ? (
        <AdminDialog
          key={editing.mode === 'edit' ? editing.admin.id : 'new'}
          editing={editing}
          roles={roles.data?.items ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
