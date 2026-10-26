import { describe, expect, it } from 'vitest';
import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  hotp,
  totpStep,
  totpUri,
  verifyTotp,
} from './totp';

const rfcSecret = Buffer.from('12345678901234567890');

describe('hotp (RFC 4226 appendix D)', () => {
  it.each([
    [0, '755224'],
    [1, '287082'],
    [2, '359152'],
    [9, '520489'],
  ])('counter %i → %s', (counter, expected) => {
    expect(hotp(rfcSecret, counter)).toBe(expected);
  });
});

describe('verifyTotp', () => {
  const secret = base32Encode(rfcSecret);
  const now = 59_000;
  const step = totpStep(now);

  it('accepts the current code and returns its step', () => {
    expect(verifyTotp(secret, hotp(rfcSecret, step), now, null)).toBe(step);
  });

  it('tolerates one step of clock skew either way', () => {
    expect(verifyTotp(secret, hotp(rfcSecret, step - 1), now, null)).toBe(step - 1);
    expect(verifyTotp(secret, hotp(rfcSecret, step + 1), now, null)).toBe(step + 1);
  });

  it('rejects codes two steps away', () => {
    expect(verifyTotp(secret, hotp(rfcSecret, step + 2), now, null)).toBeNull();
  });

  it('rejects a replay of an already-used step', () => {
    expect(verifyTotp(secret, hotp(rfcSecret, step), now, step)).toBeNull();
  });

  it('rejects malformed codes', () => {
    expect(verifyTotp(secret, '12345', now, null)).toBeNull();
    expect(verifyTotp(secret, 'abcdef', now, null)).toBeNull();
  });
});

describe('base32 + secrets', () => {
  it('round-trips', () => {
    const bytes = Buffer.from('hello fix60 totp');
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
  });

  it('generates 160-bit secrets', () => {
    expect(base32Decode(generateTotpSecret())).toHaveLength(20);
  });

  it('builds an otpauth URI', () => {
    const uri = totpUri('ABC', 'ops@example.com', 'Fix60 Admin');
    expect(uri).toMatch(/^otpauth:\/\/totp\/Fix60%20Admin%3Aops%40example\.com\?/);
    expect(uri).toContain('secret=ABC');
  });
});
