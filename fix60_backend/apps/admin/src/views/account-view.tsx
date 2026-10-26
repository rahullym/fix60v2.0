'use client';

import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useAdminMe } from '@/entities/admin/use-admin-me';
import { api } from '@/shared/api/client';
import { fieldErrors } from '@/shared/lib/error-copy';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/form';
import { Badge, Card, ErrorNotice, PageHeader } from '@/shared/ui/surfaces';

/** Profile summary and password change. */
export function AccountView(): ReactNode {
  const { data: me } = useAdminMe();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const change = useMutation({
    mutationFn: () => api<void>('POST', '/admin/auth/change-password', { body: { currentPassword, newPassword } }),
    onSuccess: () => { setCurrentPassword(''); setNewPassword(''); setConfirm(''); },
  });
  const errors = fieldErrors(change.error);
  const mismatch = confirm.length > 0 && confirm !== newPassword;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (!mismatch) {
      change.mutate();
    }
  };

  return (
    <>
      <PageHeader title="Account" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-heading font-semibold">Profile</h2>
          {me ? (
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted">Name</dt><dd>{me.fullName}</dd>
              <dt className="text-muted">Email</dt><dd>{me.email}</dd>
              <dt className="text-muted">Roles</dt>
              <dd className="flex flex-wrap gap-1">{me.roles.map((role) => <Badge key={role.slug}>{role.name}</Badge>)}</dd>
            </dl>
          ) : null}
        </Card>
        <Card>
          <h2 className="font-heading font-semibold">Change password</h2>
          <form onSubmit={submit} className="mt-3 flex flex-col gap-4" noValidate>
            <Field label="Current password" error={errors.currentPassword}>
              {(props) => <Input {...props} type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />}
            </Field>
            <Field label="New password" hint="12+ characters with upper and lower case and a number." error={errors.newPassword}>
              {(props) => <Input {...props} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />}
            </Field>
            <Field label="Confirm new password" error={mismatch ? "Passwords don't match." : null}>
              {(props) => <Input {...props} type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
            </Field>
            {change.error ? <ErrorNotice error={change.error} /> : null}
            {change.isSuccess ? <p role="status" className="text-sm text-success">Password changed.</p> : null}
            <Button type="submit" isLoading={change.isPending} disabled={!currentPassword || !newPassword || mismatch}>
              Update password
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
