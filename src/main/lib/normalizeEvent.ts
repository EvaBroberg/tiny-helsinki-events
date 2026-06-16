// Shared normalizer. Every scraper builds a loose NormalizedInput and passes it
// through normalizeEvent() so the rest of the app only ever deals with the one
// canonical KidEvent shape (computed tags, price, indoor flag, content hash).

import type { City, KidEvent, Price, Tag } from '@shared/types';
import { deriveIndoor, deriveTags } from './tags.js';

/**
 * Small, stable, dependency-free string hash (so this module runs in both Node
 * and the browser). We don't need cryptographic strength here — only a stable
 * key for deduplication — so we combine two classic 32-bit hashes (djb2 + sdbm)
 * into a 64-bit hex string.
 */
function stableHash(input: string): string {
  let h1 = 5381; // djb2
  let h2 = 0; // sdbm
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 = (h1 * 33) ^ c;
    h2 = c + (h2 << 6) + (h2 << 16) - h2;
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return hex(h1) + hex(h2);
}

export interface NormalizeInput {
  title: string;
  description?: string | null;
  startDate: string; // YYYY-MM-DD (required — events without a real date are dropped upstream)
  endDate?: string | null;
  startTime?: string | null;
  location?: string | null;
  city: City;
  sourceName: string;
  sourceUrl: string;
  eventUrl: string;
  ageRange?: string | null;
  priceText?: string | null;
  isFree?: boolean | null;
  imageUrl?: string | null;
  /** Optional extra text (keywords, categories) to feed tag derivation. */
  extraText?: string | null;
  isMock?: boolean;
  scrapedAt?: string;
  /** Language of the title/description (defaults to 'fi'). */
  lang?: 'fi' | 'en' | 'sv';
}

const FREE_PATTERNS = [/\bilmainen\b/i, /\bilmais/i, /\bmaksuton\b/i, /\bvapaa pääsy\b/i, /\bfree\b/i];
const PAID_PATTERNS = [/\d+\s*€/, /€\s*\d+/, /\d+\s*eur\b/i, /\bmaksullinen\b/i, /\bliput\b/i];

function derivePrice(priceText: string | null | undefined, isFree: boolean | null | undefined): Price {
  if (isFree === true) return 'free';
  if (isFree === false && priceText && PAID_PATTERNS.some((p) => p.test(priceText))) return 'paid';
  if (!priceText) return isFree === false ? 'paid' : 'unknown';
  if (FREE_PATTERNS.some((p) => p.test(priceText))) return 'free';
  if (PAID_PATTERNS.some((p) => p.test(priceText))) return 'paid';
  return 'unknown';
}

/** Normalize whitespace and strip HTML tags from a description blob. */
export function cleanText(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeContentHash(parts: {
  title: string;
  startDate: string;
  city: City;
  location?: string | null;
}): string {
  const normTitle = parts.title.toLowerCase().replace(/\s+/g, ' ').trim();
  const normLoc = (parts.location ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
  const key = `${normTitle}|${parts.startDate}|${parts.city}|${normLoc}`;
  return stableHash(key);
}

export function normalizeEvent(input: NormalizeInput): KidEvent {
  const title = cleanText(input.title);
  const description = cleanText(input.description);
  const haystack = `${title} ${description} ${input.extraText ?? ''}`;

  const tags = new Set<Tag>(deriveTags(haystack));
  const price = derivePrice(input.priceText, input.isFree);
  if (price === 'free') tags.add('free');

  // Indoor/outdoor is best inferred from the VENUE, so include the location.
  const settingText = `${haystack} ${input.location ?? ''}`;
  const indoor = deriveIndoor(settingText);
  if (indoor === false) tags.add('outdoor');
  else if (indoor === true) tags.add('indoor');

  const contentHash = computeContentHash({
    title,
    startDate: input.startDate,
    city: input.city,
    location: input.location,
  });

  return {
    id: contentHash,
    title,
    description,
    startDate: input.startDate,
    endDate: input.endDate ?? null,
    startTime: input.startTime ?? null,
    location: input.location ? cleanText(input.location) : null,
    city: input.city,
    sourceName: input.sourceName,
    sourceUrl: input.sourceUrl,
    eventUrl: input.eventUrl,
    ageRange: input.ageRange ?? null,
    priceText: input.priceText ?? null,
    price,
    tags: [...tags],
    indoor,
    imageUrl: input.imageUrl ?? null,
    scrapedAt: input.scrapedAt ?? new Date().toISOString(),
    contentHash,
    isMock: input.isMock ?? false,
    lang: input.lang ?? 'fi',
  };
}
