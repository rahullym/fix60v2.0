import type { ClockTime } from '@/shared/api/types';
import { toClockTime, toIsoDate } from '@/shared/lib/format';

/** HH:mm (IST) → a Date today at that time, for pickers. */
export function clockToDate(time: ClockTime, base: Date = new Date()): Date {
  return new Date(`${toIsoDate(base)}T${time}:00+05:30`);
}

/** Picker Date → HH:mm (IST). */
export function dateToClock(date: Date): ClockTime {
  return toClockTime(date);
}

/** Picker date + picker time → ISO timestamp with the IST offset. */
export function combineDateTime(date: Date, time: Date): string {
  return `${toIsoDate(date)}T${toClockTime(time)}:00+05:30`;
}
