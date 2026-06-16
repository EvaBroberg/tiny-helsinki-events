// Date parsing utilities. Handles both ISO 8601 (from the Linked Events API) and
// the Finnish date formats found on Finnish event/library pages.
//
// All output dates are plain calendar dates in the Europe/Helsinki timezone,
// formatted as YYYY-MM-DD. Times are HH:mm (24h) or null.

const HELSINKI_TZ = 'Europe/Helsinki';

export interface ParsedDate {
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  startTime: string | null; // HH:mm
}

const FINNISH_MONTHS: Record<string, number> = {
  tammikuu: 1,
  helmikuu: 2,
  maaliskuu: 3,
  huhtikuu: 4,
  toukokuu: 5,
  kesäkuu: 6,
  heinäkuu: 7,
  elokuu: 8,
  syyskuu: 9,
  lokakuu: 10,
  marraskuu: 11,
  joulukuu: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toISODate(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Convert an ISO 8601 instant into a Europe/Helsinki calendar date (YYYY-MM-DD). */
export function isoToHelsinkiDate(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: HELSINKI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // en-CA formats as YYYY-MM-DD.
  return fmt.format(d);
}

/** Extract a Europe/Helsinki HH:mm time from an ISO 8601 instant. */
export function isoToHelsinkiTime(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: HELSINKI_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return fmt.format(d);
}

/**
 * Parse a "klo 10.00", "klo 10–12", "10:00", "10.00" style time string.
 * Returns the START time only, as HH:mm, or null.
 */
export function parseFinnishTime(input: string | null | undefined): string | null {
  if (!input) return null;

  // Prefer a "klo ..." marker, which unambiguously introduces a time. Accepts
  // "klo 10", "klo 10.00", "klo 10:00".
  const klo = input.match(/klo\s*(\d{1,2})(?:[.:](\d{2}))?/i);
  if (klo) {
    const h = Number(klo[1]);
    const min = klo[2] ? Number(klo[2]) : 0;
    if (h >= 0 && h < 24 && min >= 0 && min < 60) return `${pad2(h)}:${pad2(min)}`;
    return null;
  }

  // A colon-separated time is also unambiguous (a dotted "10.00" is NOT used,
  // since it collides with Finnish dotted dates like "14.6.2026").
  const colon = input.match(/\b(\d{1,2}):(\d{2})\b/);
  if (colon) {
    const h = Number(colon[1]);
    const min = Number(colon[2]);
    if (h >= 0 && h < 24 && min >= 0 && min < 60) return `${pad2(h)}:${pad2(min)}`;
  }
  return null;
}

/**
 * Parse a Finnish-format date / date range string.
 *
 * Handles, among others:
 *   "12.6.2026"            single numeric date
 *   "12.6."                numeric date, year inferred
 *   "1.12.2026 klo 10.00"  date + time
 *   "ke 12.6. klo 10–12"   weekday prefix + time range
 *   "12.–14.6.2026"        day range within a month
 *   "12.6.–14.6.2026"      full date range
 *   "12. kesäkuuta 2026"   month name
 *
 * `referenceYear` is used when the year is missing (defaults to the current year).
 */
export function parseFinnishDate(
  input: string | null | undefined,
  referenceYear?: number,
): ParsedDate | null {
  if (!input) return null;
  const text = input.trim().toLowerCase().replace(/\s+/g, ' ');
  const year = referenceYear ?? new Date().getFullYear();
  const startTime = parseFinnishTime(text);

  // --- Month-name form: "12. kesäkuuta 2026" / "12 kesäkuu 2026" ---
  const monthNameMatch = text.match(/(\d{1,2})\.?\s+([a-zäö]+?)(?:ta|na)?\s+(\d{4})/);
  if (monthNameMatch) {
    const day = Number(monthNameMatch[1]);
    const monthStem = monthNameMatch[2];
    const yr = Number(monthNameMatch[3]);
    const month = matchFinnishMonth(monthStem);
    if (month && isValidDmy(day, month, yr)) {
      return { startDate: toISODate(yr, month, day), endDate: null, startTime };
    }
  }

  // --- Full numeric range: "12.6.2026 – 14.6.2026" or "12.6.–14.6.2026" ---
  const fullRange = text.match(
    /(\d{1,2})\.(\d{1,2})\.(\d{4})?\s*[–\-—]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})?/,
  );
  if (fullRange) {
    const d1 = Number(fullRange[1]);
    const m1 = Number(fullRange[2]);
    const y1 = fullRange[3] ? Number(fullRange[3]) : year;
    const d2 = Number(fullRange[4]);
    const m2 = Number(fullRange[5]);
    const y2 = fullRange[6] ? Number(fullRange[6]) : (fullRange[3] ? Number(fullRange[3]) : year);
    if (isValidDmy(d1, m1, y1) && isValidDmy(d2, m2, y2)) {
      return {
        startDate: toISODate(y1, m1, d1),
        endDate: toISODate(y2, m2, d2),
        startTime,
      };
    }
  }

  // --- Day range within one month: "12.–14.6.2026" ---
  const dayRange = text.match(/(\d{1,2})\.\s*[–\-—]\s*(\d{1,2})\.(\d{1,2})\.(\d{4})?/);
  if (dayRange) {
    const d1 = Number(dayRange[1]);
    const d2 = Number(dayRange[2]);
    const m = Number(dayRange[3]);
    const yr = dayRange[4] ? Number(dayRange[4]) : year;
    if (isValidDmy(d1, m, yr) && isValidDmy(d2, m, yr)) {
      return { startDate: toISODate(yr, m, d1), endDate: toISODate(yr, m, d2), startTime };
    }
  }

  // --- Single numeric date: "12.6.2026" or "12.6." ---
  const single = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})?/);
  if (single) {
    const d = Number(single[1]);
    const m = Number(single[2]);
    const yr = single[3] ? Number(single[3]) : year;
    if (isValidDmy(d, m, yr)) {
      return { startDate: toISODate(yr, m, d), endDate: null, startTime };
    }
  }

  // --- Already ISO? ---
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const yr = Number(iso[1]);
    const m = Number(iso[2]);
    const d = Number(iso[3]);
    if (isValidDmy(d, m, yr)) {
      return { startDate: toISODate(yr, m, d), endDate: null, startTime };
    }
  }

  return null;
}

function matchFinnishMonth(stem: string): number | null {
  // Finnish months inflect (kesäkuuta, kesäkuussa…); match by prefix on the stem.
  for (const [name, num] of Object.entries(FINNISH_MONTHS)) {
    const base = name.slice(0, 4); // e.g. "kesä"
    if (stem.startsWith(base)) return num;
  }
  return null;
}

function isValidDmy(d: number, m: number, y: number): boolean {
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 2000 || y > 2100) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= daysInMonth;
}
