// Logic for "is this event happening in the next N days" and which UI tab
// (today / tomorrow / weekend / this week) an event belongs to.
//
// All functions take `todayISO` (YYYY-MM-DD) explicitly so they are pure and
// trivially testable. Date math is done on YYYY-MM-DD strings via UTC to avoid
// timezone drift.

import type { KidEvent, TabKey } from '@shared/types';

function toUTC(dateISO: string): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function addDays(dateISO: string, days: number): string {
  const t = toUTC(dateISO) + days * 86_400_000;
  const dt = new Date(t);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 0 = Sunday … 6 = Saturday, for a YYYY-MM-DD date. */
function dayOfWeek(dateISO: string): number {
  return new Date(toUTC(dateISO)).getUTCDay();
}

/** Today's date in Europe/Helsinki as YYYY-MM-DD. */
export function helsinkiToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Helsinki',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * An event is "active within the window" when its date span overlaps
 * [todayISO, todayISO + windowDays]. This keeps ongoing multi-day events
 * (e.g. exhibitions ending later this week) while excluding events that have
 * already finished or start beyond the window.
 */
export function isActiveWithin(event: KidEvent, todayISO: string, windowDays = 7): boolean {
  const windowStart = toUTC(todayISO);
  const windowEnd = toUTC(addDays(todayISO, windowDays));
  const evStart = toUTC(event.startDate);
  const evEnd = toUTC(event.endDate ?? event.startDate);
  // Overlap test.
  return evEnd >= windowStart && evStart <= windowEnd;
}

/** True if the event has already ended before today (an "old" event). */
export function isOld(event: KidEvent, todayISO: string): boolean {
  const evEnd = toUTC(event.endDate ?? event.startDate);
  return evEnd < toUTC(todayISO);
}

/**
 * Which tabs does this event belong to? An event can appear in several tabs
 * (e.g. a multi-day event spans today + this weekend + this week).
 */
export function tabsForEvent(event: KidEvent, todayISO: string): TabKey[] {
  const tabs: TabKey[] = [];
  const tomorrow = addDays(todayISO, 1);
  const { satStart, sunEnd } = upcomingWeekend(todayISO);
  const weekEnd = addDays(todayISO, 7);

  const evStart = toUTC(event.startDate);
  const evEnd = toUTC(event.endDate ?? event.startDate);

  const overlaps = (aStart: string, aEnd: string) =>
    evEnd >= toUTC(aStart) && evStart <= toUTC(aEnd);

  if (overlaps(todayISO, todayISO)) tabs.push('today');
  if (overlaps(tomorrow, tomorrow)) tabs.push('tomorrow');
  if (overlaps(satStart, sunEnd)) tabs.push('weekend');
  if (overlaps(todayISO, weekEnd)) tabs.push('week');

  return tabs;
}

/**
 * The upcoming (or current) weekend. If today is Sat/Sun, returns this weekend;
 * otherwise returns the coming Sat–Sun.
 */
export function upcomingWeekend(todayISO: string): { satStart: string; sunEnd: string } {
  const dow = dayOfWeek(todayISO); // 0 Sun … 6 Sat
  if (dow === 6) {
    // Saturday -> this Sat + tomorrow Sun
    return { satStart: todayISO, sunEnd: addDays(todayISO, 1) };
  }
  if (dow === 0) {
    // Sunday -> yesterday Sat + today Sun
    return { satStart: addDays(todayISO, -1), sunEnd: todayISO };
  }
  const daysUntilSat = 6 - dow;
  const sat = addDays(todayISO, daysUntilSat);
  return { satStart: sat, sunEnd: addDays(sat, 1) };
}

export { addDays };
