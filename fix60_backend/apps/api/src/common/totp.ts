import { createHmac, randomBytes } from 'node:crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;

/** RFC 4648 base32 without padding. */
export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base32 character');
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

/** 160-bit secret, base32 (what authenticator apps expect). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** RFC 4226 HOTP for a counter, SHA-1, truncated to `digits`. */
export function hotp(secret: Buffer, counter: number, digits = DIGITS): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', secret).update(message).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function totpStep(nowMs: number): number {
  return Math.floor(nowMs / 1000 / STEP_SECONDS);
}

/**
 * Checks a code against the current step ±1 (clock skew). Returns the matched step so the caller
 * can reject replays (`step <= lastUsedStep`), or null when the code is wrong.
 */
export function verifyTotp(
  base32Secret: string,
  code: string,
  nowMs: number,
  lastUsedStep: number | null,
): number | null {
  if (!/^\d{6}$/.test(code)) {
    return null;
  }
  const secret = base32Decode(base32Secret);
  const current = totpStep(nowMs);
  for (const step of [current - 1, current, current + 1]) {
    if (hotp(secret, step) === code && (lastUsedStep === null || step > lastUsedStep)) {
      return step;
    }
  }
  return null;
}

/** `otpauth://` URI for QR enrolment. */
export function totpUri(base32Secret: string, accountName: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret: base32Secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
