import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeWkbPoint, geographyPoint, uuidv7 } from '@fix60/db';
import { apiEnvSchema, indianMobileSchema, registerRequestSchema } from '@fix60/shared';
import {
  resolveLocalPath,
  signLocalFile,
  verifyLocalFileSignature,
} from './integrations/storage/local-storage';

describe('indianMobileSchema', () => {
  it('normalises 10-digit and E.164 input', () => {
    expect(indianMobileSchema.parse('98765 43210')).toBe('+919876543210');
    expect(indianMobileSchema.parse('+919876543210')).toBe('+919876543210');
  });

  it('rejects non-mobile numbers', () => {
    expect(indianMobileSchema.safeParse('1234567890').success).toBe(false);
    expect(indianMobileSchema.safeParse('+14155550123').success).toBe(false);
  });
});

describe('registerRequestSchema', () => {
  const base = {
    idToken: 'dev:+919876543210',
    fullName: 'Asha Menon',
    consents: {
      terms: true,
      privacy: true,
      safetyPolicy: true,
      serviceCommunications: false,
      whatsappUpdates: false,
    },
  };

  it('requires terms, privacy and safety acceptance', () => {
    const result = registerRequestSchema.safeParse({
      ...base,
      role: 'customer',
      consents: { ...base.consents, terms: false },
    });
    expect(result.success).toBe(false);
  });

  it('requires providers to give a birth date and confirm adulthood', () => {
    expect(registerRequestSchema.safeParse({ ...base, role: 'provider' }).success).toBe(false);
    expect(
      registerRequestSchema.safeParse({
        ...base,
        role: 'provider',
        dateOfBirth: '1990-01-01',
        confirmsAdult: true,
      }).success,
    ).toBe(true);
  });
});

describe('apiEnvSchema production guards', () => {
  const env = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://x',
    JWT_SECRET: 'x'.repeat(40),
    ADMIN_TOTP_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
    FIREBASE_PROJECT_ID: 'fix60',
  };

  it('accepts a minimal production config', () => {
    expect(apiEnvSchema.safeParse(env).success).toBe(true);
  });

  it('refuses dev tokens or disabled TOTP in production', () => {
    expect(apiEnvSchema.safeParse({ ...env, AUTH_ALLOW_DEV_TOKENS: 'true' }).success).toBe(false);
    expect(apiEnvSchema.safeParse({ ...env, ADMIN_TOTP_REQUIRED: 'false' }).success).toBe(false);
  });
});

describe('db column helpers', () => {
  it('generates time-ordered v7 UUIDs', () => {
    const first = uuidv7(1_700_000_000_000);
    const second = uuidv7(1_700_000_000_001);
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first < second).toBe(true);
  });

  it('decodes PostGIS EWKB points', () => {
    // Captured from PostGIS: encode(ST_AsEWKB('SRID=4326;POINT(76.2999 9.9816)'::geography::geometry), 'hex')
    const hex = '0101000020e61000008104c58f31135340d881734694f62340';
    const point = decodeWkbPoint(hex);
    expect(point.lng).toBeCloseTo(76.2999, 4);
    expect(point.lat).toBeCloseTo(9.9816, 4);
  });

  it('writes points as EWKT', () => {
    expect(geographyPoint('p').config).toBeDefined();
  });
});

describe('local storage signing', () => {
  const now = 1_800_000_000_000;
  const expiresAt = now / 1000 + 60;

  it('verifies its own signature until expiry', () => {
    const signature = signLocalFile('secret', 'read', 'kyc/a.pdf', expiresAt);
    expect(verifyLocalFileSignature('secret', 'read', 'kyc/a.pdf', expiresAt, signature, now)).toBe(
      true,
    );
    expect(
      verifyLocalFileSignature(
        'secret',
        'read',
        'kyc/a.pdf',
        expiresAt,
        signature,
        (expiresAt + 1) * 1000,
      ),
    ).toBe(false);
  });

  it('binds the signature to action and key', () => {
    const signature = signLocalFile('secret', 'read', 'kyc/a.pdf', expiresAt);
    expect(
      verifyLocalFileSignature('secret', 'write', 'kyc/a.pdf', expiresAt, signature, now),
    ).toBe(false);
    expect(verifyLocalFileSignature('secret', 'read', 'kyc/b.pdf', expiresAt, signature, now)).toBe(
      false,
    );
  });

  it('rejects path traversal', () => {
    expect(() => resolveLocalPath('uploads', '../etc/passwd')).toThrow();
    expect(resolveLocalPath('uploads', 'kyc/a.pdf')).toBe(
      path.resolve(process.cwd(), 'uploads', 'kyc/a.pdf'),
    );
  });
});
