import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/** Hex sha256, used to store opaque tokens without keeping the token itself. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** URL-safe random token with `bytes` of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

const IV_BYTES = 12;

/** AES-256-GCM encrypt; output is `iv.tag.ciphertext`, each base64url. */
export function encryptSecret(plaintext: string, base64Key: string): string {
  const key = Buffer.from(base64Key, 'base64');
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

/** Reverses `encryptSecret`; throws if the payload was tampered with or the key is wrong. */
export function decryptSecret(payload: string, base64Key: string): string {
  const [iv, tag, ciphertext] = payload.split('.').map((part) => Buffer.from(part, 'base64url'));
  if (!iv || !tag || !ciphertext) {
    throw new Error('Malformed encrypted secret');
  }
  const decipher = createDecipheriv('aes-256-gcm', Buffer.from(base64Key, 'base64'), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
