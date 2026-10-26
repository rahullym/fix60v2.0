import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  API_URL: z.url().default('http://localhost:4000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

/** Server-only environment. The browser never sees the API origin or tokens. */
export const serverEnv = serverEnvSchema.parse({
  API_URL: process.env.API_URL || undefined,
  NODE_ENV: process.env.NODE_ENV,
});
