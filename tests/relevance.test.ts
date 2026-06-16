import { describe, it, expect } from 'vitest';
import {
  isRelevantForKids,
  eventIsRelevant,
  ageBucketsForEvent,
  isDesignedForKids,
} from '../src/main/lib/relevance.js';
import { normalizeEvent } from '../src/main/lib/normalizeEvent.js';

describe('isDesignedForKids', () => {
  it('keeps events with a specific child age range', () => {
    expect(isDesignedForKids({ text: 'Avoimet ovet', maxAge: 6 })).toBe(true);
  });
  it('keeps events with kid/family keywords', () => {
    expect(isDesignedForKids({ text: 'Satutuokio lapsille', maxAge: null })).toBe(true);
    expect(isDesignedForKids({ text: 'Vauvojen lorutuokio', maxAge: 100 })).toBe(true);
  });
  it('drops generic all-ages adult activities with no kid signal', () => {
    expect(isDesignedForKids({ text: 'Syvänveden jumppa maauimalassa', minAge: 0, maxAge: 100 })).toBe(false);
    expect(isDesignedForKids({ text: 'Omatoiminen ompelu, Töölön seniorikeskus', maxAge: 100 })).toBe(false);
  });
  it('drops adult-min-age events', () => {
    expect(isDesignedForKids({ text: 'Lukupiiri', minAge: 16, maxAge: 100 })).toBe(false);
  });
  it('treats a 0–0 age (placeholder) as no kid signal', () => {
    expect(
      isDesignedForKids({ text: 'Yrityksen perustaminen Suomessa - video', minAge: 0, maxAge: 0 }),
    ).toBe(false);
  });
  it('still keeps a genuine baby event with max age 1', () => {
    expect(isDesignedForKids({ text: 'Aamu', minAge: 0, maxAge: 1 })).toBe(true);
  });
  it('keeps a family event even if an adult word appears alongside a kid word', () => {
    expect(isDesignedForKids({ text: 'Perheiden vesijumppa', maxAge: null })).toBe(true);
  });
});

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
  const mk = (ageRange: string | null) =>
    normalizeEvent({
      title: 'Tapahtuma',
      description: 'lapsille',
      ageRange,
      startDate: '2026-06-17',
      city: 'Helsinki',
      sourceName: 'X',
      sourceUrl: 'https://x',
      eventUrl: 'https://x/e',
    });

  it('maps an age range to numeric buckets', () => {
    expect(ageBucketsForEvent(mk('0–3 v'))).toEqual(expect.arrayContaining(['0-1', '1-3']));
  });

  it('does not put a baby-only (0–1) event in the 3-6 or 7+ buckets', () => {
    const buckets = ageBucketsForEvent(mk('–1 v'));
    expect(buckets).toContain('0-1');
    expect(buckets).not.toContain('3-6');
    expect(buckets).not.toContain('7+');
  });

  it('spans all buckets for a wide 0–99 range', () => {
    expect(ageBucketsForEvent(mk('0–99 v'))).toEqual(
      expect.arrayContaining(['0-1', '1-3', '3-6', '7+']),
    );
  });

  it('returns no buckets when the age is unknown', () => {
    expect(ageBucketsForEvent(mk(null))).toEqual([]);
  });

  it('puts an adult/senior range (60–100) only in 7+ — never in a kid bucket', () => {
    const buckets = ageBucketsForEvent(mk('60–100 v'));
    expect(buckets).toEqual(['7+']);
    expect(buckets).not.toContain('3-6');
    expect(buckets).not.toContain('0-1');
  });

  it('handles a 16–100 adult range without collapsing to min 0', () => {
    expect(ageBucketsForEvent(mk('16–100 v'))).toEqual(['7+']);
  });
});
