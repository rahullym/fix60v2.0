import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptSecret, encryptSecret, randomToken, safeEqual, sha256Hex } from './crypto';

const key = randomBytes(32).toString('base64');

describe('encryptSecret / decryptSecret', () => {
  it('round-trips and uses a fresh IV each time', () => {
    const first = encryptSecret('JBSWY3DPEHPK3PXP', key);
    const second = encryptSecret('JBSWY3DPEHPK3PXP', key);
    expect(first).not.toBe(second);
    expect(decryptSecret(first, key)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('rejects tampered ciphertext', () => {
    const [iv, tag, data] = encryptSecret('secret', key).split('.');
    const flipped = Buffer.from(data!, 'base64url');
    flipped[0] = flipped[0]! ^ 0xff;
    expect(() => decryptSecret([iv, tag, flipped.toString('base64url')].join('.'), key)).toThrow();
  });

  it('rejects the wrong key', () => {
    expect(() =>
      decryptSecret(encryptSecret('secret', key), randomBytes(32).toString('base64')),
    ).toThrow();
  });
});

describe('token helpers', () => {
  it('produces url-safe tokens with 256 bits of entropy', () => {
    expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashes deterministically', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('compares safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});
