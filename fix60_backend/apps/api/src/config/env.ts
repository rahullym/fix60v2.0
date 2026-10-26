import { existsSync } from 'node:fs';
import path from 'node:path';
import { apiEnvSchema, type ApiEnv } from '@fix60/shared';

export const API_ENV = Symbol('API_ENV');

/** Loads `.env` (when present) and validates the environment contract. */
export function loadEnv(): ApiEnv {
  const envFile = path.resolve(process.cwd(), '.env');
  if (existsSync(envFile)) {
    process.loadEnvFile(envFile);
  }
  const parsed = apiEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${details}`);
  }
  return parsed.data;
}
