// Decide whether an event is relevant for children / families.

import type { KidEvent, AgeBucket } from '@shared/types';
import { parseAgeRange, bucketsForRange } from './ageBuckets.js';

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

// Strong "this is actually for children" signals (Finnish + English + Swedish),
// matched as lowercase substrings against title + description + keywords + venue.
const KID_MARKERS = [
  'lapsi',
  'lapset',
  'lapsille',
  'lasten',
  'lastenkulttuuri',
  'lastentapahtum',
  'vauv', // vauva, vauvat, vauvoille, vauvojen
  'taaper',
  'perhe', // perhe, perheen, perheet, perheille, koko perhe
  'satu', // satutunti, satutuokio
  'loru', // lorutuokio (rhyme time)
  'nukke', // nukketeatteri
  'leikki', // leikki, leikkipuisto, Museo Leikki
  'muskari',
  'eskari',
  'esikoul',
  'koululais',
  'alakoul',
  'päiväkoti',
  'varhaiskasvatus',
  'sirkuskoulu',
  'muksu',
  'nappula',
  'penska',
  'barn', // sv: children
  'famili', // sv: familj / en: family/families
  'kids',
  'children',
  'family',
  'toddler',
  'baby',
  'babies',
  'stroller',
];

// Markers of adult/senior-oriented activities that the broad "families" audience
// keyword sometimes sweeps in. Excluded unless a kid marker is also present.
const ADULT_MARKERS = [
  'seniori',
  'seniorikeskus',
  'ikääntyn',
  'ikäihmis',
  'eläkeläis',
  'eläkeikä',
  'varttuneet',
  'varttunut',
  'aikuisten',
  'aikuisille',
  'työikäis',
  'työnhaku',
  'työllisty',
  'omaishoita',
  'muistisair',
  'muistikahvila',
  'palvelukeskus',
  'kuntosali',
  'vesijumppa',
  'vesijuoksu',
  'vesivoimistelu',
  'jumppa',
  'kahvakuula',
];

/**
 * Stricter "is this actually DESIGNED for kids" test for events that arrive via
 * the broad child/family AUDIENCE filter. Age alone isn't enough — a "0–100"
 * adult activity isn't a kids event. Keep only when there is a positive kid
 * signal (specific child age range OR kid/family keywords) and no overriding
 * adult/senior signal.
 */
export function isDesignedForKids(input: {
  text: string;
  minAge?: number | null;
  maxAge?: number | null;
}): boolean {
  const t = (input.text ?? '').toLowerCase();
  const minAge = input.minAge ?? null;
  const maxAge = input.maxAge ?? null;

  // Explicitly not for children.
  if (minAge !== null && minAge >= 13) return false;

  const hasKid = KID_MARKERS.some((m) => t.includes(m));
  const hasAdult = ADULT_MARKERS.some((m) => t.includes(m));

  if (hasAdult && !hasKid) return false;
  // A specific upper age bound within childhood is a strong "for kids" signal.
  // Require maxAge >= 1: a max of 0 is a placeholder for "unset" (e.g. a "0–0"
  // adult business video), not a genuine "up to age 0" event.
  if (maxAge !== null && maxAge >= 1 && maxAge <= 12) return true;
  if (hasKid) return true;
  // Generic all-ages event with no kid signal → not designed for kids.
  return false;
}

/** Convenience wrapper for a fully-built KidEvent. */
export function eventIsRelevant(event: KidEvent): boolean {
  const text = `${event.title} ${event.description} ${event.tags.join(' ')}`;
  const hasKidsTag = event.tags.some((t) =>
    ['kids', 'baby', 'toddler', 'preschool', 'school-age', 'family'].includes(t),
  );
  return isRelevantForKids({ text, hasKidsTag });
}

/**
 * Map an event's age range to numeric age buckets for filtering. Returns [] when
 * the event has no stated age range (it then only shows when no age filter is
 * applied).
 */
export function ageBucketsForEvent(event: KidEvent): AgeBucket[] {
  const range = parseAgeRange(event.ageRange);
  return range ? bucketsForRange(range.min, range.max) : [];
}
