import { z } from 'zod';

/** UUID taken from a route param or query string. */
export const uuidParamSchema = z.uuid();

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Paged list response shape. */
export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Unpaged list response shape. */
export interface ItemList<T> {
  items: T[];
}

/** Indian mobile number in E.164 (+91 followed by 10 digits starting 6–9). */
export const indianMobileSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s-]/g, ''))
  .transform((value) => (/^[6-9]\d{9}$/.test(value) ? `+91${value}` : value))
  .pipe(z.string().regex(/^\+91[6-9]\d{9}$/, 'Enter a valid Indian mobile number'));

export const emailSchema = z.email().trim().toLowerCase();

export const personNameSchema = z.string().trim().min(2).max(100);

/** Text per locale; `en` is mandatory. */
export const localizedTextSchema = z
  .object({ en: z.string().trim().min(1) })
  .catchall(z.string().trim());
export type LocalizedTextValue = z.infer<typeof localizedTextSchema>;

export const latitudeSchema = z.coerce.number().min(-90).max(90);
export const longitudeSchema = z.coerce.number().min(-180).max(180);

/** ISO 8601 date-time with offset, e.g. 2026-10-23T14:30:00+05:30. */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/** Calendar date YYYY-MM-DD. */
export const isoDateSchema = z.iso.date();

/** 24h clock time HH:mm. */
export const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** Money amounts in INR with two decimals. */
export const moneySchema = z.coerce.number().min(0).max(10_000_000);
