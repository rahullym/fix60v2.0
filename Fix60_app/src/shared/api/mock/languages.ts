/** Provider language codes used app-wide. */
export const LANGUAGE_CODES = ['ml', 'en', 'ta', 'hi', 'kn', 'other'] as const;
export type LanguageCode = (typeof LANGUAGE_CODES)[number];

/** Older clients sent display names; map them to codes. */
const LEGACY_NAMES: Record<string, LanguageCode> = {
  malayalam: 'ml',
  english: 'en',
  tamil: 'ta',
  hindi: 'hi',
  kannada: 'kn',
  other: 'other',
};

/** A code for a code or a legacy name (case-insensitive); null when unknown or not a string. */
export function toLanguageCode(value: unknown): LanguageCode | null {
  if (typeof value !== 'string') {
    return null;
  }
  const key = value.trim().toLowerCase();
  if ((LANGUAGE_CODES as readonly string[]).includes(key)) {
    return key as LanguageCode;
  }
  return LEGACY_NAMES[key] ?? null;
}

/** Codes for a list of codes or names, deduplicated; unknown entries become `other`. */
export function toLanguageCodes(values: unknown): LanguageCode[] {
  if (!Array.isArray(values)) {
    return [];
  }
  const codes = values.filter((value) => typeof value === 'string' && value.trim() !== '').map((value) => toLanguageCode(value) ?? 'other');
  return [...new Set(codes)];
}
