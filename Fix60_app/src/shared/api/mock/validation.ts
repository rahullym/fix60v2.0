import { mockError, type MockHttpError } from './router';

/** 400 VALIDATION_FAILED. */
export const invalid = (message: string): MockHttpError => mockError(400, 'VALIDATION_FAILED', message);

/** Body as a plain object, or 400. */
export function asObject(body: unknown): Record<string, unknown> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw invalid('Body must be an object');
  }
  return body as Record<string, unknown>;
}

/** Non-empty trimmed string, or 400. */
export function requireText(value: unknown, field: string, maxLength = 2000): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalid(`${field} is required`);
  }
  if (value.length > maxLength) {
    throw invalid(`${field} is too long`);
  }
  return value.trim();
}

/** Optional string; empty becomes null. */
export function optionalText(value: unknown, field: string, maxLength = 2000): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return requireText(value, field, maxLength);
}

/** Optional finite number, or 400. */
export function optionalNumber(value: unknown, field: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) {
    throw invalid(`${field} must be a number`);
  }
  return number;
}

/** 1-based page and page size from the query string. */
export function pageParams(query: Record<string, string>, defaultSize = 20): { page: number; pageSize: number } {
  const page = Math.max(1, Math.floor(optionalNumber(query.page, 'page') ?? 1));
  const pageSize = Math.min(100, Math.max(1, Math.floor(optionalNumber(query.pageSize, 'pageSize') ?? defaultSize)));
  return { page, pageSize };
}

/** Slices one page out of a list. */
export function paginate<T>(items: T[], page: number, pageSize: number): { items: T[]; page: number; pageSize: number; total: number } {
  return { items: items.slice((page - 1) * pageSize, page * pageSize), page, pageSize, total: items.length };
}
