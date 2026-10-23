import type { ClockTime, IsoDate } from '@/shared/api/types';
import { toClockTime, toIsoDate } from '@/shared/lib/format';

/** IST calendar date → Date at local midnight IST. */
export function dateFromIso(date: IsoDate): Date {
  return new Date(`${date}T00:00:00+05:30`);
}

/** IST date + HH:mm → Date. */
export function dateFromSlot(date: IsoDate, time: ClockTime): Date {
  return new Date(`${date}T${time}:00+05:30`);
}

export function todayIso(): IsoDate {
  return toIsoDate(new Date());
}

export function tomorrowIso(): IsoDate {
  return toIsoDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

/** True when the slot starts in the past (or now). */
export function isSlotInPast(date: IsoDate, time: ClockTime, now: Date = new Date()): boolean {
  return dateFromSlot(date, time).getTime() <= now.getTime();
}

export { toClockTime, toIsoDate };

/** wa.me link for an Indian number (digits only). */
export function whatsappUrl(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}
