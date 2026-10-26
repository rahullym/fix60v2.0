/** JWT `aud` values. Each token type is only accepted where its audience is expected. */
export const TOKEN_AUDIENCE = {
  user: 'fix60-app',
  admin: 'fix60-admin',
  adminChallenge: 'fix60-admin-challenge',
} as const;
