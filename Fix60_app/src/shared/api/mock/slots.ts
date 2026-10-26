const HOUR_MS = 3_600_000;

/** Absolute start of an IST request slot (`YYYY-MM-DD` + `HH:mm`) as an ISO timestamp. */
export function slotStartIso(date: string, startTime: string): string {
  return new Date(`${date}T${startTime}:00+05:30`).toISOString();
}

/** Absolute end of an IST request slot. */
export function slotEndIso(date: string, startTime: string, durationHours: number): string {
  return new Date(new Date(`${date}T${startTime}:00+05:30`).getTime() + durationHours * HOUR_MS).toISOString();
}

/** True when the half-open ranges [aStart, aEnd) and [bStart, bEnd) intersect. */
export function slotsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return new Date(aStart).getTime() < new Date(bEnd).getTime() && new Date(bStart).getTime() < new Date(aEnd).getTime();
}

/** `YYYY-MM-DD` check (calendar-valid). */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** `HH:mm` 24h check. */
export function isClockTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Parses an ISO timestamp; null when invalid. */
export function parseTimestamp(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}
