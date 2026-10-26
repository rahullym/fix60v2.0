import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/** Hashes a password with bcrypt (cost 12). */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Constant-time bcrypt comparison. */
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
