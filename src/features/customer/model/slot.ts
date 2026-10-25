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

/**
 * Native pickers show device-local wall time. These build a picker Date whose local
 * fields equal the IST date/time, and read the picked value back from local fields,
 * so the picker is correct on devices outside Asia/Kolkata.
 */
export function pickerDateFromIso(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 0, 0);
}

export function pickerDateFromSlot(date: IsoDate, time: ClockTime): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const [hh, mm] = time.split(':').map(Number) as [number, number];
  return new Date(y, m - 1, d, hh, mm);
}

const pad = (value: number): string => String(value).padStart(2, '0');

export function isoFromPicker(value: Date): IsoDate {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function clockFromPicker(value: Date): ClockTime {
  return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
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
