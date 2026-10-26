import { randomBytes } from 'node:crypto';
import { isNull, sql, type AnyColumn, type SQL } from 'drizzle-orm';
import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';

/** RFC 9562 UUIDv7: time-ordered, so primary-key indexes stay append-friendly. */
export function uuidv7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  bytes.writeUIntBE(now, 0, 6);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** UUIDv7 primary key. The DB default covers raw-SQL inserts. */
export function uuidPk() {
  return uuid('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`)
    .$defaultFn(() => uuidv7());
}

/** Every table carries `deleted_at`; rows are retired, never removed. */
export const softDeleteColumns = {
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

export const auditColumns = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  ...softDeleteColumns,
};

/** Live-row filter for default reads. */
export function notDeleted(deletedAtColumn: AnyColumn): SQL {
  return isNull(deletedAtColumn);
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

/** PostGIS `geography(Point, 4326)`. Written as EWKT, read back as WKB hex and decoded. */
export const geographyPoint = customType<{ data: GeoPoint; driverData: string }>({
  dataType() {
    return 'geography(Point, 4326)';
  },
  toDriver(value: GeoPoint): string {
    return `SRID=4326;POINT(${value.lng} ${value.lat})`;
  },
  fromDriver(value: string): GeoPoint {
    return decodeWkbPoint(value);
  },
});

/** Decodes a little/big-endian EWKB point as returned by PostGIS. */
export function decodeWkbPoint(hex: string): GeoPoint {
  const buffer = Buffer.from(hex, 'hex');
  const isLittleEndian = buffer[0] === 1;
  const type = isLittleEndian ? buffer.readUInt32LE(1) : buffer.readUInt32BE(1);
  const hasSrid = (type & 0x20000000) !== 0;
  const offset = hasSrid ? 9 : 5;
  const read = (at: number): number =>
    isLittleEndian ? buffer.readDoubleLE(at) : buffer.readDoubleBE(at);
  return { lng: read(offset), lat: read(offset + 8) };
}

export interface TimeRange {
  start: Date;
  end: Date;
}

/** Postgres `tstzrange`, always half-open `[start, end)`. */
export const tstzRange = customType<{ data: TimeRange; driverData: string }>({
  dataType() {
    return 'tstzrange';
  },
  toDriver(value: TimeRange): string {
    return `[${value.start.toISOString()},${value.end.toISOString()})`;
  },
  fromDriver(value: string): TimeRange {
    const [start, end] = value.slice(1, -1).split(',');
    return { start: new Date(stripQuotes(start ?? '')), end: new Date(stripQuotes(end ?? '')) };
  },
});

function stripQuotes(value: string): string {
  return value.replace(/^"|"$/g, '');
}

/** Text translated per locale. `en` is mandatory; other locales fall back to it. */
export type LocalizedText = { en: string } & Partial<Record<string, string>>;
