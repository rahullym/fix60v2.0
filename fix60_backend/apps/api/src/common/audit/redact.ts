const SECRET_KEY_PATTERN =
  /password|secret|token|otp|totp|storagekey|storage_key|signature|authorization|cookie/i;
const PHONE_KEY_PATTERN = /phone|whatsapp|mobile/i;
const EMAIL_KEY_PATTERN = /email/i;
const MAX_DEPTH = 6;
const MAX_STRING = 500;

/** +919876543210 → +91******3210 */
export function maskPhone(value: string): string {
  return value.length <= 6
    ? '***'
    : `${value.slice(0, 3)}${'*'.repeat(Math.max(0, value.length - 7))}${value.slice(-4)}`;
}

/** asha@example.com → a***@example.com */
export function maskEmail(value: string): string {
  const at = value.indexOf('@');
  return at <= 0 ? '***' : `${value[0]}***${value.slice(at)}`;
}

function redactValue(key: string, value: unknown, depth: number): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (SECRET_KEY_PATTERN.test(key)) {
    return '[REDACTED]';
  }
  if (typeof value === 'string') {
    if (PHONE_KEY_PATTERN.test(key)) {
      return maskPhone(value);
    }
    if (EMAIL_KEY_PATTERN.test(key)) {
      return maskEmail(value);
    }
    return value.length > MAX_STRING ? `${value.slice(0, MAX_STRING)}…` : value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return depth >= MAX_DEPTH ? '[…]' : value.map((item) => redactValue(key, item, depth + 1));
  }
  if (typeof value === 'object') {
    return depth >= MAX_DEPTH ? '[…]' : redactObject(value as Record<string, unknown>, depth + 1);
  }
  return value;
}

function redactObject(input: Record<string, unknown>, depth: number): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, redactValue(key, value, depth)]),
  );
}

/** Removes secrets and masks contact details before anything is written to the audit log. */
export function redactForAudit(input: Record<string, unknown>): Record<string, unknown> {
  return redactObject(input, 0);
}
