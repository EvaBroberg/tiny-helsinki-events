// Single source of truth for mapping an age range to age buckets, used by both
// tag derivation (normalizeEvent) and the age filter (relevance).
//
// A bucket applies only when the event's [min,max] age range OVERLAPS the
// bucket's range — so a 0–1 "baby" event is NOT also tagged toddler/preschool.

import type { AgeBucket } from '@shared/types';

interface BucketRange {
  bucket: AgeBucket;
  lo: number;
  hi: number;
}

// Approximate Finnish age brackets. Slight gaps (e.g. 1↔2) keep the buckets
// from over-overlapping; the goal is "preschool means ~preschool-aged".
const BUCKET_RANGES: BucketRange[] = [
  { bucket: 'baby', lo: 0, hi: 1 },
  { bucket: 'toddler', lo: 2, hi: 3 },
  { bucket: 'preschool', lo: 4, hi: 6 },
  { bucket: 'school-age', lo: 7, hi: 15 },
];

/** Parse "0–3 v", "3+ v", "–1 v", "5 v" into a numeric {min,max}. */
export function parseAgeRange(text: string | null | undefined): { min: number; max: number } | null {
  if (!text) return null;
  const nums = text.match(/\d{1,2}/g)?.map(Number) ?? [];
  if (!nums.length) return null;
  const hasPlus = /\+/.test(text);
  const startsOpen = /^\s*[–\-—]/.test(text); // "–1 v" means up to 1, i.e. from 0
  const min = startsOpen ? 0 : Math.min(...nums);
  const max = nums.length > 1 ? Math.max(...nums) : hasPlus ? 15 : Math.max(...nums);
  return { min, max };
}

/** Age buckets whose range overlaps [min,max]. */
export function bucketsForRange(min: number, max: number): AgeBucket[] {
  return BUCKET_RANGES.filter((r) => min <= r.hi && max >= r.lo).map((r) => r.bucket);
}
