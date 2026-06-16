import { describe, it, expect } from 'vitest';
import { isRelevantForKids, eventIsRelevant, ageBucketsForEvent } from '../src/main/lib/relevance.js';
import { normalizeEvent } from '../src/main/lib/normalizeEvent.js';

describe('isRelevantForKids', () => {
  it('keeps events with kids/family keywords (Finnish)', () => {
    expect(isRelevantForKids({ text: 'Satutuokio lapsille kirjastossa' })).toBe(true);
    expect(isRelevantForKids({ text: 'Koko perheen työpaja' })).toBe(true);
  });

  it('keeps events with kids/family keywords (English)', () => {
    expect(isRelevantForKids({ text: 'Family puppet theatre workshop' })).toBe(true);
  });

  it('rejects unrelated adult events', () => {
    expect(isRelevantForKids({ text: 'Wine tasting and jazz evening' })).toBe(false);
  });

  it('excludes explicitly adult-only events even if they mention family', () => {
    expect(isRelevantForKids({ text: 'Perhebaari K-18, vain aikuisille' })).toBe(false);
  });

  it('uses a child-inclusive audience age as a positive signal', () => {
    expect(isRelevantForKids({ text: 'Konsertti', audienceMinAge: 3, audienceMaxAge: 9 })).toBe(true);
  });

  it('rejects an adults-only audience range', () => {
    expect(isRelevantForKids({ text: 'Konsertti', audienceMinAge: 18 })).toBe(false);
  });
});

describe('eventIsRelevant (full event)', () => {
  it('keeps a normalized kids event', () => {
    const ev = normalizeEvent({
      title: 'Lasten musiikkihetki',
      description: 'Musiikkia vauvoille ja taaperoille',
      startDate: '2026-06-17',
      city: 'Espoo',
      sourceName: 'X',
      sourceUrl: 'https://x',
      eventUrl: 'https://x/e',
    });
    expect(eventIsRelevant(ev)).toBe(true);
  });

  it('drops an unrelated event', () => {
    const ev = normalizeEvent({
      title: 'Verovinkit yrittäjille',
      description: 'Talousseminaari aikuisille',
      startDate: '2026-06-17',
      city: 'Helsinki',
      sourceName: 'X',
      sourceUrl: 'https://x',
      eventUrl: 'https://x/e',
    });
    expect(eventIsRelevant(ev)).toBe(false);
  });
});

describe('ageBucketsForEvent', () => {
  it('maps an age range to buckets', () => {
    const ev = normalizeEvent({
      title: 'Tapahtuma',
      description: 'lapsille',
      ageRange: '0–3 v',
      startDate: '2026-06-17',
      city: 'Helsinki',
      sourceName: 'X',
      sourceUrl: 'https://x',
      eventUrl: 'https://x/e',
    });
    const buckets = ageBucketsForEvent(ev);
    expect(buckets).toContain('baby');
    expect(buckets).toContain('toddler');
  });

  it('defaults to family when nothing else is known', () => {
    const ev = normalizeEvent({
      title: 'Perhetapahtuma',
      description: 'perheille',
      startDate: '2026-06-17',
      city: 'Helsinki',
      sourceName: 'X',
      sourceUrl: 'https://x',
      eventUrl: 'https://x/e',
    });
    expect(ageBucketsForEvent(ev)).toContain('family');
  });
});
