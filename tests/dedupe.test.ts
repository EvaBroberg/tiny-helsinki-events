import { describe, it, expect } from 'vitest';
import { dedupeEvents } from '../src/main/lib/dedupe.js';
import { normalizeEvent } from '../src/main/lib/normalizeEvent.js';
import type { NormalizeInput } from '../src/main/lib/normalizeEvent.js';

function ev(over: Partial<NormalizeInput>) {
  return normalizeEvent({
    title: 'Satutuokio',
    description: 'Lasten satuhetki',
    startDate: '2026-06-17',
    city: 'Helsinki',
    sourceName: 'A',
    sourceUrl: 'https://a',
    eventUrl: 'https://a/e',
    ...over,
  });
}

describe('dedupeEvents', () => {
  it('collapses exact-duplicate events (same hash)', () => {
    const out = dedupeEvents([ev({}), ev({ sourceName: 'B' })]);
    expect(out).toHaveLength(1);
  });

  it('keeps distinct events', () => {
    const out = dedupeEvents([ev({}), ev({ title: 'Eri tapahtuma', startDate: '2026-06-18' })]);
    expect(out).toHaveLength(2);
  });

  it('collapses fuzzy duplicates (same title+date, different location)', () => {
    const out = dedupeEvents([
      ev({ location: 'Oodi' }),
      ev({ location: 'Keskustakirjasto Oodi' }),
    ]);
    expect(out).toHaveLength(1);
  });

  it('prefers the richer / live record over a sparse mock', () => {
    const sparseMock = ev({ description: 'x', isMock: true });
    const rich = ev({ description: 'A long lovely description of the event', imageUrl: 'https://img' });
    const out = dedupeEvents([sparseMock, rich]);
    expect(out).toHaveLength(1);
    expect(out[0].isMock).toBe(false);
    expect(out[0].imageUrl).toBe('https://img');
  });

  it('returns an empty array unchanged', () => {
    expect(dedupeEvents([])).toEqual([]);
  });
});
