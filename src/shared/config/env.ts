import { z } from 'zod';

const envSchema = z.object({
  /** API origin, without `/api/v1`. Android emulator → http://10.0.2.2:4000 */
  apiUrl: z.url().default('http://localhost:4000'),
  /** `mock` runs the app against an in-memory API (no backend needed). */
  apiMode: z.enum(['live', 'mock']).default('mock'),
  /** `dev` signs in with `dev:+91…` tokens (backend AUTH_ALLOW_DEV_TOKENS); `firebase` uses phone OTP. */
  authMode: z.enum(['firebase', 'dev']).default('dev'),
});

export type AppEnv = z.infer<typeof envSchema>;

/** Public build-time config (EXPO_PUBLIC_*). */
export const env: AppEnv = envSchema.parse({
  apiUrl: process.env.EXPO_PUBLIC_API_URL || undefined,
  apiMode: process.env.EXPO_PUBLIC_API_MODE || undefined,
  authMode: process.env.EXPO_PUBLIC_AUTH_MODE || undefined,
});
