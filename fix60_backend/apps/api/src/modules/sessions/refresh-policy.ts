export interface RefreshTokenState {
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
}

export type RefreshVerdict = 'valid' | 'expired' | 'revoked' | 'reused';

/**
 * Decides what a presented refresh token means. A token that was already rotated is being
 * replayed (stolen or a client bug), so the caller revokes its whole family.
 */
export function classifyRefreshToken(token: RefreshTokenState, now: Date): RefreshVerdict {
  if (token.revokedAt) {
    return 'revoked';
  }
  if (token.rotatedAt) {
    return 'reused';
  }
  if (token.expiresAt.getTime() <= now.getTime()) {
    return 'expired';
  }
  return 'valid';
}
