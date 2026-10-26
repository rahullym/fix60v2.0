export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export interface LockoutState {
  failedLoginCount: number;
  lockedUntil: Date | null;
}

export function isLocked(state: LockoutState, now: Date): boolean {
  return state.lockedUntil !== null && state.lockedUntil.getTime() > now.getTime();
}

/** Next state after a failed password or TOTP attempt. The counter resets when a lock starts. */
export function afterFailedAttempt(state: LockoutState, now: Date): LockoutState {
  const failedLoginCount = state.failedLoginCount + 1;
  if (failedLoginCount >= MAX_FAILED_ATTEMPTS) {
    return { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + LOCKOUT_MINUTES * 60_000) };
  }
  return { failedLoginCount, lockedUntil: state.lockedUntil };
}
