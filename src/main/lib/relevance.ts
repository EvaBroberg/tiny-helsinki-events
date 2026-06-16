// Decide whether an event is relevant for children / families.

import type { KidEvent, AgeBucket } from '@shared/types';

/** Relevance keywords (Finnish + English) per the product spec. */
export const RELEVANCE_KEYWORDS = [
  'kids',
  'children',
  'family',
  'baby',
  'toddler',
  'preschool',
  'workshop',
  'theatre',
  'theater',
  'exhibition',
  'puppet',
  'music',
  'play',
  'storytime',
  'kirjasto',
  'lapset',
  'lapsille',
  'lasten',
  'perhe',
  'vauva',
  'taapero',
  'työpaja',
  'näyttely',
  'nukketeatteri',
  'satu',
  'musiikki',
];

const KEYWORD_REGEXPS = RELEVANCE_KEYWORDS.map(
  (k) => new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i'),
);

// Markers that signal an adult-only event -> always exclude.
const ADULT_ONLY = [
  /\bk-?18\b/i,
  /\b18\s*\+/,
  /\bvain aikuisille\b/i,
  /\baikuisten\b/i,
  /\badults? only\b/i,
  /\bover 18\b/i,
];

export interface RelevanceInput {
  text: string;
  audienceMinAge?: number | null;
  audienceMaxAge?: number | null;
  hasKidsTag?: boolean;
}

/**
 * Core relevance test. An event is relevant when it is NOT adult-only AND it
 * matches at least one kids/family signal:
 *   - a kids/family keyword in the text, OR
 *   - a structured audience age range that includes children (min age <= 15), OR
 *   - an already-derived kids/family tag.
 */
export function isRelevantForKids(input: RelevanceInput): boolean {
  const text = input.text ?? '';

  if (ADULT_ONLY.some((p) => p.test(text))) return false;

  const minAge = input.audienceMinAge ?? null;
  const maxAge = input.audienceMaxAge ?? null;
  // If there's an explicit audience and the *minimum* age is an adult, it's not for kids.
  if (minAge !== null && minAge >= 16) return false;
  // A child-inclusive max age is a strong positive signal.
  if (maxAge !== null && maxAge <= 15) return true;
  if (minAge !== null && minAge <= 15) return true;

  if (input.hasKidsTag) return true;

  return KEYWORD_REGEXPS.some((re) => re.test(text));
}

/** Convenience wrapper for a fully-built KidEvent. */
export function eventIsRelevant(event: KidEvent): boolean {
  const text = `${event.title} ${event.description} ${event.tags.join(' ')}`;
  const hasKidsTag = event.tags.some((t) =>
    ['kids', 'baby', 'toddler', 'preschool', 'school-age', 'family'].includes(t),
  );
  return isRelevantForKids({ text, hasKidsTag });
}

/** Map an event's tags + age range to coarse age buckets for filtering. */
export function ageBucketsForEvent(event: KidEvent): AgeBucket[] {
  const buckets = new Set<AgeBucket>();
  for (const t of event.tags) {
    if (t === 'baby') buckets.add('baby');
    if (t === 'toddler') buckets.add('toddler');
    if (t === 'preschool') buckets.add('preschool');
    if (t === 'school-age') buckets.add('school-age');
    if (t === 'family' || t === 'kids') buckets.add('family');
  }
  // Parse a numeric age range like "0-3", "3–6 v", "7+".
  if (event.ageRange) {
    const nums = event.ageRange.match(/\d{1,2}/g)?.map(Number) ?? [];
    const min = nums.length ? Math.min(...nums) : null;
    const max = nums.length > 1 ? Math.max(...nums) : null;
    if (min !== null) {
      if (min <= 1 || (max !== null && max <= 1)) buckets.add('baby');
      if (min <= 3) buckets.add('toddler');
      if (min <= 6) buckets.add('preschool');
      if ((max ?? min) >= 7) buckets.add('school-age');
    }
  }
  if (buckets.size === 0) buckets.add('family');
  return [...buckets];
}
