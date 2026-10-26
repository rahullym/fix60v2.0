'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { Lock, Plus } from 'lucide-react';
import type { AdminPermission, AdminRole, ItemList } from '@fix60/shared';
import { api } from '@/shared/api/client';
import { fieldErrors } from '@/shared/lib/error-copy';
import { permissionLabel } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Checkbox, Field, Input } from '@/shared/ui/form';
import { Badge, Card, Dialog, ErrorNotice, Loading, PageHeader } from '@/shared/ui/surfaces';

type Editing = { mode: 'create' } | { mode: 'edit'; role: AdminRole } | null;

/** Groups "area.action" permissions by area for the matrix. */
function groupPermissions(permissions: AdminPermission[]): [string, AdminPermission[]][] {
  const groups = new Map<string, AdminPermission[]>();
  for (const permission of permissions) {
    const area = permission.split('.')[0] ?? permission;
    groups.set(area, [...(groups.get(area) ?? []), permission]);
  }
  return [...groups.entries()];
}

function RoleDialog({ editing, permissions, onClose }: { editing: Editing; permissions: AdminPermission[]; onClose: () => void }): ReactNode {
  const queryClient = useQueryClient();
  const existing = editing?.mode === 'edit' ? editing.role : null;
  const [slug, setSlug] = useState('');
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [selected, setSelected] = useState<AdminPermission[]>(existing?.permissions ?? []);
  const isLocked = Boolean(existing?.isSuper);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
  const save = useMutation({
    mutationFn: () =>
      existing
        ? api<AdminRole>('PATCH', `/admin/roles/${existing.id}`, { body: { name, description: description || undefined, permissions: selected } })
        : api<AdminRole>('POST', '/admin/roles', { body: { slug, name, description: description || undefined, permissions: selected } }),
    onSuccess: async () => { await invalidate(); onClose(); },
  });
  const remove = useMutation({
    mutationFn: () => api<void>('DELETE', `/admin/roles/${existing!.id}`),
    onSuccess: async () => { await invalidate(); onClose(); },
  });
  const errors = fieldErrors(save.error);
  const toggle = (permission: AdminPermission, isOn: boolean) =>
    setSelected((current) => (isOn ? [...current, permission] : current.filter((value) => value !== permission)));

  return (
    <Dialog
      isOpen={editing !== null}
      onClose={onClose}
      title={existing ? `Edit ${existing.name}` : 'New role'}
      footer={
        <>
          {existing && !existing.isSystem ? (
            <Button
              variant="destructive"
              className="mr-auto"
              isLoading={remove.isPending}
              onClick={() => { if (window.confirm(`Delete the ${existing.name} role?`)) remove.mutate(); }}>
              Delete role
            </Button>
          ) : null}
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button isLoading={save.isPending} disabled={isLocked || selected.length === 0} onClick={() => save.mutate()}>
            {existing ? 'Save changes' : 'Create role'}
          </Button>
        </>
      }>
      <div className="flex flex-col gap-4">
        {isLocked ? (
          <p className="flex items-center gap-2 rounded-md bg-surface-muted p-3 text-sm text-muted">
            <Lock className="size-4" aria-hidden /> Super Admin always has every permission and can&apos;t be edited.
          </p>
        ) : null}
        {!existing ? (
          <Field label="Key" hint="Lowercase letters, numbers and underscores, e.g. city_ops" error={errors.slug}>
            {(props) => <Input {...props} value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} />}
          </Field>
        ) : null}
        <Field label="Name" error={errors.name}>
          {(props) => <Input {...props} value={name} disabled={isLocked} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Description (optional)" error={errors.description}>
          {(props) => <Input {...props} value={description} disabled={isLocked} onChange={(e) => setDescription(e.target.value)} />}
        </Field>
        {!isLocked ? (
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Permissions ({selected.length})</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {groupPermissions(permissions).map(([area, items]) => (
                <div key={area} className="rounded-md border border-border p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{area}</p>
                  <div className="flex flex-col gap-1.5">
                    {items.map((permission) => (
                      <Checkbox
                        key={permission}
                        label={permissionLabel(permission).split(' · ')[1] ?? permission}
                        checked={selected.includes(permission)}
                        onChange={(isOn) => toggle(permission, isOn)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        ) : null}
        {save.error ? <ErrorNotice error={save.error} /> : null}
        {remove.error ? <ErrorNotice error={remove.error} /> : null}
      </div>
    </Dialog>
  );
}

/** Roles and their permission sets. System roles can be edited but not deleted. */
export function RolesView(): ReactNode {
  const [editing, setEditing] = useState<Editing>(null);
  const roles = useQuery({ queryKey: ['admin-roles'], queryFn: () => api<ItemList<AdminRole>>('GET', '/admin/roles') });
  const permissions = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => api<ItemList<AdminPermission>>('GET', '/admin/permissions'),
    staleTime: Infinity,
  });

  return (
    <>
      <PageHeader
        title="Roles & permissions"
        description="What each kind of admin can see and do."
        actions={<Button onClick={() => setEditing({ mode: 'create' })}><Plus className="size-4" aria-hidden />New role</Button>}
      />
      {roles.isPending ? (
        <Loading />
      ) : roles.isError ? (
        <ErrorNotice error={roles.error} onRetry={() => void roles.refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {roles.data.items.map((role) => (
            <Card key={role.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-heading font-semibold">{role.name}</h2>
                  <p className="text-xs text-muted">{role.slug}</p>
                </div>
                <div className="flex gap-1">
                  {role.isSuper ? <Badge tone="accent">All access</Badge> : null}
                  {role.isSystem ? <Badge>System</Badge> : null}
                </div>
              </div>
              {role.description ? <p className="mt-2 text-sm text-muted">{role.description}</p> : null}
              <p className="mt-3 text-sm">{role.isSuper ? 'Every permission' : `${role.permissions.length} permissions`}</p>
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => setEditing({ mode: 'edit', role })}>
                {role.isSuper ? 'View' : 'Edit'}
              </Button>
            </Card>
          ))}
        </div>
      )}
      {editing ? (
        <RoleDialog
          key={editing.mode === 'edit' ? editing.role.id : 'new'}
          editing={editing}
          permissions={permissions.data?.items ?? []}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}
