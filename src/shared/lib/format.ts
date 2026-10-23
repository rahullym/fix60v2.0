import i18next from 'i18next';
import type { ClockTime, IsoDate, LocalizedText } from '../api/types';

export const APP_TIME_ZONE = 'Asia/Kolkata';

function intlLocale(locale: string): string {
  return locale === 'ml' ? 'ml-IN' : 'en-IN';
}

/** Picks the text for the active locale, falling back to English. */
export function localized(text: LocalizedText | null | undefined, locale: string): string {
  if (!text) {
    return '';
  }
  return text[locale] || text.en;
}

/** ₹1,250 (no decimals unless needed). */
export function formatMoney(amount: number | null | undefined, locale: string): string {
  if (amount === null || amount === undefined) {
    return '—';
  }
  return new Intl.NumberFormat(intlLocale(locale), {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/** Thu, 23 Oct 2026 */
export function formatDate(value: string | Date, locale: string): string {
  const date = typeof value === 'string' ? parseDateish(value) : value;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

/** 2:30 pm */
export function formatTime(value: string | Date, locale: string): string {
  const date = typeof value === 'string' ? parseDateish(value) : value;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

/** Thu, 23 Oct · 2:30 pm */
export function formatDateTime(value: string | Date, locale: string): string {
  return `${formatDate(value, locale)} · ${formatTime(value, locale)}`;
}

/** Formats a request's local date + HH:mm. */
export function formatSlot(date: IsoDate, startTime: ClockTime, locale: string): string {
  return formatDateTime(`${date}T${startTime}:00+05:30`, locale);
}

/** "5 min ago" style relative time. Hermes may lack Intl.RelativeTimeFormat, so fall back to i18n copy. */
export function formatRelative(value: string, locale: string, now: Date = new Date()): string {
  const diffSeconds = Math.round((new Date(value).getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diffSeconds);
  const [unit, amount] =
    abs < 60
      ? (['second', diffSeconds] as const)
      : abs < 3600
        ? (['minute', Math.round(diffSeconds / 60)] as const)
        : abs < 86_400
          ? (['hour', Math.round(diffSeconds / 3600)] as const)
          : (['day', Math.round(diffSeconds / 86_400)] as const);
  if (typeof Intl.RelativeTimeFormat === 'function') {
    return new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' }).format(amount, unit);
  }
  if (unit === 'second') {
    return i18next.t('common:relative.now', { lng: locale });
  }
  const direction = amount < 0 ? 'ago' : 'in';
  return i18next.t(`common:relative.${unit}s_${direction}`, { lng: locale, count: Math.abs(amount) });
}

/** Date-only strings are calendar dates in IST; full timestamps parse as-is. */
function parseDateish(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+05:30`) : new Date(value);
}

/** Local Date → YYYY-MM-DD in IST. */
export function toIsoDate(date: Date): IsoDate {
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

/** Local Date → HH:mm in IST. */
export function toClockTime(date: Date): ClockTime {
  return new Intl.DateTimeFormat('en-GB', { timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

/** Whole years between a YYYY-MM-DD birth date and today. */
export function ageFrom(dateOfBirth: IsoDate, today: Date = new Date()): number {
  const [year, month, day] = dateOfBirth.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = toIsoDate(today).split('-').map(Number) as [number, number, number];
  return ty - year - (tm < month || (tm === month && td < day) ? 1 : 0);
}

/** Masks +91XXXXXXXXXX → +91 98••• ••210 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/^\+91/, '');
  return digits.length === 10 ? `+91 ${digits.slice(0, 2)}••• ••${digits.slice(7)}` : phone;
}
