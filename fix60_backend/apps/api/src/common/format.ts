/** Date → ISO string, preserving null. */
export function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/** Rounds to 2 decimals for money. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Escapes `%`, `_` and backslash so user input matches literally inside LIKE/ILIKE. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}
