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

// Numeric age brackets shown to the user. Ranges are inclusive and may share a
// boundary (a 1-year-old fits both "0-1" and "1-3"), but non-adjacent buckets
// never overlap (a 0-1 event is never "3-6" or "7+").
const BUCKET_RANGES: BucketRange[] = [
  { bucket: '0-1', lo: 0, hi: 1 },
  { bucket: '1-3', lo: 1, hi: 3 },
  { bucket: '3-6', lo: 3, hi: 6 },
  { bucket: '7+', lo: 7, hi: 99 },
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
