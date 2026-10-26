'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import type { UserStatus } from '@fix60/shared';
import { api } from '@/shared/api/client';
import { fieldErrors } from '@/shared/lib/error-copy';
import { Button } from '@/shared/ui/button';
import { Field, Input } from '@/shared/ui/form';
import { Dialog, ErrorNotice } from '@/shared/ui/surfaces';

type Open = 'edit' | 'suspend' | 'reactivate' | null;

export interface AccountActionsProps {
  /** API path of the record, e.g. `/admin/customers/<id>`. */
  path: string;
  /** Query keys refreshed after a change. */
  queryKeys: readonly (readonly unknown[])[];
  kindLabel: 'customer' | 'provider';
  fullName: string;
  email: string | null;
  accountStatus: UserStatus;
}

/** Edit contact details, suspend or reactivate a customer or provider. Every change is audit-logged by the API. */
export function AccountActions({ path, queryKeys, kindLabel, fullName, email, accountStatus }: AccountActionsProps): ReactNode {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<Open>(null);
  const [name, setName] = useState(fullName);
  const [emailValue, setEmailValue] = useState(email ?? '');
  const [reason, setReason] = useState('');

  const close = (): void => {
    setOpen(null);
    action.reset();
  };
  const action = useMutation({
    mutationFn: (kind: Exclude<Open, null>) => {
      if (kind === 'edit') {
        const trimmed = emailValue.trim();
        return api('PATCH', path, { body: { fullName: name, email: trimmed === '' ? null : trimmed } });
      }
      if (kind === 'suspend') {
        return api('POST', `${path}/suspend`, { body: { reason } });
      }
      return api('POST', `${path}/reactivate`);
    },
    onSuccess: async () => {
      await Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
      setReason('');
      setOpen(null);
    },
  });
  const errors = fieldErrors(action.error);

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          setName(fullName);
          setEmailValue(email ?? '');
          setOpen('edit');
        }}>
        Edit details
      </Button>
      {accountStatus === 'active' ? (
        <Button variant="destructive" onClick={() => setOpen('suspend')}>Suspend</Button>
      ) : accountStatus === 'suspended' ? (
        <Button onClick={() => setOpen('reactivate')}>Reactivate</Button>
      ) : null}

      <Dialog
        isOpen={open === 'edit'}
        onClose={close}
        title={`Edit ${kindLabel} details`}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button isLoading={action.isPending} onClick={() => action.mutate('edit')}>Save changes</Button>
          </>
        }>
        <div className="flex flex-col gap-4">
          <Field label="Full name" error={errors.fullName}>
            {(props) => <Input {...props} value={name} onChange={(e) => setName(e.target.value)} />}
          </Field>
          <Field label="Email" hint="Optional. The phone number is verified by OTP and can't be changed here." error={errors.email}>
            {(props) => <Input {...props} type="email" value={emailValue} onChange={(e) => setEmailValue(e.target.value)} />}
          </Field>
          {action.error ? <ErrorNotice error={action.error} /> : null}
        </div>
      </Dialog>

      <Dialog
        isOpen={open === 'suspend'}
        onClose={close}
        title={`Suspend ${fullName}?`}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button variant="destructive" isLoading={action.isPending} disabled={reason.trim().length < 3} onClick={() => action.mutate('suspend')}>
              Suspend {kindLabel}
            </Button>
          </>
        }>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            They are signed out of the app straight away and can&apos;t sign in again until reactivated.
            {kindLabel === 'provider' ? ' They also stop appearing in search and matching.' : ''}
          </p>
          <Field label="Reason" hint="Kept on the account and in the audit log." error={errors.reason}>
            {(props) => <Input {...props} value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />}
          </Field>
          {action.error ? <ErrorNotice error={action.error} /> : null}
        </div>
      </Dialog>

      <Dialog
        isOpen={open === 'reactivate'}
        onClose={close}
        title={`Reactivate ${fullName}?`}
        footer={
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button isLoading={action.isPending} onClick={() => action.mutate('reactivate')}>Reactivate</Button>
          </>
        }>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            They can sign in again.
            {kindLabel === 'provider' ? ' If they were approved before, they return to search and matching.' : ''}
          </p>
          {action.error ? <ErrorNotice error={action.error} /> : null}
        </div>
      </Dialog>
    </>
  );
}
