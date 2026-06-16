import { describe, it, expect } from 'vitest';
import {
  parseFinnishDate,
  parseFinnishTime,
  isoToHelsinkiDate,
  isoToHelsinkiTime,
} from '../src/main/lib/dateParser.js';

describe('parseFinnishDate — numeric Finnish formats', () => {
  it('parses a full single date', () => {
    expect(parseFinnishDate('12.6.2026')).toEqual({
      startDate: '2026-06-12',
      endDate: null,
      startTime: null,
    });
  });

  it('infers the year when missing', () => {
    expect(parseFinnishDate('1.12.', 2026)).toEqual({
      startDate: '2026-12-01',
      endDate: null,
      startTime: null,
    });
  });

  it('parses a date with a time', () => {
    expect(parseFinnishDate('1.12.2026 klo 10.00')).toEqual({
      startDate: '2026-12-01',
      endDate: null,
      startTime: '10:00',
    });
  });

  it('parses a weekday prefix + time range', () => {
    expect(parseFinnishDate('ke 12.6. klo 10–12', 2026)).toEqual({
      startDate: '2026-06-12',
      endDate: null,
      startTime: '10:00',
    });
  });

  it('parses a day range within one month', () => {
    expect(parseFinnishDate('12.–14.6.2026')).toEqual({
      startDate: '2026-06-12',
      endDate: '2026-06-14',
      startTime: null,
    });
  });

  it('parses a full numeric date range', () => {
    expect(parseFinnishDate('12.6.2026 – 14.6.2026')).toEqual({
      startDate: '2026-06-12',
      endDate: '2026-06-14',
      startTime: null,
    });
  });

  it('parses a range where only the end carries the year', () => {
    expect(parseFinnishDate('12.6.–14.6.2026')).toEqual({
      startDate: '2026-06-12',
      endDate: '2026-06-14',
      startTime: null,
    });
  });

  it('parses a month-name date', () => {
    expect(parseFinnishDate('12. kesäkuuta 2026')).toEqual({
      startDate: '2026-06-12',
      endDate: null,
      startTime: null,
    });
  });

  it('rejects an invalid date', () => {
    expect(parseFinnishDate('32.13.2026')).toBeNull();
  });

  it('returns null for empty / junk input', () => {
    expect(parseFinnishDate('')).toBeNull();
    expect(parseFinnishDate(null)).toBeNull();
    expect(parseFinnishDate('ei päivämäärää')).toBeNull();
  });
});

describe('parseFinnishTime', () => {
  it('parses "klo 10.00"', () => expect(parseFinnishTime('klo 10.00')).toBe('10:00'));
  it('parses "10:30"', () => expect(parseFinnishTime('alkaa 10:30')).toBe('10:30'));
  it('parses "klo 9" without minutes', () => expect(parseFinnishTime('klo 9')).toBe('09:00'));
  it('returns null when no time', () => expect(parseFinnishTime('koko päivä')).toBeNull());
});

describe('ISO -> Helsinki conversion', () => {
  it('converts a summer (DST, +3) instant to the right local date and time', () => {
    // 2026-06-17T07:00:00Z is 10:00 in Helsinki (UTC+3 in summer).
    expect(isoToHelsinkiDate('2026-06-17T07:00:00Z')).toBe('2026-06-17');
    expect(isoToHelsinkiTime('2026-06-17T07:00:00Z')).toBe('10:00');
  });

  it('converts a winter (+2) instant correctly', () => {
    // 2026-01-15T22:00:00Z is 00:00 next day in Helsinki (UTC+2 in winter).
    expect(isoToHelsinkiDate('2026-01-15T22:00:00Z')).toBe('2026-01-16');
    expect(isoToHelsinkiTime('2026-01-15T22:00:00Z')).toBe('00:00');
  });

  it('returns null for invalid input', () => {
    expect(isoToHelsinkiDate('not-a-date')).toBeNull();
  });
});
