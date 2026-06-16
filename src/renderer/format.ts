import type { KidEvent } from '@shared/types';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAYS[dt.getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

/**
 * "Wed 17 Jun · 10:00" for a single day, "Fri 19 Jun – Sun 21 Jun" for a short
 * range, or "Ongoing · until 31 Dec" for long-running exhibitions (so we don't
 * surface a years-old start date).
 */
export function formatWhen(event: KidEvent): string {
  if (event.endDate && event.endDate !== event.startDate) {
    const span = daysBetween(event.startDate, event.endDate);
    if (span > 14) return `Ongoing · until ${fmtDate(event.endDate)}`;
    return `${fmtDate(event.startDate)} – ${fmtDate(event.endDate)}`;
  }
  let base = fmtDate(event.startDate);
  if (event.startTime) base += ` · ${event.startTime}`;
  return base;
}

export function formatLastUpdated(iso: string): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'never';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
