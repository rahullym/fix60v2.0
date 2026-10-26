import type { ReactNode } from 'react';
import type { ProviderStatus, UserStatus } from '@fix60/shared';
import { humanize } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/surfaces';

const accountTones: Record<UserStatus, 'success' | 'danger' | 'warning' | 'neutral'> = {
  active: 'success',
  suspended: 'danger',
  pending_deletion: 'warning',
  deleted: 'neutral',
};

/** Sign-in status of a customer or provider account. */
export function AccountStatusBadge({ status }: { status: UserStatus }): ReactNode {
  return <Badge tone={accountTones[status]}>{humanize(status)}</Badge>;
}

const providerTones: Record<ProviderStatus, 'success' | 'danger' | 'accent'> = {
  active: 'success',
  suspended: 'danger',
  onboarding: 'accent',
};

/** Where a provider is in their lifecycle. */
export function ProviderStatusBadge({ status }: { status: ProviderStatus }): ReactNode {
  return <Badge tone={providerTones[status]}>{humanize(status)}</Badge>;
}

const reviewTones: Record<string, 'success' | 'danger' | 'warning' | 'neutral' | 'accent'> = {
  approved: 'success',
  verified: 'success',
  pending: 'warning',
  submitted: 'accent',
  under_review: 'accent',
  info_required: 'warning',
  rejected: 'danger',
  suspended: 'danger',
  draft: 'neutral',
};

/** Review state of a service offer, document or application. */
export function ReviewStatusBadge({ status }: { status: string }): ReactNode {
  return <Badge tone={reviewTones[status] ?? 'neutral'}>{humanize(status)}</Badge>;
}
