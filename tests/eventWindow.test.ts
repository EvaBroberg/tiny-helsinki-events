import { describe, it, expect } from 'vitest';
import { isActiveWithin, isOld, tabsForEvent, upcomingWeekend } from '../src/main/lib/eventWindow.js';
import { normalizeEvent } from '../src/main/lib/normalizeEvent.js';

function ev(startDate: string, endDate?: string) {
  return normalizeEvent({
    title: 'Tapahtuma',
    description: 'lapsille',
    startDate,
    endDate: endDate ?? null,
    city: 'Helsinki',
    sourceName: 'X',
    sourceUrl: 'https://x',
    eventUrl: 'https://x/e',
  });
}

// Use a fixed Wednesday as "today" for deterministic tests.
const TODAY = '2026-06-17'; // Wednesday

describe('isActiveWithin (next 7 days window)', () => {
  it('includes an event today', () => {
    expect(isActiveWithin(ev(TODAY), TODAY, 7)).toBe(true);
  });
  it('includes an event later this week', () => {
    expect(isActiveWithin(ev('2026-06-22'), TODAY, 7)).toBe(true);
  });
  it('excludes an event beyond the window', () => {
    expect(isActiveWithin(ev('2026-07-01'), TODAY, 7)).toBe(false);
  });
  it('includes an ongoing multi-day event that started in the past', () => {
    expect(isActiveWithin(ev('2026-01-01', '2026-12-31'), TODAY, 7)).toBe(true);
  });
  it('excludes an event that already ended', () => {
    expect(isActiveWithin(ev('2026-06-10', '2026-06-15'), TODAY, 7)).toBe(false);
  });
});

describe('isOld (excluding old events)', () => {
  it('flags an event that ended yesterday', () => {
    expect(isOld(ev('2026-06-16'), TODAY)).toBe(true);
  });
  it('does not flag a current event', () => {
    expect(isOld(ev(TODAY), TODAY)).toBe(false);
  });
  it('does not flag an ongoing event ending later', () => {
    expect(isOld(ev('2026-06-01', '2026-06-30'), TODAY)).toBe(false);
  });
});

describe('tabsForEvent', () => {
  it('puts a today event in today + week', () => {
    expect(tabsForEvent(ev(TODAY), TODAY)).toEqual(expect.arrayContaining(['today', 'week']));
  });
  it('puts a tomorrow event in tomorrow + week', () => {
    const tabs = tabsForEvent(ev('2026-06-18'), TODAY);
    expect(tabs).toContain('tomorrow');
    expect(tabs).toContain('week');
    expect(tabs).not.toContain('today');
  });
  it('puts a Saturday event in the weekend tab', () => {
    // 2026-06-20 is the Saturday after Wed 2026-06-17.
    expect(tabsForEvent(ev('2026-06-20'), TODAY)).toContain('weekend');
  });
});

describe('upcomingWeekend', () => {
  it('finds the coming Sat–Sun from a midweek day', () => {
    expect(upcomingWeekend(TODAY)).toEqual({ satStart: '2026-06-20', sunEnd: '2026-06-21' });
  });
  it('treats Saturday as this weekend', () => {
    expect(upcomingWeekend('2026-06-20')).toEqual({ satStart: '2026-06-20', sunEnd: '2026-06-21' });
  });
});
