// Scraper test using a saved Linked Events API fixture (no network).
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { linkedEventToInput, type LeResponse } from '../../src/main/scrapers/linkedEventsBase.js';
import { normalizeEvent } from '../../src/main/lib/normalizeEvent.js';
import { eventIsRelevant } from '../../src/main/lib/relevance.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/linkedEvents.sample.json'), 'utf-8'),
) as LeResponse;

const opts = { fallbackCity: 'Helsinki' as const, sourceName: 'Helsinki (test)' };

describe('linkedEventToInput (Linked Events fixture)', () => {
  it('transforms a complete event correctly, in its original language', () => {
    const input = linkedEventToInput(fixture.data[0], opts);
    expect(input).not.toBeNull();
    const ev = normalizeEvent(input!);

    expect(ev.title).toBe('Satutuokio Oodissa'); // original Finnish kept (browser translates)
    expect(ev.lang).toBe('fi');
    expect(ev.startDate).toBe('2026-06-17');
    expect(ev.startTime).toBe('10:00'); // 07:00Z -> 10:00 Helsinki summer time
    expect(ev.city).toBe('Helsinki');
    expect(ev.location).toContain('Oodi');
    expect(ev.price).toBe('free');
    expect(ev.ageRange).toBe('2–6 v');
    expect(ev.imageUrl).toBe('https://example.com/oodi.jpg');
    expect(ev.eventUrl).toBe('https://www.helmet.fi/satutuokio');
    expect(ev.tags).toContain('storytime');
    expect(ev.description).not.toContain('<'); // HTML stripped
  });

  it('parses a paid family workshop, and marks it Finnish (no English available)', () => {
    const ev = normalizeEvent(linkedEventToInput(fixture.data[1], opts)!);
    expect(ev.title).toContain('taidetyöpaja');
    expect(ev.lang).toBe('fi'); // only Finnish text -> UI offers translation
    expect(ev.price).toBe('paid');
    expect(ev.tags).toContain('workshop');
  });

  it('drops a record with no name', () => {
    expect(linkedEventToInput(fixture.data[2], opts)).toBeNull();
  });

  it('falls back to the PUBLIC tapahtumat.hel.fi page (not the editor backend) when no info_url', () => {
    const ev = {
      id: 'helsinki:xyz789',
      name: { fi: 'Satutuokio lapsille' },
      start_time: '2026-06-17T07:00:00Z',
      audience_max_age: 6,
    };
    const input = linkedEventToInput(ev, opts);
    expect(input?.eventUrl).toBe('https://tapahtumat.hel.fi/fi/events/helsinki:xyz789');
  });

  it('drops adult/senior events (audience_min_age >= 13)', () => {
    const adult = {
      id: 'helsinki:adult',
      name: { fi: 'Ikääntyneiden vertaistukiryhmä' },
      start_time: '2026-06-17T07:00:00Z',
      audience_min_age: 60,
      audience_max_age: 100,
    };
    expect(linkedEventToInput(adult, opts)).toBeNull();
  });

  it('the fixture events pass the kids-relevance filter', () => {
    const events = fixture.data
      .map((r) => linkedEventToInput(r, opts))
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .map(normalizeEvent);
    expect(events.length).toBe(2);
    expect(events.every(eventIsRelevant)).toBe(true);
  });
});
