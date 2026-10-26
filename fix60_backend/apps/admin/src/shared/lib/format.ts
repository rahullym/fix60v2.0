const dateTime = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

/** 25 Oct 2026, 5:22 pm (IST). */
export function formatDateTime(value: string | null | undefined): string {
  return value ? dateTime.format(new Date(value)) : '—';
}

/** "dashboard.view" → "Dashboard · view". */
export function permissionLabel(permission: string): string {
  const [area, action] = permission.split('.');
  const title = (area ?? '').charAt(0).toUpperCase() + (area ?? '').slice(1);
  return action ? `${title} · ${action}` : title;
}

/** "pending_deletion" → "Pending deletion". */
export function humanize(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const dateOnly = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });

/** 25 Oct 2026. Accepts an ISO date-time or a YYYY-MM-DD date. */
export function formatDate(value: string | null | undefined): string {
  return value ? dateOnly.format(new Date(value)) : '—';
}

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** ₹1,200, or — when unset. */
export function formatMoney(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : rupees.format(value);
}
