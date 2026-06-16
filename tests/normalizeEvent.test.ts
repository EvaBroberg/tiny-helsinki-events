import { describe, it, expect } from 'vitest';
import { normalizeEvent, computeContentHash, cleanText } from '../src/main/lib/normalizeEvent.js';
import type { NormalizeInput } from '../src/main/lib/normalizeEvent.js';

const base: NormalizeInput = {
  title: 'Satutuokio',
  description: 'Lasten satuhetki kirjastossa',
  startDate: '2026-06-17',
  city: 'Helsinki',
  sourceName: 'Test',
  sourceUrl: 'https://example.com',
  eventUrl: 'https://example.com/e',
};

describe('normalizeEvent', () => {
  it('derives kids/storytime/library tags from text', () => {
    const ev = normalizeEvent(base);
    expect(ev.tags).toContain('storytime');
    expect(ev.tags).toContain('library');
    expect(ev.tags).toContain('kids');
  });

  it('marks free events and adds the free tag', () => {
    const ev = normalizeEvent({ ...base, priceText: 'Ilmainen' });
    expect(ev.price).toBe('free');
    expect(ev.tags).toContain('free');
  });

  it('detects paid events from a euro price', () => {
    const ev = normalizeEvent({ ...base, priceText: '8 €', isFree: false });
    expect(ev.price).toBe('paid');
  });

  it('falls back to unknown price', () => {
    const ev = normalizeEvent({ ...base, priceText: null });
    expect(ev.price).toBe('unknown');
  });

  it('derives outdoor setting and tag', () => {
    const ev = normalizeEvent({ ...base, description: 'Leikkejä puistossa ulkona' });
    expect(ev.indoor).toBe(false);
    expect(ev.tags).toContain('outdoor');
  });

  it('strips HTML from the description', () => {
    const ev = normalizeEvent({ ...base, description: '<p>Hei <b>maailma</b></p>' });
    expect(ev.description).toBe('Hei maailma');
  });

  it('produces age tags from an age range', () => {
    const ev = normalizeEvent({ ...base, ageRange: '0–3 v' });
    expect(ev.tags).toContain('baby');
    expect(ev.tags).toContain('toddler');
  });

  it('gives the same content hash for equivalent events and id === hash', () => {
    const a = normalizeEvent(base);
    const b = normalizeEvent({ ...base, sourceName: 'Other source' });
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.id).toBe(a.contentHash);
  });
});

describe('computeContentHash', () => {
  it('is stable across title whitespace/case differences', () => {
    const h1 = computeContentHash({ title: 'Satu Tuokio', startDate: '2026-06-17', city: 'Helsinki' });
    const h2 = computeContentHash({ title: '  satu   tuokio ', startDate: '2026-06-17', city: 'Helsinki' });
    expect(h1).toBe(h2);
  });
  it('differs when the date differs', () => {
    const h1 = computeContentHash({ title: 'X', startDate: '2026-06-17', city: 'Helsinki' });
    const h2 = computeContentHash({ title: 'X', startDate: '2026-06-18', city: 'Helsinki' });
    expect(h1).not.toBe(h2);
  });
});

describe('cleanText', () => {
  it('collapses whitespace and decodes a couple entities', () => {
    expect(cleanText('a&amp;b   c\n d')).toBe('a&b c d');
  });
});
