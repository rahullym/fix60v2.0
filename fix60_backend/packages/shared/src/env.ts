import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false', '1', '0'])
  .default('false')
  .transform((value) => value === 'true' || value === '1');

/** 32 random bytes, base64-encoded (`openssl rand -base64 32`). */
const base64Key32 = z
  .string()
  .regex(/^[A-Za-z0-9+/]{43}=$/, 'Must be 32 random bytes, base64-encoded');

/** Environment contract for apps/api. */
export const apiEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    API_PORT: z.coerce.number().int().default(4000),
    API_PUBLIC_URL: z.url().default('http://localhost:4000'),
    DATABASE_URL: z.string().min(1),
    /** Comma-separated origins for the public site and admin panel. */
    CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:3001'),
    /** Set when running behind a load balancer so client IPs come from X-Forwarded-For. */
    TRUST_PROXY: booleanString,

    JWT_SECRET: z.string().min(32),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(60),
    ADMIN_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    ADMIN_REFRESH_TOKEN_TTL_HOURS: z.coerce.number().int().positive().default(12),
    /** Encrypts admin TOTP secrets at rest (AES-256-GCM). */
    ADMIN_TOTP_ENCRYPTION_KEY: base64Key32,
    /** When false, admins may sign in with a password only. Never false in production. */
    ADMIN_TOTP_REQUIRED: booleanString.default(true),

    FIREBASE_PROJECT_ID: z.string().optional(),
    /** Base64-encoded service-account JSON; required for FCM pushes. */
    FIREBASE_SERVICE_ACCOUNT_BASE64: z.string().optional(),
    /** Require a valid `X-Firebase-AppCheck` header on sign-in endpoints. */
    FIREBASE_APP_CHECK_ENFORCED: booleanString,
    /** Accept `dev:<phone>` in place of a Firebase ID token. Never allowed in production. */
    AUTH_ALLOW_DEV_TOKENS: booleanString,

    STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_DIR: z.string().default('uploads'),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().default('ap-south-1'),
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    S3_FORCE_PATH_STYLE: booleanString,

    PUSH_PROVIDER: z.enum(['fcm', 'log']).default('log'),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (env.AUTH_ALLOW_DEV_TOKENS) {
        ctx.addIssue({
          code: 'custom',
          path: ['AUTH_ALLOW_DEV_TOKENS'],
          message: 'Not allowed in production',
        });
      }
      if (!env.ADMIN_TOTP_REQUIRED) {
        ctx.addIssue({
          code: 'custom',
          path: ['ADMIN_TOTP_REQUIRED'],
          message: 'Must be true in production',
        });
      }
    }
    if (env.STORAGE_PROVIDER === 's3') {
      for (const key of ['S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: 'custom',
            path: [key],
            message: 'Required when STORAGE_PROVIDER=s3',
          });
        }
      }
    }
    if (env.PUSH_PROVIDER === 'fcm' && !env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      ctx.addIssue({
        code: 'custom',
        path: ['FIREBASE_SERVICE_ACCOUNT_BASE64'],
        message: 'Required when PUSH_PROVIDER=fcm',
      });
    }
    if (env.FIREBASE_APP_CHECK_ENFORCED && !env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      ctx.addIssue({
        code: 'custom',
        path: ['FIREBASE_SERVICE_ACCOUNT_BASE64'],
        message: 'Required when FIREBASE_APP_CHECK_ENFORCED=true',
      });
    }
    if (
      !env.AUTH_ALLOW_DEV_TOKENS &&
      !env.FIREBASE_PROJECT_ID &&
      !env.FIREBASE_SERVICE_ACCOUNT_BASE64
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['FIREBASE_PROJECT_ID'],
        message: 'Firebase project is required to verify phone sign-in',
      });
    }
  });
export type ApiEnv = z.infer<typeof apiEnvSchema>;

/** Public environment contract for the Next.js apps. */
export const webPublicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url().default('http://localhost:4000'),
});
export type WebPublicEnv = z.infer<typeof webPublicEnvSchema>;
