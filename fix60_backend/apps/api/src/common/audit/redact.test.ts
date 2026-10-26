import { describe, expect, it } from 'vitest';
import { maskEmail, maskPhone, redactForAudit } from './redact';

describe('redactForAudit', () => {
  it('removes secrets at any depth', () => {
    const result = redactForAudit({
      password: 'hunter2',
      nested: { refreshToken: 'abc', totpSecretEnc: 'x', storageKey: 'kyc/1.pdf' },
      list: [{ apiSecret: 's' }],
    });
    expect(result).toEqual({
      password: '[REDACTED]',
      nested: { refreshToken: '[REDACTED]', totpSecretEnc: '[REDACTED]', storageKey: '[REDACTED]' },
      list: [{ apiSecret: '[REDACTED]' }],
    });
  });

  it('masks phone numbers and emails', () => {
    const result = redactForAudit({
      phone: '+919876543210',
      whatsappPhone: '+919876500000',
      email: 'asha@example.com',
    });
    expect(result).toEqual({
      phone: '+91******3210',
      whatsappPhone: '+91******0000',
      email: 'a***@example.com',
    });
  });

  it('keeps ordinary fields and serialises dates', () => {
    const at = new Date('2026-10-24T10:00:00Z');
    expect(redactForAudit({ status: 'approved', at, count: 3, flag: false })).toEqual({
      status: 'approved',
      at: '2026-10-24T10:00:00.000Z',
      count: 3,
      flag: false,
    });
  });

  it('truncates long strings', () => {
    const result = redactForAudit({ note: 'x'.repeat(600) }) as { note: string };
    expect(result.note.length).toBe(501);
  });
});

describe('maskers', () => {
  it('handles short values', () => {
    expect(maskPhone('12345')).toBe('***');
    expect(maskEmail('nobody')).toBe('***');
  });
});
