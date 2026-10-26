import type { ProviderStatus, UserStatus } from '@fix60/shared';

/** Only an active account can be suspended. Deleted or pending-deletion accounts are left alone. */
export function canSuspend(status: UserStatus): boolean {
  return status === 'active';
}

/** Only a suspended account can be reactivated. */
export function canReactivate(status: UserStatus): boolean {
  return status === 'suspended';
}

/** A reactivated provider goes back to where they were: active if ever approved, otherwise onboarding. */
export function providerStatusAfterReactivation(approvedAt: Date | null): ProviderStatus {
  return approvedAt ? 'active' : 'onboarding';
}
